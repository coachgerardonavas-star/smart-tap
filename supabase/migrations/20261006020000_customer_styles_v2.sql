-- D-057: customer styles v2 — business type presets, Instagram link and
-- bundled stock hero photos. Not applied by the Builder.

alter table public.businesses
  add column business_type text,
  add column instagram_url text,
  add constraint businesses_business_type_check
    check (
      business_type is null
      or business_type in ('restaurante', 'food_truck', 'cafe', 'panaderia', 'heladeria', 'barberia', 'salon', 'otro')
    ),
  add constraint businesses_instagram_url_check
    check (
      instagram_url is null
      or instagram_url ~ '^https://www\.instagram\.com/[A-Za-z0-9._]{1,30}$'
    );

alter table public.businesses
  drop constraint businesses_hero_image_url_check,
  add constraint businesses_hero_image_url_check
    check (
      hero_image_url is null or (
        char_length(hero_image_url) between 1 and 500
        and (
          hero_image_url like 'https://%'
          or hero_image_url ~ '^/stock/[a-z_]+/[a-z0-9-]+\.webp$'
        )
      )
    );
