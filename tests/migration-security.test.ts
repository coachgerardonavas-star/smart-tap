import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationsDir = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));
const sql = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort()
  .map((file) => readFileSync(`${migrationsDir}${file}`, "utf8").replace(/\r\n/g, "\n")).join("\n").toLowerCase();
const exposedTables = ["profiles", "businesses", "business_members", "nfc_tags", "customers", "consent_records", "visits", "audit_log"];

describe("database security migration", () => {
  it.each(exposedTables)("enables RLS on %s", (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
  });

  it("removes default anonymous and authenticated table privileges", () => {
    expect(sql).toMatch(/revoke all on table[\s\S]+from anon, authenticated/);
  });

  it("keeps the public check-in function callable only by the server role", () => {
    expect(sql).toMatch(/revoke all on function public\.record_public_check_in[\s\S]+from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.record_public_check_in[\s\S]+to service_role/);
  });

  it("uses tenant membership in every customer-data read policy", () => {
    for (const table of ["customers", "consent_records", "visits", "nfc_tags"]) {
      expect(sql).toMatch(new RegExp(`create policy [^\\n]+ on public\\.${table}[\\s\\S]+?private\\.is_business_member\\(business_id\\)`));
    }
  });

  it("uses an invoker-security aggregate view", () => {
    expect(sql).toContain("create view public.customer_visit_counts\nwith (security_invoker = true)");
  });
});
