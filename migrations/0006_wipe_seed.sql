-- Wipe all seed/demo data from the production database so boards start empty for public launch.
-- Schema (tables, constraints, columns) stays intact. Only rows are removed.

delete from activity;
delete from orders;
delete from listings;

update site_stats
  set views = 0, visits = 0, visits_today = 0, visits_day = current_date, hype_locked = false;