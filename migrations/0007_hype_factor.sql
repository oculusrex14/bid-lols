-- Per-board display multiplier, rolled once (not a flat 6× on every site).
alter table site_stats add column if not exists hype_factor double precision;

update site_stats
  set hype_factor = round((1.2 + random() * 4.8)::numeric, 2)
  where hype_factor is null;

alter table site_stats
  alter column hype_factor set default 3.0;
