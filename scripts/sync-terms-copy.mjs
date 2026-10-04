import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../docs/TERMS_OF_SERVICE.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const version = "2026-10-04-v2";

function parseLanguage(start, end, versionTemplate) {
  const afterStart = source.split(start)[1];
  if (!afterStart) throw new Error(`Missing ${start}`);
  const block = (end ? afterStart.split(end)[0] : afterStart.split("## Implementation spec")[0]).trim();
  const lines = block.split("\n").filter(Boolean);
  const matches = lines.map((line) => /^\*\*(.+?)\*\*(?:\s+(.*))?$/.exec(line)).filter(Boolean);
  if (matches.length < 2) throw new Error(`No approved sections found after ${start}`);
  const title = matches[0][1];
  const sections = matches.slice(1).map((match) => ({ heading: match[1], text: match[2] ?? "" }));
  return { title, sections, version: versionTemplate.replace("{version}", version) };
}

const copy = {
  es: parseLanguage("## Español", "## English", "Versión {version}"),
  en: parseLanguage("## English", null, "Version {version}"),
};

const output = `export const TERMS_VERSION = ${JSON.stringify(version)};\n\nexport type TermsSection = {\n  heading: string;\n  text: string;\n};\n\nexport const TERMS_COPY = ${JSON.stringify(copy, null, 2)} as const satisfies Record<\"es\" | \"en\", {\n  title: string;\n  sections: readonly TermsSection[];\n  version: string;\n}>;\n`;

writeFileSync(new URL("../src/lib/terms.ts", import.meta.url), output);
