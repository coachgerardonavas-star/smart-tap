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
    expect(tables.rows.map((row) => row.table_name)).toEqual(expect.arrayContaining(["businesses", "customers", "visits", "consent_records", "nfc_tags", "follow_ups"]));
    const demo = await database.query<{ count: number }>("select count(*)::int as count from public.customers where business_id = '10000000-0000-4000-8000-000000000001'");
    expect(demo.rows[0]?.count).toBe(3);
  });

  it("records customer, consent and visit in one function call", async () => {
    const result = await database.query<{ result: { visitCount: number } }>(`
      select public.record_public_check_in(
        'cafe-luna', 'demo-cafe-luna-main-2026', 'Cliente Nuevo', '+13055550199',
        '1990-10-20', '2026-10-01', false, repeat('a', 64), repeat('b', 64), 'integration-test'
      ) as result
    `);
    expect(Number(result.rows[0]?.result.visitCount)).toBe(1);
    const records = await database.query<{ customers: number; visits: number; consents: number; whatsapp_opt_in: boolean; whatsapp_consents: number }>(`
      select
        (select count(*)::int from public.customers where phone_e164 = '+13055550199') as customers,
        (select count(*)::int from public.visits v join public.customers c on c.id = v.customer_id where c.phone_e164 = '+13055550199') as visits,
        (select count(*)::int from public.consent_records r join public.customers c on c.id = r.customer_id where c.phone_e164 = '+13055550199') as consents,
        (select whatsapp_opt_in from public.customers where phone_e164 = '+13055550199') as whatsapp_opt_in,
        (select count(*)::int from public.consent_records r join public.customers c on c.id = r.customer_id where c.phone_e164 = '+13055550199' and r.purpose = 'whatsapp') as whatsapp_consents
    `);
    expect(records.rows[0]).toEqual({ customers: 1, visits: 1, consents: 1, whatsapp_opt_in: false, whatsapp_consents: 0 });
  });
});

describe("one counted visit per day", () => {
  it("does not add a second visit for the same customer on the same business day", async () => {
    const run = (ipHash: string) => database.query<{ result: { visitCount: number; alreadyCounted: boolean } }>(`
      select public.record_public_check_in(
        'cafe-luna', 'demo-cafe-luna-main-2026', 'Cliente Diario', '+13055553000',
        null, '2026-10-01', false, '${ipHash}', '${"f".repeat(64)}', 'daily-test'
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
        null, '2026-10-01', false, '${"3".repeat(64)}', '${"e".repeat(64)}', 'daily-test'
      ) as result
    `);
    expect(next.rows[0]?.result).toMatchObject({ visitCount: 2, alreadyCounted: false });
  });
});

describe("check-in rate limits", () => {
  const checkIn = (phone: string, ipHash: string, phoneHash: string) => database.query(`
    select public.record_public_check_in(
      'cafe-luna', 'demo-cafe-luna-main-2026', 'Cliente Limite', '${phone}',
      null, '2026-10-01', false, '${ipHash}', '${phoneHash}', 'rate-test'
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

  it("revokes the 9-argument check-in from service_role and grants the 10-argument version", async () => {
    const privileges = await database.query<{ legacy: boolean; current: boolean }>(`
      select
        has_function_privilege('service_role', 'public.record_public_check_in(text,text,text,text,date,text,text,text,text)', 'execute') as legacy,
        has_function_privilege('service_role', 'public.record_public_check_in(text,text,text,text,date,text,boolean,text,text,text)', 'execute') as current
    `);
    expect(privileges.rows[0]).toEqual({ legacy: false, current: true });
  });
  it("denies the aggregate view and check-in function to anon", async () => {
    const privileges = await database.query<{ view_select: boolean; check_in: boolean }>(`
      select
        has_table_privilege('anon', 'public.customer_visit_counts', 'select') as view_select,
        has_function_privilege('anon', 'public.record_public_check_in(text,text,text,text,date,text,boolean,text,text,text)', 'execute') as check_in
    `);
    expect(privileges.rows[0]).toEqual({ view_select: false, check_in: false });
  });
});
describe("WhatsApp consent and opt-out", () => {
  it("keeps WhatsApp optional and preserves a prior opt-in", async () => {
    const call = (optIn: boolean, ip: string) => database.query(`
      select public.record_public_check_in(
        'cafe-luna', 'demo-cafe-luna-main-2026', 'Cliente WhatsApp', '+13055554000',
        null, '2026-10-01', ${optIn}, '${ip}', '${"4".repeat(64)}', 'whatsapp-test'
      )
    `);
    await call(true, "5".repeat(64));
    await call(false, "6".repeat(64));
    const result = await database.query<{ whatsapp_opt_in: boolean; whatsapp_consents: number; whatsapp_version: string; visit_consents: number; visits: number }>(`
      select c.whatsapp_opt_in,
        (select count(*)::int from public.consent_records where customer_id = c.id and purpose = 'whatsapp') as whatsapp_consents,
        (select max(text_version) from public.consent_records where customer_id = c.id and purpose = 'whatsapp') as whatsapp_version,
        (select count(*)::int from public.consent_records where customer_id = c.id and purpose = 'visits') as visit_consents,
        (select count(*)::int from public.visits where customer_id = c.id) as visits
      from public.customers c where c.phone_e164 = '+13055554000'
    `);
    expect(result.rows[0]).toEqual({ whatsapp_opt_in: true, whatsapp_consents: 1, whatsapp_version: "whatsapp-2026-10-04", visit_consents: 2, visits: 1 });
  });

  it("stores one action for repeated clicks in the same opportunity cycle", async () => {
    const customerId = (await database.query<{ id: string }>("select id::text as id from public.customers where phone_e164 = '+13055554000'")).rows[0]!.id;
    await database.exec(`
      insert into public.follow_ups (business_id, customer_id, kind, period_key, status)
      values ('10000000-0000-4000-8000-000000000001', '${customerId}', 'new', 'first', 'contacted')
      on conflict (business_id, customer_id, kind, period_key) do nothing;
      insert into public.follow_ups (business_id, customer_id, kind, period_key, status)
      values ('10000000-0000-4000-8000-000000000001', '${customerId}', 'new', 'first', 'contacted')
      on conflict (business_id, customer_id, kind, period_key) do nothing;
    `);
    const count = await database.query<{ count: number }>(`select count(*)::int as count from public.follow_ups where customer_id = '${customerId}' and kind = 'new' and period_key = 'first'`);
    expect(count.rows[0]?.count).toBe(1);
  });
  it("records an explicit opt-out in customer, consent and audit data", async () => {
    const actor = "40000000-0000-4000-8000-000000000044";
    await database.exec(`insert into auth.users (id, email) values ('${actor}', 'manager@example.test') on conflict (id) do nothing;`);
    await database.query(`
      select public.record_whatsapp_opt_out(
        '10000000-0000-4000-8000-000000000001',
        (select id from public.customers where phone_e164 = '+13055554000'),
        '${actor}', 'opt-out-test'
      )
    `);
    const result = await database.query<{ whatsapp_opt_in: boolean; revocations: number; audits: number }>(`
      select c.whatsapp_opt_in,
        (select count(*)::int from public.consent_records where customer_id = c.id and purpose = 'whatsapp' and not consented and source = 'admin') as revocations,
        (select count(*)::int from public.audit_log where entity_id = c.id::text and action = 'customer.whatsapp_opt_out') as audits
      from public.customers c where c.phone_e164 = '+13055554000'
    `);
    expect(result.rows[0]).toEqual({ whatsapp_opt_in: false, revocations: 1, audits: 1 });
  });
});

describe("onboarding configuration", () => {
  it("keeps at most two active members, including parallel invitations, and frees paused slots", async () => {
    const businessA = "10000000-0000-4000-8000-0000000000a1";
    const businessB = "10000000-0000-4000-8000-0000000000a2";
    const users = [
      "40000000-0000-4000-8000-0000000000a1",
      "40000000-0000-4000-8000-0000000000a2",
      "40000000-0000-4000-8000-0000000000a3",
    ];
    await database.exec(`
      insert into auth.users (id, email) values
        ('${users[0]}', 'limit-1@example.test'),
        ('${users[1]}', 'limit-2@example.test'),
        ('${users[2]}', 'limit-3@example.test')
      on conflict (id) do nothing;
      insert into public.businesses (id, slug, display_name) values
        ('${businessA}', 'member-limit-a', 'Member Limit A'),
        ('${businessB}', 'member-limit-b', 'Member Limit B');
    `);

    await database.query(`select public.upsert_business_member_with_limit('${businessA}', '${users[0]}', 'owner')`);
    await database.query(`select public.upsert_business_member_with_limit('${businessA}', '${users[1]}', 'manager')`);
    await expect(database.query(`select public.upsert_business_member_with_limit('${businessA}', '${users[2]}', 'viewer')`))
      .rejects.toThrow(/active_member_limit/);

    await database.query(`select public.set_business_member_active_with_limit('${businessA}', '${users[0]}', false)`);
    await database.query(`select public.upsert_business_member_with_limit('${businessA}', '${users[2]}', 'viewer')`);
    await expect(database.query(`select public.set_business_member_active_with_limit('${businessA}', '${users[0]}', true)`))
      .rejects.toThrow(/active_member_limit/);
    await database.query(`select public.set_business_member_active_with_limit('${businessA}', '${users[1]}', false)`);
    await database.query(`select public.set_business_member_active_with_limit('${businessA}', '${users[0]}', true)`);
    const afterPause = await database.query<{ count: number }>(`select count(*)::int as count from public.business_members where business_id = '${businessA}' and is_active`);
    expect(afterPause.rows[0]?.count).toBe(2);

    await database.query(`select public.upsert_business_member_with_limit('${businessB}', '${users[0]}', 'owner')`);
    const parallel = await Promise.allSettled([
      database.query(`select public.upsert_business_member_with_limit('${businessB}', '${users[1]}', 'manager')`),
      database.query(`select public.upsert_business_member_with_limit('${businessB}', '${users[2]}', 'viewer')`),
    ]);
    expect(parallel.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(parallel.filter((result) => result.status === "rejected")).toHaveLength(1);
    const afterParallel = await database.query<{ count: number }>(`select count(*)::int as count from public.business_members where business_id = '${businessB}' and is_active`);
    expect(afterParallel.rows[0]?.count).toBe(2);
  });

  it("blocks activation and approval until the final config is complete, then audits approval", async () => {
    const businessId = "10000000-0000-4000-8000-0000000000b1";
    const actorId = "40000000-0000-4000-8000-0000000000b1";
    await database.exec(`
      insert into auth.users (id, email) values ('${actorId}', 'approval-owner@example.test') on conflict (id) do nothing;
      insert into public.businesses (id, slug, display_name) values ('${businessId}', 'approval-test', 'Approval Test');
    `);
    await expect(database.exec(`update public.businesses set is_active = true where id = '${businessId}'`))
      .rejects.toThrow(/businesses_activation_requires_approval_check/);
    await expect(database.query(`select public.record_business_owner_approval('${businessId}', 'Dueña Prueba', '${actorId}')`))
      .rejects.toThrow(/approval_configuration_incomplete/);

    await database.exec(`
      update public.businesses set
        logo_url = 'https://example.test/logo.png',
        offer_inactive = 'Regresa por un café.',
        offer_birthday = 'Celebra con un postre.',
        offer_frequent = 'Disfruta un extra.',
        offer_new = 'Recibe una bienvenida.',
        google_review_url = 'https://g.page/r/example/review'
      where id = '${businessId}';
    `);
    await database.query(`select public.upsert_business_member_with_limit('${businessId}', '${actorId}', 'owner')`);
    await expect(database.query(`select public.record_business_owner_approval('${businessId}', 'Dueña Prueba', '${actorId}')`))
      .rejects.toThrow(/approval_configuration_incomplete/);
    await database.exec(`update public.businesses set contact_email = 'owner@example.test' where id = '${businessId}'`);
    await database.query(`select public.set_business_member_active_with_limit('${businessId}', '${actorId}', false)`);
    await expect(database.query(`select public.record_business_owner_approval('${businessId}', 'Dueña Prueba', '${actorId}')`))
      .rejects.toThrow(/approval_active_member_required/);
    await database.query(`select public.set_business_member_active_with_limit('${businessId}', '${actorId}', true)`);
    await database.query(`select public.record_business_owner_approval('${businessId}', 'Dueña Prueba', '${actorId}')`);
    await database.exec(`update public.businesses set is_active = true where id = '${businessId}'`);

    const result = await database.query<{ is_active: boolean; owner_approved_name: string; audits: number }>(`
      select b.is_active, b.owner_approved_name,
        (select count(*)::int from public.audit_log where business_id = b.id and action = 'business.owner_approved') as audits
      from public.businesses b where b.id = '${businessId}'
    `);
    expect(result.rows[0]).toEqual({ is_active: true, owner_approved_name: "Dueña Prueba", audits: 1 });

    const demo = await database.query<{ is_active: boolean; approved: boolean }>(`
      select is_active, owner_approved_at is not null as approved
      from public.businesses where id = '10000000-0000-4000-8000-000000000001'
    `);
    expect(demo.rows[0]).toEqual({ is_active: true, approved: true });
  });
});

describe("privacy retention and cancellation", () => {
  it("purges stale and cancelled customer data with count-only audits", async () => {
    const staleBusiness = "10000000-0000-4000-8000-0000000000c1";
    const cancelledBusiness = "10000000-0000-4000-8000-0000000000c2";
    const graceBusiness = "10000000-0000-4000-8000-0000000000c3";
    const staleCustomer = "30000000-0000-4000-8000-0000000000c1";
    const recentCustomer = "30000000-0000-4000-8000-0000000000c2";
    const cancelledCustomer = "30000000-0000-4000-8000-0000000000c3";
    const graceCustomer = "30000000-0000-4000-8000-0000000000c4";
    await database.exec(`
      insert into public.businesses (id, slug, display_name, contact_email) values
        ('${staleBusiness}', 'retention-test', 'Retention Test', 'privacy@example.test'),
        ('${cancelledBusiness}', 'cancelled-test', 'Cancelled Test', 'privacy@example.test'),
        ('${graceBusiness}', 'cancellation-grace-test', 'Cancellation Grace Test', 'privacy@example.test');
      update public.businesses set cancelled_at = now() - interval '91 days' where id = '${cancelledBusiness}';
      update public.businesses set cancelled_at = now() - interval '31 days' where id = '${graceBusiness}';
      insert into public.customers (id, business_id, full_name, phone_e164, consent_current, consent_at, created_at, last_seen_at) values
        ('${staleCustomer}', '${staleBusiness}', 'Stale Customer', '+13055556001', true, now() - interval '25 months', now() - interval '25 months', now() - interval '25 months'),
        ('${recentCustomer}', '${staleBusiness}', 'Recent Customer', '+13055556002', true, now() - interval '25 months', now() - interval '25 months', now()),
        ('${cancelledCustomer}', '${cancelledBusiness}', 'Cancelled Customer', '+13055556003', true, now(), now(), now()),
        ('${graceCustomer}', '${graceBusiness}', 'Grace Customer', '+13055556004', true, now(), now(), now());
      insert into public.visits (business_id, customer_id, source, visited_at) values
        ('${staleBusiness}', '${staleCustomer}', 'demo', now() - interval '25 months'),
        ('${staleBusiness}', '${recentCustomer}', 'demo', now() - interval '1 day'),
        ('${cancelledBusiness}', '${cancelledCustomer}', 'demo', now()),
        ('${graceBusiness}', '${graceCustomer}', 'demo', now());
      insert into public.consent_records (business_id, customer_id, consented, text_version) values
        ('${staleBusiness}', '${staleCustomer}', true, '2026-10-04'),
        ('${cancelledBusiness}', '${cancelledCustomer}', true, '2026-10-04'),
        ('${graceBusiness}', '${graceCustomer}', true, '2026-10-04');
      insert into public.follow_ups (business_id, customer_id, kind, period_key, status) values
        ('${staleBusiness}', '${staleCustomer}', 'inactive', 'retention', 'dismissed'),
        ('${cancelledBusiness}', '${cancelledCustomer}', 'new', 'first', 'dismissed'),
        ('${graceBusiness}', '${graceCustomer}', 'new', 'first', 'dismissed');
    `);

    const result = await database.query<{ result: { inactiveDeleted: number; cancelledDeleted: number } }>(
      "select private.purge_inactive_customers() as result",
    );
    expect(result.rows[0]?.result).toEqual({ inactiveDeleted: 1, cancelledDeleted: 1 });

    const remaining = await database.query<{ id: string }>(`
      select id::text as id from public.customers
      where id in ('${staleCustomer}', '${recentCustomer}', '${cancelledCustomer}', '${graceCustomer}')
      order by id
    `);
    expect(remaining.rows).toEqual([{ id: recentCustomer }, { id: graceCustomer }]);
    const cascades = await database.query<{ visits: number; consents: number; follow_ups: number }>(`
      select
        (select count(*)::int from public.visits where customer_id in ('${staleCustomer}', '${cancelledCustomer}')) as visits,
        (select count(*)::int from public.consent_records where customer_id in ('${staleCustomer}', '${cancelledCustomer}')) as consents,
        (select count(*)::int from public.follow_ups where customer_id in ('${staleCustomer}', '${cancelledCustomer}')) as follow_ups
    `);
    expect(cascades.rows[0]).toEqual({ visits: 0, consents: 0, follow_ups: 0 });

    const audits = await database.query<{ action: string; deleted_count: number; details: string }>(`
      select action, (details ->> 'deletedCount')::int as deleted_count,
        details::text as details
      from public.audit_log
      where business_id in ('${staleBusiness}', '${cancelledBusiness}')
        and action in ('customers.retention_purged', 'customers.cancellation_purged')
      order by action
    `);
    expect(audits.rows).toEqual([
      { action: "customers.cancellation_purged", deleted_count: 1, details: '{"deletedCount": 1}' },
      { action: "customers.retention_purged", deleted_count: 1, details: '{"deletedCount": 1}' },
    ]);
  });

  it("keeps the purge private and prevents reactivation after cancellation", async () => {
    const privileges = await database.query<{ anon: boolean; authenticated: boolean; service: boolean }>(`
      select
        has_function_privilege('anon', 'private.purge_inactive_customers()', 'execute') as anon,
        has_function_privilege('authenticated', 'private.purge_inactive_customers()', 'execute') as authenticated,
        has_function_privilege('service_role', 'private.purge_inactive_customers()', 'execute') as service
    `);
    expect(privileges.rows[0]).toEqual({ anon: false, authenticated: false, service: false });
    await expect(database.exec(`update public.businesses set is_active = true where slug = 'cancelled-test'`))
      .rejects.toThrow(/businesses_activation_requires_approval_check/);
  });
});

describe("Terms of Service acceptance", () => {
  const businessA = "10000000-0000-4000-8000-0000000000d1";
  const businessB = "10000000-0000-4000-8000-0000000000d2";
  const userA = "40000000-0000-4000-8000-0000000000d1";
  const userB = "40000000-0000-4000-8000-0000000000d2";

  it("records each version once, audits only its version and requires a new acceptance", async () => {
    await database.exec(`
      insert into auth.users (id, email) values
        ('${userA}', 'terms-a@example.test'),
        ('${userB}', 'terms-b@example.test');
      insert into public.businesses (id, slug, display_name) values
        ('${businessA}', 'terms-a', 'Terms A'),
        ('${businessB}', 'terms-b', 'Terms B');
      insert into public.business_members (business_id, user_id, role) values
        ('${businessA}', '${userA}', 'owner'),
        ('${businessB}', '${userB}', 'owner');
    `);

    const first = await database.query<{ recorded: boolean }>(
      `select public.record_terms_acceptance('${userA}', '${businessA}', '2026-09-01') as recorded`,
    );
    const duplicate = await database.query<{ recorded: boolean }>(
      `select public.record_terms_acceptance('${userA}', '${businessA}', '2026-09-01') as recorded`,
    );
    expect(first.rows[0]?.recorded).toBe(true);
    expect(duplicate.rows[0]?.recorded).toBe(false);

    const beforeCurrent = await database.query<{ count: number }>(`
      select count(*)::int as count from public.terms_acceptances
      where user_id = '${userA}' and business_id = '${businessA}' and terms_version = '2026-10-04'
    `);
    expect(beforeCurrent.rows[0]?.count).toBe(0);
    await database.query(`select public.record_terms_acceptance('${userA}', '${businessA}', '2026-10-04')`);

    const records = await database.query<{ terms_version: string }>(`
      select terms_version from public.terms_acceptances
      where user_id = '${userA}' and business_id = '${businessA}' order by terms_version
    `);
    expect(records.rows).toEqual([{ terms_version: "2026-09-01" }, { terms_version: "2026-10-04" }]);
    const audits = await database.query<{ details: string }>(`
      select details::text as details from public.audit_log
      where actor_user_id = '${userA}' and business_id = '${businessA}' and action = 'terms.accepted'
      order by created_at
    `);
    expect(audits.rows).toEqual([
      { details: '{"version": "2026-09-01"}' },
      { details: '{"version": "2026-10-04"}' },
    ]);
  });

  it("blocks a user from accepting or reading terms for another business", async () => {
    await expect(database.query(
      `select public.record_terms_acceptance('${userA}', '${businessB}', '2026-10-04')`,
    )).rejects.toThrow(/terms_business_access_denied/);

    await database.exec(`
      begin;
      set local role authenticated;
      select set_config('request.jwt.claim.sub', '${userB}', true);
    `);
    try {
      const visible = await database.query<{ count: number }>("select count(*)::int as count from public.terms_acceptances");
      expect(visible.rows[0]?.count).toBe(0);
      await expect(database.exec(`
        insert into public.terms_acceptances (user_id, business_id, terms_version)
        values ('${userB}', '${businessB}', 'forged')
      `)).rejects.toThrow(/permission denied/);
    } finally {
      await database.exec("rollback");
    }
  });

  it("allows only the service role to execute the acceptance function and denies direct inserts", async () => {
    const privileges = await database.query<{
      anon_execute: boolean;
      authenticated_execute: boolean;
      service_execute: boolean;
      authenticated_insert: boolean;
      service_insert: boolean;
    }>(`
      select
        has_function_privilege('anon', 'public.record_terms_acceptance(uuid,uuid,text)', 'execute') as anon_execute,
        has_function_privilege('authenticated', 'public.record_terms_acceptance(uuid,uuid,text)', 'execute') as authenticated_execute,
        has_function_privilege('service_role', 'public.record_terms_acceptance(uuid,uuid,text)', 'execute') as service_execute,
        has_table_privilege('authenticated', 'public.terms_acceptances', 'insert') as authenticated_insert,
        has_table_privilege('service_role', 'public.terms_acceptances', 'insert') as service_insert
    `);
    expect(privileges.rows[0]).toEqual({
      anon_execute: false,
      authenticated_execute: false,
      service_execute: true,
      authenticated_insert: false,
      service_insert: false,
    });
  });
});
