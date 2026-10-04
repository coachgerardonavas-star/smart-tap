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
