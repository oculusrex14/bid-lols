-- Site-level views / visits. Real integers only. Display multiplier is computed in app code.
create table if not exists site_stats (
  site text primary key check (site in ('founders', 'bidception')),
  views bigint not null default 0,
  visits bigint not null default 0,
  visits_today bigint not null default 0,
  visits_day date not null default current_date,
  launched_at timestamptz not null default now(),
  hype_locked boolean not null default false
);

insert into site_stats (site, views, visits, visits_today, visits_day, launched_at, hype_locked)
values
  ('founders', 28400, 16642, 412, current_date, now(), false),
  ('bidception', 35100, 26484, 528, current_date, now(), false)
on conflict (site) do nothing;
