-- Signatures are written only through public.record_terms_signature (security definer).
revoke insert, update, delete, truncate on table public.terms_signatures from service_role;
