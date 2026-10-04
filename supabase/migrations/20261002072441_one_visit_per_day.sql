create or replace function public.record_public_check_in(
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

revoke all on function public.record_public_check_in(text, text, text, text, date, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_public_check_in(text, text, text, text, date, text, text, text, text) to service_role;
