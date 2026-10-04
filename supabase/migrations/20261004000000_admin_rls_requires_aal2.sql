begin;

-- Review 2026-10-04 (GS-02, GS-03). The platform-admin RLS bypass must carry the
-- same second factor as the application. Without this, an admin password alone
-- yields an aal1 token that reads every tenant through the Data API.
create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and platform_role = 'platform_admin'
    );
$$;

revoke all on function private.is_platform_admin() from public;
grant execute on function private.is_platform_admin() to authenticated;

commit;
