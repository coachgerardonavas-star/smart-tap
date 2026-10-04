insert into public.businesses (
  id, slug, display_name, legal_name, privacy_url, primary_color, secondary_color, timezone,
  default_country, inactivity_days, is_active, owner_approved_at, owner_approved_name
) values (
  '10000000-0000-4000-8000-000000000001', 'cafe-luna', 'Café Luna', 'Café Luna Demo LLC', '/privacy',
  '#B45309', '#1C1917', 'America/New_York', 'US', 30, true, now(), 'Aprobación demo'
) on conflict (id) do update set
  display_name = excluded.display_name,
  primary_color = excluded.primary_color,
  secondary_color = excluded.secondary_color;

insert into public.nfc_tags (id, business_id, label, code, is_active)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'Mostrador principal',
  'demo-cafe-luna-main-2026',
  true
) on conflict (id) do nothing;

insert into public.customers (
  id, business_id, full_name, phone_e164, birthday, consent_current, consent_at,
  created_at, updated_at, last_seen_at
) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Elena García', '+13055550101', '1992-10-15', true, now() - interval '70 days', now() - interval '70 days', now(), now() - interval '2 days'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Marco Ruiz', '+13055550102', '1987-11-04', true, now() - interval '55 days', now() - interval '55 days', now(), now() - interval '42 days'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Ana Torres', '+13055550103', null, true, now() - interval '10 days', now() - interval '10 days', now(), now() - interval '1 day')
on conflict (id) do nothing;

insert into public.visits (id, business_id, customer_id, tag_id, source, visited_at)
select visit_id, '10000000-0000-4000-8000-000000000001', customer_id, '20000000-0000-4000-8000-000000000001', 'demo', visited_at
from (values
  ('50000000-0000-4000-8000-000000000001'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, now() - interval '70 days'),
  ('50000000-0000-4000-8000-000000000002'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, now() - interval '20 days'),
  ('50000000-0000-4000-8000-000000000003'::uuid, '30000000-0000-4000-8000-000000000001'::uuid, now() - interval '2 days'),
  ('50000000-0000-4000-8000-000000000004'::uuid, '30000000-0000-4000-8000-000000000002'::uuid, now() - interval '55 days'),
  ('50000000-0000-4000-8000-000000000005'::uuid, '30000000-0000-4000-8000-000000000002'::uuid, now() - interval '42 days'),
  ('50000000-0000-4000-8000-000000000006'::uuid, '30000000-0000-4000-8000-000000000003'::uuid, now() - interval '10 days'),
  ('50000000-0000-4000-8000-000000000007'::uuid, '30000000-0000-4000-8000-000000000003'::uuid, now() - interval '1 day')
) as demo_visits(visit_id, customer_id, visited_at)
on conflict (id) do nothing;
