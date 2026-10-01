import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migration = readFileSync(fileURLToPath(new URL("../supabase/migrations/20261001000000_initial_schema.sql", import.meta.url)), "utf8");
const seed = readFileSync(fileURLToPath(new URL("../supabase/seed.sql", import.meta.url)), "utf8");
const database = new PGlite();

beforeAll(async () => {
  await database.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);
  await database.exec(migration);
  await database.exec(seed);
}, 30_000);

afterAll(async () => database.close());

describe("database migration and check-in transaction", () => {
  it("creates the complete schema and demo data", async () => {
    const tables = await database.query<{ table_name: string }>(`
      select table_name from information_schema.tables
      where table_schema = 'public'
    `);
    expect(tables.rows.map((row) => row.table_name)).toEqual(expect.arrayContaining(["businesses", "customers", "visits", "consent_records", "nfc_tags"]));
    const demo = await database.query<{ count: number }>("select count(*)::int as count from public.customers where business_id = '10000000-0000-4000-8000-000000000001'");
    expect(demo.rows[0]?.count).toBe(3);
  });

  it("records customer, consent and visit in one function call", async () => {
    const result = await database.query<{ result: { visitCount: number } }>(`
      select public.record_public_check_in(
        'cafe-luna', 'demo-cafe-luna-main-2026', 'Cliente Nuevo', '+13055550199',
        '1990-10-20', '2026-10-01', repeat('a', 64), 'integration-test'
      ) as result
    `);
    expect(Number(result.rows[0]?.result.visitCount)).toBe(1);
    const records = await database.query<{ customers: number; visits: number; consents: number }>(`
      select
        (select count(*)::int from public.customers where phone_e164 = '+13055550199') as customers,
        (select count(*)::int from public.visits v join public.customers c on c.id = v.customer_id where c.phone_e164 = '+13055550199') as visits,
        (select count(*)::int from public.consent_records r join public.customers c on c.id = r.customer_id where c.phone_e164 = '+13055550199') as consents
    `);
    expect(records.rows[0]).toEqual({ customers: 1, visits: 1, consents: 1 });
  });
});

describe("tenant isolation", () => {
  it("shows only the member's business rows through RLS", async () => {
    const userA = "40000000-0000-4000-8000-000000000001";
    const businessB = "10000000-0000-4000-8000-000000000002";
    await database.exec(`
      insert into auth.users (id, email) values ('${userA}', 'owner-a@example.test');
      insert into public.business_members (business_id, user_id, role)
      values ('10000000-0000-4000-8000-000000000001', '${userA}', 'owner');
      insert into public.businesses (id, slug, display_name) values ('${businessB}', 'other-business', 'Other Business');
      insert into public.customers (business_id, full_name, phone_e164, consent_current, consent_at)
      values ('${businessB}', 'Hidden Customer', '+13055550999', true, now());
      begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub', '${userA}', true);
    `);
    try {
      const visible = await database.query<{ business_id: string }>("select distinct business_id::text as business_id from public.customers");
      expect(visible.rows).toEqual([{ business_id: "10000000-0000-4000-8000-000000000001" }]);
      const hidden = await database.query<{ count: number }>(`select count(*)::int as count from public.customers where business_id = '${businessB}'`);
      expect(hidden.rows[0]?.count).toBe(0);
    } finally {
      await database.exec("rollback");
    }
  });
});
