alter table public.businesses
  add column owner_approved_terms_version text,
  add column term_ends_at timestamptz;

alter table public.businesses
  add constraint businesses_owner_approved_terms_version_check check (
    owner_approved_terms_version is null or char_length(owner_approved_terms_version) between 1 and 40
  );

update public.businesses
set term_ends_at = coalesce(owner_approved_at, created_at) + interval '3 months'
where is_active and term_ends_at is null;

create index businesses_term_ends_at_idx on public.businesses (term_ends_at)
where term_ends_at is not null and cancelled_at is null;

alter table public.visits add column untagged boolean not null default false;
update public.visits set untagged = true where tag_id is null;
create index visits_business_untagged_idx on public.visits (business_id, visited_at desc)
where untagged;

create table public.terms_signatures (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null check (char_length(terms_version) between 1 and 40),
  signer_name text not null check (char_length(btrim(signer_name)) between 2 and 120),
  signer_title text not null check (char_length(btrim(signer_title)) between 2 and 120),
  signed_at timestamptz not null default now(),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  user_agent text not null check (char_length(user_agent) between 1 and 500),
  unique (user_id, business_id, terms_version)
);

create index terms_signatures_business_version_idx
  on public.terms_signatures (business_id, terms_version, signed_at desc);

alter table public.terms_signatures enable row level security;
revoke all on table public.terms_signatures from public, anon, authenticated;
grant select on table public.terms_signatures to authenticated, service_role;

create policy terms_signatures_select_own
on public.terms_signatures for select to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_business_member(business_id))
);

create or replace function public.record_terms_signature(
  p_user_id uuid,
  p_business_id uuid,
  p_terms_version text,
  p_signer_name text,
  p_signer_title text,
  p_ip_hash text,
  p_user_agent text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted boolean;
  v_signer_name text := btrim(p_signer_name);
  v_signer_title text := btrim(p_signer_title);
  v_user_agent text := left(coalesce(nullif(btrim(p_user_agent), ''), 'unknown'), 500);
begin
  if nullif(btrim(p_terms_version), '') is null or char_length(p_terms_version) > 40 then
    raise exception using errcode = '22023', message = 'invalid_terms_version';
  end if;
  if v_signer_name is null or char_length(v_signer_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'invalid_signer_name';
  end if;
  if v_signer_title is null or char_length(v_signer_title) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'invalid_signer_title';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_signature_ip_hash';
  end if;

  if not exists (
    select 1 from public.business_members
    where user_id = p_user_id
      and business_id = p_business_id
      and role = 'owner'
      and is_active
  ) then
    raise exception using errcode = '42501', message = 'terms_owner_access_denied';
  end if;
  if not exists (
    select 1 from public.businesses
    where id = p_business_id and cancelled_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'terms_business_unavailable';
  end if;

  with inserted as (
    insert into public.terms_signatures (
      business_id, user_id, terms_version, signer_name, signer_title, ip_hash, user_agent
    ) values (
      p_business_id, p_user_id, p_terms_version, v_signer_name, v_signer_title, p_ip_hash, v_user_agent
    )
    on conflict (user_id, business_id, terms_version) do nothing
    returning 1
  )
  select exists(select 1 from inserted) into v_inserted;

  if v_inserted then
    insert into public.terms_acceptances (user_id, business_id, terms_version)
    values (p_user_id, p_business_id, p_terms_version)
    on conflict do nothing;

    insert into public.audit_log (
      actor_user_id, business_id, action, entity_type, entity_id, details
    ) values (
      p_user_id, p_business_id, 'terms.signed', 'business', p_business_id::text,
      jsonb_build_object('version', p_terms_version)
    );
  end if;

  return v_inserted;
end;
$$;

revoke all on function public.record_terms_signature(uuid, uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_terms_signature(uuid, uuid, text, text, text, text, text)
  to service_role;

revoke all on function public.record_business_owner_approval(uuid, text, uuid)
  from public, anon, authenticated, service_role;
-- The 3-argument version stays defined but unusable (no role can execute it);
-- dropping functions through the hosted migration connector has hung before.

create function public.record_business_owner_approval(
  p_business_id uuid,
  p_owner_name text,
  p_actor_user_id uuid,
  p_terms_version text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business public.businesses%rowtype;
  v_approved_at timestamptz := now();
  v_owner_name text := btrim(p_owner_name);
begin
  if v_owner_name is null or char_length(v_owner_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'invalid_owner_name';
  end if;
  if nullif(btrim(p_terms_version), '') is null or char_length(p_terms_version) > 40 then
    raise exception using errcode = '22023', message = 'invalid_terms_version';
  end if;

  select * into v_business
  from public.businesses
  where id = p_business_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;
  if v_business.cancelled_at is not null then
    raise exception using errcode = 'P0001', message = 'business_cancelled';
  end if;
  if nullif(btrim(v_business.display_name), '') is null
    or nullif(btrim(coalesce(v_business.logo_url, '')), '') is null
    or nullif(btrim(v_business.primary_color), '') is null
    or nullif(btrim(v_business.secondary_color), '') is null
    or (v_business.contact_phone is null and v_business.contact_email is null)
    or v_business.inactivity_days not between 7 and 365
    or nullif(btrim(coalesce(v_business.offer_inactive, '')), '') is null
    or nullif(btrim(coalesce(v_business.offer_birthday, '')), '') is null
    or nullif(btrim(coalesce(v_business.offer_frequent, '')), '') is null
    or nullif(btrim(coalesce(v_business.offer_new, '')), '') is null
    or nullif(btrim(coalesce(v_business.google_review_url, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'approval_configuration_incomplete';
  end if;
  if not exists (
    select 1
    from public.terms_signatures s
    join public.business_members m
      on m.business_id = s.business_id and m.user_id = s.user_id
    where s.business_id = p_business_id
      and s.terms_version = p_terms_version
      and m.role = 'owner'
      and m.is_active
  ) then
    raise exception using errcode = 'P0001', message = 'approval_current_owner_signature_required';
  end if;

  update public.businesses
  set owner_approved_at = v_approved_at,
      owner_approved_name = v_owner_name,
      owner_approved_terms_version = p_terms_version,
      updated_at = now()
  where id = p_business_id;

  insert into public.audit_log (
    actor_user_id, business_id, action, entity_type, entity_id, details
  ) values (
    p_actor_user_id, p_business_id, 'business.owner_approved', 'business', p_business_id::text,
    jsonb_build_object('ownerName', v_owner_name, 'approvedAt', v_approved_at, 'termsVersion', p_terms_version)
  );
  return v_approved_at;
end;
$$;

revoke all on function public.record_business_owner_approval(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_business_owner_approval(uuid, text, uuid, text)
  to service_role;

create or replace function private.enforce_business_activation_terms_v2()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_active and not old.is_active then
    if new.owner_approved_terms_version is distinct from '2026-10-04-v2' then
      raise exception using errcode = '23514', message = 'activation_current_terms_approval_required';
    end if;
    if not exists (
      select 1
      from public.terms_signatures s
      join public.business_members m
        on m.business_id = s.business_id and m.user_id = s.user_id
      where s.business_id = new.id
        and s.terms_version = '2026-10-04-v2'
        and m.role = 'owner'
        and m.is_active
    ) then
      raise exception using errcode = '23514', message = 'activation_current_owner_signature_required';
    end if;
    if new.term_ends_at is null then
      new.term_ends_at := now() + interval '3 months';
    end if;
  end if;
  return new;
end;
$$;

create trigger businesses_activation_terms_v2
before update of is_active on public.businesses
for each row execute function private.enforce_business_activation_terms_v2();

create or replace function public.record_term_extension(
  p_business_id uuid,
  p_term_ends_at timestamptz,
  p_actor_user_id uuid,
  p_annex_signed boolean
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous timestamptz;
begin
  if not coalesce(p_annex_signed, false) then
    raise exception using errcode = '22023', message = 'extension_annex_signature_required';
  end if;
  select term_ends_at into v_previous
  from public.businesses
  where id = p_business_id and cancelled_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;
  if p_term_ends_at is null or p_term_ends_at <= now() or (v_previous is not null and p_term_ends_at <= v_previous) then
    raise exception using errcode = '22023', message = 'invalid_term_extension';
  end if;

  update public.businesses
  set term_ends_at = p_term_ends_at, updated_at = now()
  where id = p_business_id;

  insert into public.audit_log (
    actor_user_id, business_id, action, entity_type, entity_id, details
  ) values (
    p_actor_user_id, p_business_id, 'business.term_extended', 'business', p_business_id::text,
    jsonb_build_object('previousTermEndsAt', v_previous, 'newTermEndsAt', p_term_ends_at, 'annexSigned', true)
  );
  return p_term_ends_at;
end;
$$;

revoke all on function public.record_term_extension(uuid, timestamptz, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.record_term_extension(uuid, timestamptz, uuid, boolean)
  to service_role;

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
  v_untagged boolean := true;
begin
  if p_ip_hash is null or char_length(p_ip_hash) <> 64 or p_phone_hash is null or char_length(p_phone_hash) <> 64 then
    raise exception using errcode = '22023', message = 'invalid_identifier';
  end if;
  select * into v_business from public.businesses where slug = p_slug and is_active;
  if not found then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;
  if nullif(btrim(p_tag_code), '') is not null then
    select id into v_tag_id from public.nfc_tags
    where business_id = v_business.id and code = p_tag_code and is_active;
    -- A lost or replaced tag is deactivated so it stops working (NFC_OPERATIONS.md);
    -- an unknown code is rejected too. Only visits without any code are untagged.
    if v_tag_id is null then
      raise exception using errcode = 'P0002', message = 'tag_not_found';
    end if;
    v_untagged := false;
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
    coalesce(p_whatsapp_opt_in, false), case when coalesce(p_whatsapp_opt_in, false) then now() else null end, now()
  )
  on conflict (business_id, phone_e164) do update
  set full_name = excluded.full_name,
      birthday = coalesce(excluded.birthday, public.customers.birthday),
      consent_current = true,
      consent_at = now(),
      whatsapp_opt_in = public.customers.whatsapp_opt_in or excluded.whatsapp_opt_in,
      whatsapp_opt_in_at = case when excluded.whatsapp_opt_in then now() else public.customers.whatsapp_opt_in_at end,
      last_seen_at = now()
  returning * into v_customer;

  insert into public.consent_records (
    business_id, customer_id, consented, text_version, purpose, source, ip_hash, user_agent
  ) values (
    v_business.id, v_customer.id, true, p_consent_version, 'visits', 'landing', p_ip_hash, left(p_user_agent, 500)
  );
  if coalesce(p_whatsapp_opt_in, false) then
    insert into public.consent_records (
      business_id, customer_id, consented, text_version, purpose, source, ip_hash, user_agent
    ) values (
      v_business.id, v_customer.id, true, 'whatsapp-2026-10-04', 'whatsapp', 'landing', p_ip_hash, left(p_user_agent, 500)
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
    insert into public.visits (business_id, customer_id, tag_id, source, untagged)
    values (
      v_business.id, v_customer.id, v_tag_id,
      case when v_tag_id is null then 'manual'::public.visit_source else 'nfc'::public.visit_source end,
      v_untagged
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
    'alreadyCounted', v_already_counted,
    'untagged', v_untagged
  );
end;
$$;

revoke all on function public.record_public_check_in(text, text, text, text, date, text, boolean, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_public_check_in(text, text, text, text, date, text, boolean, text, text, text)
  to service_role;
