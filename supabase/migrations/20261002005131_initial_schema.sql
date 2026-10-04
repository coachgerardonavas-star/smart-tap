begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.platform_role as enum ('user', 'platform_admin');
create type public.business_role as enum ('owner', 'manager', 'viewer');
create type public.visit_source as enum ('nfc', 'manual', 'demo');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  platform_role public.platform_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (char_length(display_name) between 2 and 100),
  legal_name text,
  logo_url text,
  privacy_url text,
  primary_color text not null default '#155EEF' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#0B1220' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  timezone text not null default 'America/New_York',
  default_country char(2) not null default 'US',
  inactivity_days integer not null default 45 check (inactivity_days between 7 and 365),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.business_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table public.nfc_tags (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  code text not null unique check (char_length(code) between 12 and 100),
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  birthday date,
  consent_current boolean not null default false,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (business_id, phone_e164)
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  consented boolean not null,
  text_version text not null check (char_length(text_version) between 1 and 30),
  source text not null default 'landing' check (source in ('landing', 'admin')),
  ip_hash text check (ip_hash is null or char_length(ip_hash) = 64),
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  tag_id uuid references public.nfc_tags(id) on delete set null,
  source public.visit_source not null default 'nfc',
  visited_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table private.check_in_rate_limits (
  business_id uuid not null references public.businesses(id) on delete cascade,
  identifier_hash text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1,
  primary key (business_id, identifier_hash)
);

create index customers_business_last_seen_idx on public.customers (business_id, last_seen_at desc);
create index customers_business_birthday_idx on public.customers (business_id, birthday) where birthday is not null;
create index visits_business_visited_idx on public.visits (business_id, visited_at desc);
create index visits_customer_visited_idx on public.visits (customer_id, visited_at desc);
create index consent_customer_created_idx on public.consent_records (customer_id, created_at desc);
create index business_members_user_idx on public.business_members (user_id, business_id) where is_active;

create view public.customer_visit_counts
with (security_invoker = true)
as
select business_id, customer_id, count(*)::bigint as visit_count, max(visited_at) as last_visit_at
from public.visits
group by business_id, customer_id;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger businesses_touch_updated_at before update on public.businesses
for each row execute function private.touch_updated_at();
create trigger business_members_touch_updated_at before update on public.business_members
for each row execute function private.touch_updated_at();
create trigger customers_touch_updated_at before update on public.customers
for each row execute function private.touch_updated_at();

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.create_profile_for_auth_user();

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and platform_role = 'platform_admin'
  );
$$;

create or replace function private.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin() or exists (
    select 1 from public.business_members
    where business_id = target_business_id
      and user_id = (select auth.uid())
      and is_active
  );
$$;

create or replace function private.can_manage_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin() or exists (
    select 1 from public.business_members
    where business_id = target_business_id
      and user_id = (select auth.uid())
      and role in ('owner', 'manager')
      and is_active
  );
$$;

revoke all on function private.is_platform_admin() from public;
revoke all on function private.is_business_member(uuid) from public;
revoke all on function private.can_manage_business(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.can_manage_business(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.nfc_tags enable row level security;
alter table public.customers enable row level security;
alter table public.consent_records enable row level security;
alter table public.visits enable row level security;
alter table public.audit_log enable row level security;

revoke all on table public.profiles, public.businesses, public.business_members, public.nfc_tags,
  public.customers, public.consent_records, public.visits, public.audit_log from anon, authenticated;
grant select on table public.profiles, public.businesses, public.business_members, public.nfc_tags,
  public.customers, public.consent_records, public.visits to authenticated;
grant select on table public.customer_visit_counts to authenticated;

create policy profiles_select_self_or_admin on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_platform_admin()));

create policy businesses_select_member on public.businesses for select to authenticated
using ((select private.is_business_member(id)));

create policy business_members_select_allowed on public.business_members for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.can_manage_business(business_id))
);

create policy nfc_tags_select_member on public.nfc_tags for select to authenticated
using ((select private.is_business_member(business_id)));

create policy customers_select_member on public.customers for select to authenticated
using ((select private.is_business_member(business_id)));

create policy consent_records_select_member on public.consent_records for select to authenticated
using ((select private.is_business_member(business_id)));

create policy visits_select_member on public.visits for select to authenticated
using ((select private.is_business_member(business_id)));

create policy audit_log_select_platform_admin on public.audit_log for select to authenticated
using ((select private.is_platform_admin()));

create or replace function public.record_public_check_in(
  p_slug text,
  p_tag_code text,
  p_full_name text,
  p_phone_e164 text,
  p_birthday date,
  p_consent_version text,
  p_ip_hash text,
  p_user_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses%rowtype;
  v_tag_id uuid;
  v_customer public.customers%rowtype;
  v_rate_count integer;
  v_visit_count bigint;
begin
  select * into v_business
  from public.businesses
  where slug = p_slug and is_active;

  if not found then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;

  if p_tag_code is not null and p_tag_code <> '' then
    select id into v_tag_id from public.nfc_tags
    where business_id = v_business.id and code = p_tag_code and is_active;
    if not found then
      raise exception using errcode = 'P0002', message = 'tag_not_found';
    end if;
  end if;

  insert into private.check_in_rate_limits (business_id, identifier_hash, window_started_at, request_count)
  values (v_business.id, p_ip_hash, now(), 1)
  on conflict (business_id, identifier_hash) do update
  set request_count = case
        when private.check_in_rate_limits.window_started_at < now() - interval '10 minutes' then 1
        else private.check_in_rate_limits.request_count + 1
      end,
      window_started_at = case
        when private.check_in_rate_limits.window_started_at < now() - interval '10 minutes' then now()
        else private.check_in_rate_limits.window_started_at
      end
  returning request_count into v_rate_count;

  if v_rate_count > 8 then
    raise exception using errcode = 'P0001', message = 'rate_limit_exceeded';
  end if;

  insert into public.customers (
    business_id, full_name, phone_e164, birthday, consent_current, consent_at, last_seen_at
  ) values (
    v_business.id, p_full_name, p_phone_e164, p_birthday, true, now(), now()
  )
  on conflict (business_id, phone_e164) do update
  set full_name = excluded.full_name,
      birthday = coalesce(excluded.birthday, public.customers.birthday),
      consent_current = true,
      consent_at = now(),
      last_seen_at = now()
  returning * into v_customer;

  insert into public.consent_records (
    business_id, customer_id, consented, text_version, source, ip_hash, user_agent
  ) values (
    v_business.id, v_customer.id, true, p_consent_version, 'landing', p_ip_hash,
    left(p_user_agent, 500)
  );

  insert into public.visits (business_id, customer_id, tag_id, source)
  values (
    v_business.id, v_customer.id, v_tag_id,
    case when v_tag_id is null then 'manual'::public.visit_source else 'nfc'::public.visit_source end
  );

  if v_tag_id is not null then
    update public.nfc_tags set last_used_at = now() where id = v_tag_id;
  end if;

  select count(*) into v_visit_count from public.visits where customer_id = v_customer.id;

  return jsonb_build_object(
    'customerName', v_customer.full_name,
    'businessName', v_business.display_name,
    'visitCount', v_visit_count
  );
end;
$$;

revoke all on function public.record_public_check_in(text, text, text, text, date, text, text, text) from public, anon, authenticated;
grant execute on function public.record_public_check_in(text, text, text, text, date, text, text, text) to service_role;

commit;
