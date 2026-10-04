alter table public.businesses
  add column offer_inactive text
    check (offer_inactive is null or char_length(btrim(offer_inactive)) between 1 and 200),
  add column offer_birthday text
    check (offer_birthday is null or char_length(btrim(offer_birthday)) between 1 and 200),
  add column offer_frequent text
    check (offer_frequent is null or char_length(btrim(offer_frequent)) between 1 and 200),
  add column offer_new text
    check (offer_new is null or char_length(btrim(offer_new)) between 1 and 200),
  add column google_review_url text,
  add column owner_approved_at timestamptz,
  add column owner_approved_name text
    check (owner_approved_name is null or char_length(btrim(owner_approved_name)) between 2 and 120);

alter table public.businesses
  add constraint businesses_google_review_url_check check (
    google_review_url is null
    or google_review_url ~* '^https://(g\.page|search\.google\.com|www\.google\.com|maps\.app\.goo\.gl)(/|$|[?#])'
  );

update public.businesses
set owner_approved_at = coalesce(owner_approved_at, created_at),
    owner_approved_name = coalesce(owner_approved_name, 'Aprobación previa conservada')
where is_active;

alter table public.businesses alter column is_active set default false;

alter table public.businesses
  add constraint businesses_activation_requires_approval_check
  check (not is_active or owner_approved_at is not null);

create or replace function public.upsert_business_member_with_limit(
  p_business_id uuid,
  p_user_id uuid,
  p_role public.business_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_active boolean;
begin
  perform 1 from public.businesses where id = p_business_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;

  select is_active into v_is_active
  from public.business_members
  where business_id = p_business_id and user_id = p_user_id;

  if coalesce(v_is_active, false) then
    update public.business_members
    set role = p_role, updated_at = now()
    where business_id = p_business_id and user_id = p_user_id;
    return;
  end if;

  if (select count(*) from public.business_members where business_id = p_business_id and is_active) >= 2 then
    raise exception using errcode = 'P0001', message = 'active_member_limit';
  end if;

  insert into public.business_members (business_id, user_id, role, is_active)
  values (p_business_id, p_user_id, p_role, true)
  on conflict (business_id, user_id) do update
  set role = excluded.role, is_active = true, updated_at = now();
end;
$$;

create or replace function public.set_business_member_active_with_limit(
  p_business_id uuid,
  p_user_id uuid,
  p_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_active boolean;
begin
  perform 1 from public.businesses where id = p_business_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;

  select is_active into v_is_active
  from public.business_members
  where business_id = p_business_id and user_id = p_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'member_not_found';
  end if;

  if p_active and not v_is_active
    and (select count(*) from public.business_members where business_id = p_business_id and is_active) >= 2 then
    raise exception using errcode = 'P0001', message = 'active_member_limit';
  end if;

  update public.business_members
  set is_active = p_active, updated_at = now()
  where business_id = p_business_id and user_id = p_user_id;
end;
$$;

create or replace function public.record_business_owner_approval(
  p_business_id uuid,
  p_owner_name text,
  p_actor_user_id uuid
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

  select * into v_business
  from public.businesses
  where id = p_business_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'business_not_found';
  end if;

  if nullif(btrim(v_business.display_name), '') is null
    or nullif(btrim(coalesce(v_business.logo_url, '')), '') is null
    or nullif(btrim(v_business.primary_color), '') is null
    or nullif(btrim(v_business.secondary_color), '') is null
    or v_business.inactivity_days not between 7 and 365
    or nullif(btrim(coalesce(v_business.offer_inactive, '')), '') is null
    or nullif(btrim(coalesce(v_business.offer_birthday, '')), '') is null
    or nullif(btrim(coalesce(v_business.offer_frequent, '')), '') is null
    or nullif(btrim(coalesce(v_business.offer_new, '')), '') is null
    or nullif(btrim(coalesce(v_business.google_review_url, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'approval_configuration_incomplete';
  end if;

  if not exists (
    select 1 from public.business_members
    where business_id = p_business_id and is_active
  ) then
    raise exception using errcode = 'P0001', message = 'approval_active_member_required';
  end if;

  update public.businesses
  set owner_approved_at = v_approved_at,
      owner_approved_name = v_owner_name,
      updated_at = now()
  where id = p_business_id;

  insert into public.audit_log (
    actor_user_id, business_id, action, entity_type, entity_id, details
  ) values (
    p_actor_user_id, p_business_id, 'business.owner_approved', 'business', p_business_id::text,
    jsonb_build_object('ownerName', v_owner_name, 'approvedAt', v_approved_at)
  );

  return v_approved_at;
end;
$$;

revoke all on function public.upsert_business_member_with_limit(uuid, uuid, public.business_role)
  from public, anon, authenticated;
revoke all on function public.set_business_member_active_with_limit(uuid, uuid, boolean)
  from public, anon, authenticated;
revoke all on function public.record_business_owner_approval(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.upsert_business_member_with_limit(uuid, uuid, public.business_role)
  to service_role;
grant execute on function public.set_business_member_active_with_limit(uuid, uuid, boolean)
  to service_role;
grant execute on function public.record_business_owner_approval(uuid, text, uuid)
  to service_role;
