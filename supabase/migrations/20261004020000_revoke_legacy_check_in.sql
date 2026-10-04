-- The 8-argument check-in function was superseded by the 9-argument version
-- (per-phone rate limit). It was revoked on the live database by hand on
-- 2026-10-02; this file records that state so a rebuild from Git matches.
revoke all on function public.record_public_check_in(text, text, text, text, date, text, text, text)
  from public, anon, authenticated, service_role;
