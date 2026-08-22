-- Culturebid board (site = 'culture') + bidception repositioned as marketing-platform discovery.
-- Reuses listings/orders/activity. Adds `values` jsonb for up to 5 culture points.
-- Schema only — no seed data. Boards start empty for public launch.

alter table listings drop constraint if exists listings_site_check;
alter table listings add constraint listings_site_check
  check (site in ('founders', 'culture', 'bidception'));

alter table orders drop constraint if exists orders_site_check;
alter table orders add constraint orders_site_check
  check (site in ('founders', 'culture', 'bidception'));

alter table activity drop constraint if exists activity_site_check;
alter table activity add constraint activity_site_check
  check (site in ('founders', 'culture', 'bidception'));

alter table site_stats drop constraint if exists site_stats_site_check;
alter table site_stats add constraint site_stats_site_check
  check (site in ('founders', 'culture', 'bidception'));

alter table listings add column if not exists values jsonb not null default '[]'::jsonb;