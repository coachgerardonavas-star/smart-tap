import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { changedFieldNames } from "../src/lib/audit";

describe("business update audit details", () => {
  it("returns only names of fields whose values changed", () => {
    const current = { display_name: "Café Luna", inactivity_days: 30, offer_new: null };
    const next = { display_name: "Café Luna", inactivity_days: 45, offer_new: "Café gratis" };
    const changedFields = changedFieldNames(current, next);
    expect(changedFields).toEqual(["inactivity_days", "offer_new"]);
    expect(changedFields).not.toContain(45);
    expect(changedFields).not.toContain("Café gratis");
  });

  it("writes changedFields under details without field values", () => {
    const route = readFileSync(join(process.cwd(), "src/pages/api/admin/business/[id]/update.ts"), "utf8");
    expect(route).toContain("details: { changedFields }");
    expect(route).not.toMatch(/details:\s*\{[^}]*updates/);
  });
});
