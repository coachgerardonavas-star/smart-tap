import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationsDir = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));
const sql = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort()
  .map((file) => readFileSync(`${migrationsDir}${file}`, "utf8").replace(/\r\n/g, "\n")).join("\n").toLowerCase();
const exposedTables = ["profiles", "businesses", "business_members", "nfc_tags", "customers", "consent_records", "visits", "audit_log", "follow_ups", "terms_acceptances"];
const privacyMigration = readFileSync(fileURLToPath(new URL("../supabase/migrations/20261004190428_privacy_notice.sql", import.meta.url)), "utf8").replace(/\r\n/g, "\n").toLowerCase();

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
    for (const table of ["customers", "consent_records", "visits", "nfc_tags", "follow_ups"]) {
      expect(sql).toMatch(new RegExp(`create policy [^\\n]+ on public\\.${table}[\\s\\S]+?private\\.is_business_member\\(business_id\\)`));
    }
  });

  it("revokes the 9-argument check-in and grants only the 10-argument version to service_role", () => {
    expect(sql).toMatch(/revoke all on function public\.record_public_check_in\(text, text, text, text, date, text, text, text, text\)[\s\S]+service_role/);
    expect(sql).toMatch(/grant execute on function public\.record_public_check_in\(text, text, text, text, date, text, boolean, text, text, text\)[\s\S]+to service_role/);
  });

  it("keeps follow-up writes and WhatsApp opt-out service-only", () => {
    expect(sql).toMatch(/revoke all on table public\.follow_ups from anon, authenticated/);
    expect(sql).toMatch(/revoke all on function public\.record_whatsapp_opt_out\(uuid, uuid, uuid, text\)[\s\S]+from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.record_whatsapp_opt_out\(uuid, uuid, uuid, text\)[\s\S]+to service_role/);
  });
  it("keeps onboarding mutations service-only", () => {
    for (const signature of [
      "upsert_business_member_with_limit\\(uuid, uuid, public\\.business_role\\)",
      "set_business_member_active_with_limit\\(uuid, uuid, boolean\\)",
      "record_business_owner_approval\\(uuid, text, uuid\\)",
    ]) {
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${signature}[\\s\\S]+?from public, anon, authenticated`));
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${signature}[\\s\\S]+?to service_role`));
    }
  });
  it("requires approval for activation and defaults new businesses to inactive", () => {
    expect(sql).toContain("alter table public.businesses alter column is_active set default false");
    expect(sql).toContain("check (not is_active or owner_approved_at is not null)");
  });
  it("changes the new-business inactivity default to 30 days", () => {
    expect(sql).toContain("alter table public.businesses alter column inactivity_days set default 30");
  });
  it("uses an invoker-security aggregate view", () => {
    expect(sql).toContain("create view public.customer_visit_counts\nwith (security_invoker = true)");
  });

  it("keeps the daily purge private and schedules it through pg_cron", () => {
    expect(privacyMigration).toContain("create or replace function private.purge_inactive_customers()\nreturns");
    expect(privacyMigration).toMatch(/security definer\nset search_path = ''/);
    expect(privacyMigration).toMatch(/revoke all on function private\.purge_inactive_customers\(\)[\s\S]+from public, anon, authenticated, service_role/);
    expect(privacyMigration).toContain("create extension if not exists pg_cron");
    expect(privacyMigration).toContain("smart-tap-daily-privacy-purge");
    expect(privacyMigration).toContain("17 3 * * *");
  });

  it("uses count-only purge audits and the two approved retention windows", () => {
    expect(privacyMigration).toContain("interval '24 months'");
    expect(privacyMigration).toContain("interval '90 days'");
    expect(privacyMigration).toContain("jsonb_build_object('deletedcount', v_row.deleted_count)");
    expect(privacyMigration).not.toMatch(/customers\.(retention|cancellation)_purged[\s\S]{0,300}(full_name|phone_e164)/);
  });

  it("keeps terms acceptance tenant-scoped and service-route only", () => {
    expect(privacyMigration).toContain("create table public.terms_acceptances");
    expect(privacyMigration).toContain("alter table public.terms_acceptances enable row level security");
    expect(privacyMigration).toMatch(/create policy terms_acceptances_select_own[\s\S]+user_id = \(select auth\.uid\(\)\)[\s\S]+private\.is_business_member\(business_id\)/);
    expect(privacyMigration).toMatch(/revoke all on table public\.terms_acceptances from public, anon, authenticated/);
    expect(privacyMigration).toMatch(/revoke all on function public\.record_terms_acceptance\(uuid, uuid, text\)[\s\S]+from public, anon, authenticated/);
    expect(privacyMigration).toMatch(/grant execute on function public\.record_terms_acceptance\(uuid, uuid, text\)[\s\S]+to service_role/);
    expect(privacyMigration).toContain("'terms.accepted'");
    expect(privacyMigration).toContain("jsonb_build_object('version', p_terms_version)");
  });

  it("requires a contact and prevents activation after cancellation", () => {
    expect(privacyMigration).toContain("and cancelled_at is null");
    expect(privacyMigration).toContain("contact_phone is not null or contact_email is not null");
    expect(privacyMigration).toContain("or (v_business.contact_phone is null and v_business.contact_email is null)");
  });
});
