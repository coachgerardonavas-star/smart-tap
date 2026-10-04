import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const advisoryUrl = "https://github.com/advisories/GHSA-ch52-4w7c-c8xp";
const allowedNames = ["@astrojs/node", "astro", "http-cache-semantics"];
const expectedVersion = "4.2.0";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npmCommand, ["audit", "--omit=dev", "--audit-level=high", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (result.error || !result.stdout) {
  console.error("Dependency audit could not run.", result.error?.message ?? result.stderr);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("Dependency audit returned invalid JSON.");
  process.exit(1);
}

const severe = Object.entries(report.vulnerabilities ?? {})
  .filter(([, finding]) => finding.severity === "high" || finding.severity === "critical")
  .sort(([left], [right]) => left.localeCompare(right));

if (severe.length === 0) {
  console.log("Production dependency audit passed with no high or critical findings.");
  process.exit(0);
}

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const installedVersion = lock.packages?.["node_modules/http-cache-semantics"]?.version;
const namesAllowed = severe.length > 0 && severe.every(([name]) => allowedNames.includes(name));
const findings = Object.fromEntries(severe);
const directVia = findings["http-cache-semantics"]?.via ?? [];
const directMatches = directVia.length > 0 && directVia.every(
  (item) => typeof item === "object" && item.url === advisoryUrl && item.severity === "high",
);
const astroVia = findings.astro?.via ?? [];
const adapterVia = findings["@astrojs/node"]?.via ?? [];
const astroMatches = !findings.astro || (astroVia.length > 0 && astroVia.every((item) => item === "http-cache-semantics"));
const adapterMatches = !findings["@astrojs/node"] || (adapterVia.length > 0 && adapterVia.every((item) => item === "astro"));

if (namesAllowed && installedVersion === expectedVersion && directMatches && astroMatches && adapterMatches) {
  console.warn(
    `Temporary audited exception: ${advisoryUrl} affects http-cache-semantics@${expectedVersion} through Astro; no patched release exists.`,
  );
  process.exit(0);
}

console.error("Production dependency audit found an unapproved high or critical vulnerability.");
for (const [name, finding] of severe) {
  console.error(`- ${name}: ${finding.severity}`);
}
process.exit(1);
