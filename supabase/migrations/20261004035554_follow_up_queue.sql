alter table public.businesses alter column inactivity_days set default 30;

alter table public.customers
  add column whatsapp_opt_in boolean not null default false,
  add column whatsapp_opt_in_at timestamptz;

alter table public.customers
  add constraint customers_business_id_id_key unique (business_id, id);

alter table public.consent_records
  add column purpose text not null default 'visits'
  check (purpose in ('visits', 'whatsapp'));

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null,
  kind text not null check (kind in ('inactive', 'birthday', 'frequent', 'new')),
  period_key text not null check (char_length(period_key) between 1 and 40),
  status text not null check (status in ('contacted', 'dismissed')),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint follow_ups_customer_business_fk
    foreign key (business_id, customer_id)
    references public.customers(business_id, id) on delete cascade,
  unique (business_id, customer_id, kind, period_key)
);

create index follow_ups_business_created_idx on public.follow_ups (business_id, created_at desc);

alter table public.follow_ups enable row level security;
revoke all on table public.follow_ups from anon, authenticated;
grant select on table public.follow_ups to authenticated;
grant select, insert, update, delete on table public.follow_ups to service_role;

create policy follow_ups_select_member on public.follow_ups for select to authenticated
using ((select private.is_business_member(business_id)));

create or replace function public.record_public_check_in(
  p_slug text,
  p_tag_code text,
  p_full_name text,
  p_phone_e164 text,
  p_birthday date,
  p_consent_version text,
  p_whatsapp_opt_in boolean,
  p_ip_hash text,
  p_phone_hash text,
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
  v_visit_count bigint;
  v_today date;
  v_already_counted boolean;
begin
  if p_ip_hash is null or char_length(p_ip_hash) <> 64 or p_phone_hash is null or char_length(p_phone_hash) <> 64 then
    raise exception using errcode = '22023', message = 'invalid_identifier';
  end if;

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

  perform private.bump_check_in_rate_limit(v_business.id, p_ip_hash, 40);
  perform private.bump_check_in_rate_limit(v_business.id, p_phone_hash, 3);

  if random() < 0.01 then
    delete from private.check_in_rate_limits where window_started_at < now() - interval '1 day';
  end if;

  insert into public.customers (
    business_id, full_name, phone_e164, birthday, consent_current, consent_at,
    whatsapp_opt_in, whatsapp_opt_in_at, last_seen_at
  ) values (
    v_business.id, p_full_name, p_phone_e164, p_birthday, true, now(),
    coalesce(p_whatsapp_opt_in, false),
    case when coalesce(p_whatsapp_opt_in, false) then now() else null end,
    now()
  )
  on conflict (business_id, phone_e164) do update
  set full_name = excluded.full_name,
      birthday = coalesce(excluded.birthday, public.customers.birthday),
      consent_current = true,
      consent_at = now(),
      whatsapp_opt_in = public.customers.whatsapp_opt_in or excluded.whatsapp_opt_in,
      whatsapp_opt_in_at = case
        when excluded.whatsapp_opt_in then now()
        else public.customers.whatsapp_opt_in_at
      end,
      last_seen_at = now()
  returning * into v_customer;

  insert into public.consent_records (
    business_id, customer_id, consented, text_version, purpose, source, ip_hash, user_agent
  ) values (
    v_business.id, v_customer.id, true, p_consent_version, 'visits', 'landing', p_ip_hash,
    left(p_user_agent, 500)
  );

  if coalesce(p_whatsapp_opt_in, false) then
    insert into public.consent_records (
      business_id, customer_id, consented, text_version, purpose, source, ip_hash, user_agent
    ) values (
      v_business.id, v_customer.id, true, 'whatsapp-2026-10-04', 'whatsapp', 'landing', p_ip_hash,
      left(p_user_agent, 500)
    );
  end if;

  v_today := (now() at time zone v_business.timezone)::date;
  select exists (
    select 1 from public.visits
    where customer_id = v_customer.id
      and visited_at >= (v_today::timestamp at time zone v_business.timezone)
      and visited_at < ((v_today + 1)::timestamp at time zone v_business.timezone)
  ) into v_already_counted;

  if not v_already_counted then
    insert into public.visits (business_id, customer_id, tag_id, source)
    values (
      v_business.id, v_customer.id, v_tag_id,
      case when v_tag_id is null then 'manual'::public.visit_source else 'nfc'::public.visit_source end
    );
  end if;

  if v_tag_id is not null then
    update public.nfc_tags set last_used_at = now() where id = v_tag_id;
  end if;

  select count(*) into v_visit_count from public.visits where customer_id = v_customer.id;

  return jsonb_build_object(
    'customerName', v_customer.full_name,
    'businessName', v_business.display_name,
    'visitCount', v_visit_count,
    'alreadyCounted', v_already_counted
  );
end;
$$;

revoke all on function public.record_public_check_in(text, text, text, text, date, text, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.record_public_check_in(text, text, text, text, date, text, boolean, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_public_check_in(text, text, text, text, date, text, boolean, text, text, text)
  to service_role;

create or replace function public.record_whatsapp_opt_out(
  p_business_id uuid,
  p_customer_id uuid,
  p_actor_user_id uuid,
  p_user_agent text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.customers
  set whatsapp_opt_in = false
  where business_id = p_business_id and id = p_customer_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'customer_not_found';
  end if;

  insert into public.consent_records (
    business_id, customer_id, consented, text_version, purpose, source, user_agent
  ) values (
    p_business_id, p_customer_id, false, 'whatsapp-optout-2026-10-04', 'whatsapp', 'admin',
    left(p_user_agent, 500)
  );

  insert into public.audit_log (
    actor_user_id, business_id, action, entity_type, entity_id, details
  ) values (
    p_actor_user_id, p_business_id, 'customer.whatsapp_opt_out', 'customer', p_customer_id::text,
    jsonb_build_object('consentPurpose', 'whatsapp')
  );

  return true;
end;
$$;

revoke all on function public.record_whatsapp_opt_out(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_whatsapp_opt_out(uuid, uuid, uuid, text)
  to service_role;
