alter table public.customers
  add column whatsapp_opted_out_at timestamptz;

-- Customers who already sent BAJA before this migration keep that protection:
-- the latest negative WhatsApp consent becomes their opt-out timestamp.
update public.customers c
set whatsapp_opted_out_at = latest.created_at
from (
  select customer_id, max(created_at) as created_at
  from public.consent_records
  where purpose = 'whatsapp' and not consented
  group by customer_id
) latest
where latest.customer_id = c.id and not c.whatsapp_opt_in;

create table private.auth_rate_limits (
  bucket text not null check (bucket in ('login_ip', 'login_email', 'forgot_ip', 'forgot_email')),
  identifier_hash text not null check (identifier_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  primary key (bucket, identifier_hash)
);

revoke all on table private.auth_rate_limits from public, anon, authenticated, service_role;

create function private.bump_auth_rate_limit(
  p_bucket text,
  p_identifier_hash text,
  p_limit integer,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into private.auth_rate_limits (bucket, identifier_hash, window_started_at, request_count)
  values (p_bucket, p_identifier_hash, now(), 1)
  on conflict (bucket, identifier_hash) do update
  set request_count = case
        when private.auth_rate_limits.window_started_at < now() - p_window then 1
        else private.auth_rate_limits.request_count + 1
      end,
      window_started_at = case
        when private.auth_rate_limits.window_started_at < now() - p_window then now()
        else private.auth_rate_limits.window_started_at
      end
  returning request_count into v_count;

  if v_count > p_limit then
    raise exception using errcode = 'P0001', message = 'rate_limit_exceeded';
  end if;
end;
$$;

revoke all on function private.bump_auth_rate_limit(text, text, integer, interval)
  from public, anon, authenticated, service_role;

create function public.enforce_auth_rate_limit(
  p_action text,
  p_ip_hash text,
  p_email_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' or p_email_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_identifier';
  end if;

  if p_action = 'login' then
    perform private.bump_auth_rate_limit('login_ip', p_ip_hash, 10, interval '15 minutes');
    perform private.bump_auth_rate_limit('login_email', p_email_hash, 5, interval '15 minutes');
  elsif p_action = 'forgot_password' then
    perform private.bump_auth_rate_limit('forgot_ip', p_ip_hash, 10, interval '1 hour');
    perform private.bump_auth_rate_limit('forgot_email', p_email_hash, 3, interval '1 hour');
  else
    raise exception using errcode = '22023', message = 'invalid_action';
  end if;

  if random() < 0.01 then
    delete from private.auth_rate_limits where window_started_at < now() - interval '2 days';
  end if;
  return true;
end;
$$;

revoke all on function public.enforce_auth_rate_limit(text, text, text)
  from public, anon, authenticated;
grant execute on function public.enforce_auth_rate_limit(text, text, text)
  to service_role;

revoke execute on function private.create_profile_for_auth_user()
  from public, anon, authenticated;
revoke execute on function private.touch_updated_at()
  from public, anon, authenticated;

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
  set full_name = public.customers.full_name,
      birthday = coalesce(public.customers.birthday, excluded.birthday),
      consent_current = true,
      consent_at = now(),
      whatsapp_opt_in = case
        when public.customers.whatsapp_opted_out_at is not null then false
        else public.customers.whatsapp_opt_in or excluded.whatsapp_opt_in
      end,
      whatsapp_opt_in_at = case
        when public.customers.whatsapp_opted_out_at is not null then public.customers.whatsapp_opt_in_at
        when excluded.whatsapp_opt_in then now()
        else public.customers.whatsapp_opt_in_at
      end,
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
      v_business.id,
      v_customer.id,
      v_customer.whatsapp_opted_out_at is null,
      case when v_customer.whatsapp_opted_out_at is null then 'whatsapp-2026-10-04' else 'whatsapp-blocked-2026-10-04' end,
      'whatsapp',
      'landing',
      p_ip_hash,
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
  set whatsapp_opt_in = false,
      whatsapp_opted_out_at = coalesce(whatsapp_opted_out_at, now())
  where business_id = p_business_id and id = p_customer_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'customer_not_found';
  end if;

  insert into public.consent_records (
    business_id, customer_id, consented, text_version, purpose, source, user_agent
  ) values (
    p_business_id, p_customer_id, false, 'whatsapp-optout-2026-10-04', 'whatsapp', 'admin', left(p_user_agent, 500)
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
