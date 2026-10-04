import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationsDir = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));
const migrations = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql")).sort()
  .map((file) => readFileSync(`${migrationsDir}${file}`, "utf8"));
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
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
    $$;
  `);
  for (const migration of migrations) await database.exec(migration);
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
        '1990-10-20', '2026-10-01', repeat('a', 64), repeat('b', 64), 'integration-test'
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

describe("one counted visit per day", () => {
  it("does not add a second visit for the same customer on the same business day", async () => {
    const run = (ipHash: string) => database.query<{ result: { visitCount: number; alreadyCounted: boolean } }>(`
      select public.record_public_check_in(
        'cafe-luna', 'demo-cafe-luna-main-2026', 'Cliente Diario', '+13055553000',
        null, '2026-10-01', '${ipHash}', '${"f".repeat(64)}', 'daily-test'
      ) as result
    `);
    const first = (await run("1".repeat(64))).rows[0]?.result;
    const second = (await run("2".repeat(64))).rows[0]?.result;
    expect(first).toMatchObject({ visitCount: 1, alreadyCounted: false });
    expect(second).toMatchObject({ visitCount: 1, alreadyCounted: true });
    const consents = await database.query<{ count: number }>(`
      select count(*)::int as count from public.consent_records r
      join public.customers c on c.id = r.customer_id where c.phone_e164 = '+13055553000'
    `);
    expect(consents.rows[0]?.count).toBe(2);
  });

  it("counts a visit again on the next business day", async () => {
    await database.exec(`
      update public.visits set visited_at = now() - interval '1 day'
      where customer_id = (select id from public.customers where phone_e164 = '+13055553000')
    `);
    const next = await database.query<{ result: { visitCount: number; alreadyCounted: boolean } }>(`
      select public.record_public_check_in(
        'cafe-luna', 'demo-cafe-luna-main-2026', 'Cliente Diario', '+13055553000',
        null, '2026-10-01', '${"3".repeat(64)}', '${"e".repeat(64)}', 'daily-test'
      ) as result
    `);
    expect(next.rows[0]?.result).toMatchObject({ visitCount: 2, alreadyCounted: false });
  });
});

describe("check-in rate limits", () => {
  const checkIn = (phone: string, ipHash: string, phoneHash: string) => database.query(`
    select public.record_public_check_in(
      'cafe-luna', 'demo-cafe-luna-main-2026', 'Cliente Limite', '${phone}',
      null, '2026-10-01', '${ipHash}', '${phoneHash}', 'rate-test'
    )
  `);

  it("lets many customers share one venue IP", async () => {
    const sharedIp = "c".repeat(64);
    for (let index = 0; index < 20; index += 1) {
      const suffix = String(index).padStart(2, "0");
      await checkIn(`+130555511${suffix}`, sharedIp, suffix.repeat(32));
    }
  });

  it("blocks a fourth submission for one phone inside the window", async () => {
    const phoneHash = "d".repeat(64);
    for (let index = 0; index < 3; index += 1) await checkIn("+13055552000", `${index}`.repeat(64), phoneHash);
    await expect(checkIn("+13055552000", "9".repeat(64), phoneHash)).rejects.toThrow(/rate_limit_exceeded/);
  });

  it("rejects calls without keyed identifiers", async () => {
    await expect(checkIn("+13055552001", "", "e".repeat(64))).rejects.toThrow(/invalid_identifier/);
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

  it("grants the platform-admin bypass only with a second factor", async () => {
    const admin = "40000000-0000-4000-8000-0000000000c1";
    await database.exec(`
      insert into auth.users (id, email) values ('${admin}', 'admin@example.test');
      update public.profiles set platform_role = 'platform_admin' where id = '${admin}';
    `);
    const countAs = async (aal: string) => {
      await database.exec(`
        begin;
        set local role authenticated;
        select set_config('request.jwt.claim.sub', '${admin}', true);
        select set_config('request.jwt.claims', '{"sub":"${admin}","aal":"${aal}"}', true);
      `);
      try {
        const result = await database.query<{ count: number }>("select count(*)::int as count from public.customers");
        return result.rows[0]?.count;
      } finally {
        await database.exec("rollback");
      }
    };
    expect(await countAs("aal1")).toBe(0);
    expect(await countAs("aal2")).toBeGreaterThan(0);
  });

  it("denies the aggregate view and check-in function to anon", async () => {
    const privileges = await database.query<{ view_select: boolean; check_in: boolean }>(`
      select
        has_table_privilege('anon', 'public.customer_visit_counts', 'select') as view_select,
        has_function_privilege('anon', 'public.record_public_check_in(text,text,text,text,date,text,text,text,text)', 'execute') as check_in
    `);
    expect(privileges.rows[0]).toEqual({ view_select: false, check_in: false });
  });
});
