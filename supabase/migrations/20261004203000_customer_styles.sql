-- D-046 / D-048: configurable customer-facing styles.

alter table public.businesses
  add column theme text not null default 'calido',
  add column tagline text,
  add column benefits text[],
  add column hero_image_url text,
  add constraint businesses_theme_check
    check (theme in ('elegante', 'calido', 'moderno', 'colorido')),
  add constraint businesses_tagline_check
    check (tagline is null or (char_length(btrim(tagline)) between 1 and 80)),
  add constraint businesses_benefits_check
    check (
      benefits is null or (
        cardinality(benefits) = 3
        and array_position(benefits, null) is null
        and char_length(btrim(benefits[1])) between 1 and 40
        and char_length(btrim(benefits[2])) between 1 and 40
        and char_length(btrim(benefits[3])) between 1 and 40
      )
    ),
  add constraint businesses_hero_image_url_check
    check (
      hero_image_url is null or (
        char_length(hero_image_url) between 1 and 500
        and hero_image_url like 'https://%'
      )
    );
