-- D-057 follow-up: align business_type with the approved list
-- (restaurante, cafe, panaderia, barberia, salon, heladeria, tienda, gimnasio).
-- 20261006020000_customer_styles_v2.sql is already applied in production with the
-- old list, so the change ships as a new migration, never as an edit of that file.
-- Pre-check (2026-10-10): no row uses food_truck/otro; 3 rows are null, 1 is cafe.
-- Not applied by the Builder/Reviewer: the CEO applies it.

alter table public.businesses
  drop constraint businesses_business_type_check,
  add constraint businesses_business_type_check
    check (
      business_type is null
      or business_type in ('restaurante', 'cafe', 'panaderia', 'barberia', 'salon', 'heladeria', 'tienda', 'gimnasio')
    );
