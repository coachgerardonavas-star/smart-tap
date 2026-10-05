import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const port = 4392;
const debugPort = 9334;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDirectory = resolve("docs/evidence");
const signPage = resolve("src/pages/terms/sign.astro");
const originalSignPage = await readFile(signPage, "utf8");
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "smart-tap-terms-cdp-"));
const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

const fixture = `---
import Base from "../../layouts/Base.astro";
import TermsNotice from "../../components/TermsNotice.astro";
import TermsSignatureCard from "../../components/TermsSignatureCard.astro";
import { TERMS_VERSION } from "../../lib/terms";
---
<Base title="Firmar Términos | Smart Tap" privateArea>
  <TermsSignatureCard businessName="Café Luna" businessId="10000000-0000-4000-8000-000000000001" next="/dashboard" termsVersion={TERMS_VERSION} />
  <section class="legal card" aria-label="Términos de servicio completos"><TermsNotice /></section>
</Base>
<style>.legal { width: min(820px, 100%); margin: 0 auto; padding: clamp(22px, 6vw, 54px); }</style>
`;

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(`${baseUrl}/terms`)).ok) return; } catch {}
    await wait(100);
  }
  throw new Error("Astro no inició para la captura.");
}

async function connect() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" });
      if (response.ok) return createClient((await response.json()).webSocketDebuggerUrl);
    } catch {}
    await wait(100);
  }
  throw new Error("Chrome DevTools no estuvo disponible.");
}

async function createClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once: true });
    socket.addEventListener("error", rejectOpen, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
  });
  return {
    call(method, params = {}) {
      const id = ++nextId;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolveCall, rejectCall) => pending.set(id, { resolve: resolveCall, reject: rejectCall }));
    },
    close() { socket.close(); },
  };
}

async function waitFor(client, expression) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await client.call("Runtime.evaluate", { expression, returnByValue: true });
    if (response.result?.value) return;
    await wait(100);
  }
  throw new Error(`No se cumplió la condición: ${expression}`);
}

async function capture(client, path, selector, filename) {
  await client.call("Page.navigate", { url: `${baseUrl}${path}` });
  await waitFor(client, `document.readyState === 'complete' && Boolean(document.querySelector(${JSON.stringify(selector)}))`);
  await wait(400);
  const response = await client.call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await writeFile(join(outputDirectory, filename), Buffer.from(response.data, "base64"));
}

let server;
let chrome;
let client;
try {
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(signPage, fixture);
  server = spawn(process.execPath, ["node_modules/astro/bin/astro.mjs", "dev", "--host", "127.0.0.1", "--port", String(port)], { stdio: "ignore" });
  await waitForServer();
  chrome = spawn(chromePath, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });
  client = await connect();
  await client.call("Page.enable");
  await client.call("Runtime.enable");
  await client.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await capture(client, "/terms/sign", ".signature-card", "terms-sign-v2-390x844.png");
  await capture(client, "/terms", ".terms-notice", "terms-v2-390x844.png");
  process.stdout.write("Capturas v2 creadas en docs/evidence.\n");
} finally {
  client?.close();
  chrome?.kill();
  server?.kill();
  await writeFile(signPage, originalSignPage);
  await wait(300);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
