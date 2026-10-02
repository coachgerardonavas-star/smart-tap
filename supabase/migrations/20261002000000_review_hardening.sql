begin;

-- Review 2026-10-02.
-- 1. One shared public IP (venue Wi-Fi, carrier NAT) must not block real customers.
--    The per-IP window rises to 40 and a per-phone window of 3 limits repeat submissions.
-- 2. Explicit grants so the schema does not depend on hosted default privileges.

drop function if exists public.record_public_check_in(text, text, text, text, date, text, text, text);

create or replace function private.bump_check_in_rate_limit(
  p_business_id uuid,
  p_identifier_hash text,
  p_limit integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  insert into private.check_in_rate_limits (business_id, identifier_hash, window_started_at, request_count)
  values (p_business_id, p_identifier_hash, now(), 1)
  on conflict (business_id, identifier_hash) do update
  set request_count = case
        when private.check_in_rate_limits.window_started_at < now() - interval '10 minutes' then 1
        else private.check_in_rate_limits.request_count + 1
      end,
      window_started_at = case
        when private.check_in_rate_limits.window_started_at < now() - interval '10 minutes' then now()
        else private.check_in_rate_limits.window_started_at
      end
  returning request_count into v_count;

  if v_count > p_limit then
    raise exception using errcode = 'P0001', message = 'rate_limit_exceeded';
  end if;
end;
$$;

revoke all on function private.bump_check_in_rate_limit(uuid, text, integer) from public, anon, authenticated;

create function public.record_public_check_in(
  p_slug text,
  p_tag_code text,
  p_full_name text,
  p_phone_e164 text,
  p_birthday date,
  p_consent_version text,
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

  -- Keep the limiter table small without a scheduler.
  if random() < 0.01 then
    delete from private.check_in_rate_limits where window_started_at < now() - interval '1 day';
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

revoke all on function public.record_public_check_in(text, text, text, text, date, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_public_check_in(text, text, text, text, date, text, text, text, text) to service_role;

-- The aggregate view inherited hosted default privileges for anon.
revoke all on table public.customer_visit_counts from anon;

-- The server client uses service_role. Grant it explicitly instead of relying on
-- the hosted project's default privileges.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.profiles, public.businesses, public.business_members,
  public.nfc_tags, public.customers, public.consent_records, public.visits, public.audit_log to service_role;
grant select on table public.customer_visit_counts to service_role;
grant usage, select on all sequences in schema public to service_role;

commit;
