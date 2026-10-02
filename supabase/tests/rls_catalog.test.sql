begin;
select plan(10);

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.businesses'::regclass), 'businesses has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.business_members'::regclass), 'business_members has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.nfc_tags'::regclass), 'nfc_tags has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.customers'::regclass), 'customers has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.consent_records'::regclass), 'consent_records has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.visits'::regclass), 'visits has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass), 'audit_log has RLS');
select is((select reloptions @> array['security_invoker=true'] from pg_class where oid = 'public.customer_visit_counts'::regclass), true, 'aggregate view uses invoker security');
select is((select has_function_privilege('anon', 'public.record_public_check_in(text,text,text,text,date,text,text,text,text)', 'execute')), false, 'anon cannot execute check-in function');

select * from finish();
rollback;
