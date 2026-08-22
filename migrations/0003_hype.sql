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

-- Seed stats removed for public launch. ensureSiteStats inserts zero rows at runtime.