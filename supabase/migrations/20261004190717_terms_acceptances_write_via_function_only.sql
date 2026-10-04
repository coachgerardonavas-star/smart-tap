-- Writes to terms_acceptances happen only through public.record_terms_acceptance
-- (security definer). The server role keeps read access for the dashboard gate.
revoke insert, update, delete, truncate on table public.terms_acceptances from service_role;
