alter table public.businesses
  add column contact_phone text,
  add column contact_email text,
  add column cancelled_at timestamptz;

alter table public.businesses
  add constraint businesses_contact_phone_check check (
    contact_phone is null or contact_phone ~ '^\+[1-9][0-9]{6,14}$'
  ),
  add constraint businesses_contact_email_check check (
    contact_email is null
    or (char_length(contact_email) <= 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
  );

-- The demo business needs a real visible contact before its per-business notice can render.
update public.businesses
set contact_email = 'automateit@yourbizupgraded.com'
where slug = 'cafe-luna' and contact_phone is null and contact_email is null;

-- A custom URL remains an override. Null means the built-in /privacy/[slug] notice.
update public.businesses set privacy_url = null where privacy_url = '/privacy';

-- Safe migration behavior for any unexpected active row without a usable contact.
update public.businesses
set is_active = false
where is_active and contact_phone is null and contact_email is null;

alter table public.businesses drop constraint businesses_activation_requires_approval_check;
alter table public.businesses
  add constraint businesses_activation_requires_approval_check check (
    not is_active
    or (
      owner_approved_at is not null
      and cancelled_at is null
      and (contact_phone is not null or contact_email is not null)
    )
  );

create index businesses_cancelled_at_idx on public.businesses (cancelled_at)
where cancelled_at is not null;

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

revoke all on function public.record_business_owner_approval(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.record_business_owner_approval(uuid, text, uuid)
  to service_role;

create or replace function private.purge_inactive_customers()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_inactive_deleted bigint := 0;
  v_cancelled_deleted bigint := 0;
begin
  for v_row in
    with deleted as (
      delete from public.customers c
      using public.businesses b
      where c.business_id = b.id
        and b.cancelled_at is not null
        and b.cancelled_at < now() - interval '30 days'
      returning c.business_id
    )
    select business_id, count(*)::bigint as deleted_count
    from deleted
    group by business_id
  loop
    insert into public.audit_log (business_id, action, entity_type, entity_id, details)
    values (
      v_row.business_id,
      'customers.cancellation_purged',
      'business',
      v_row.business_id::text,
      jsonb_build_object('deletedCount', v_row.deleted_count)
    );
    v_cancelled_deleted := v_cancelled_deleted + v_row.deleted_count;
  end loop;

  for v_row in
    with deleted as (
      delete from public.customers c
      using public.businesses b
      where c.business_id = b.id
        and b.cancelled_at is null
        and coalesce(
          (select max(v.visited_at) from public.visits v where v.customer_id = c.id),
          c.created_at
        ) < now() - interval '24 months'
      returning c.business_id
    )
    select business_id, count(*)::bigint as deleted_count
    from deleted
    group by business_id
  loop
    insert into public.audit_log (business_id, action, entity_type, entity_id, details)
    values (
      v_row.business_id,
      'customers.retention_purged',
      'business',
      v_row.business_id::text,
      jsonb_build_object('deletedCount', v_row.deleted_count)
    );
    v_inactive_deleted := v_inactive_deleted + v_row.deleted_count;
  end loop;

  return jsonb_build_object(
    'inactiveDeleted', v_inactive_deleted,
    'cancelledDeleted', v_cancelled_deleted
  );
end;
$$;

revoke all on function private.purge_inactive_customers()
  from public, anon, authenticated, service_role;

-- Supabase provides pg_cron. The availability guard lets the same migration run in
-- the local PGlite integration suite, where extensions cannot be installed.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
    execute 'select cron.unschedule(jobid) from cron.job where jobname = ''smart-tap-daily-privacy-purge''';
    execute 'select cron.schedule(''smart-tap-daily-privacy-purge'', ''17 3 * * *'', ''select private.purge_inactive_customers()'')';
  end if;
end;
$$;
