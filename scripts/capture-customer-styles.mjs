import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const baseUrl = process.env.SMART_TAP_CAPTURE_URL || "http://127.0.0.1:4321";
const outputDirectory = resolve("docs/evidence");
const chromePath = process.env.CHROME_PATH || (process.platform === "win32"
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "google-chrome");
const port = 9333;
const profile = await mkdtemp(join(tmpdir(), "smart-tap-cdp-"));
await mkdir(outputDirectory, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  // Containers run as root, where Chromium refuses to start with its sandbox.
  ...(process.getuid?.() === 0 ? ["--no-sandbox"] : []), "about:blank",
], { stdio: "ignore" });

const wait = (milliseconds) => new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));

async function connect() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
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
    if (!message.id) return;
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
    if (response.result?.value) return response.result.value;
    await wait(100);
  }
  throw new Error(`No se cumplió la condición: ${expression}`);
}

async function setViewport(client, width, height) {
  await client.call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 780 });
}

async function navigate(client, url) {
  await client.call("Page.navigate", { url });
  await waitFor(client, "document.readyState === 'complete' && Boolean(document.querySelector('.customer-screen'))");
  await wait(500);
}

async function screenshot(client, filename) {
  const response = await client.call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await writeFile(join(outputDirectory, filename), Buffer.from(response.data, "base64"));
}

const client = await connect();
const measurements = {};
try {
  await client.call("Page.enable");
  await client.call("Runtime.enable");
  // D-057: each style with the business type it was designed for.
  const pairs = [["elegante", "restaurante"], ["calido", "cafe"], ["moderno", "barberia"], ["colorido", "heladeria"]];
  for (const [theme, type] of pairs) {
    await setViewport(client, 390, 844);
    await navigate(client, `${baseUrl}/demo/capture?theme=${theme}&type=${type}&visitas=3`);
    await waitFor(client, "document.fonts.ready.then(() => true) && [...document.images].every((image) => image.complete)");
    measurements[theme] = await waitFor(client, `(() => { const input = document.querySelector('#fullName'); const hero = document.querySelector('.brand-hero'); if (!input || !hero) return null; const box = input.getBoundingClientRect(); return { inputTop: Math.round(box.top), inputBottom: Math.round(box.bottom), heroHeight: Math.round(hero.getBoundingClientRect().height), scrollWidth: document.documentElement.scrollWidth }; })()`);
    await screenshot(client, `customer-v2-${theme}-form-390x844.png`);
    await client.call("Runtime.evaluate", { expression: `(() => { const form = document.querySelector('form.checkin-form'); form.querySelector('#fullName').value = 'Cliente Demo'; form.querySelector('#phone').value = '3055550101'; form.querySelector('input[name=consent]').checked = true; form.requestSubmit(); })()` });
    await waitFor(client, "document.querySelector('.customer-screen')?.dataset.state === 'confirmation'");
    await client.call("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
    await wait(500);
    await screenshot(client, `customer-v2-${theme}-confirmation-390x844.png`);
  }
  await setViewport(client, 1440, 900);
  await navigate(client, `${baseUrl}/demo/capture?theme=elegante&type=restaurante`);
  await wait(500);
  await screenshot(client, "customer-v2-elegante-form-1440x900.png");
  process.stdout.write(`${JSON.stringify(measurements, null, 2)}\n`);
} finally {
  client.close();
  chrome.kill();
  await wait(500);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
