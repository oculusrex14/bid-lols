alter table listings add column if not exists socials jsonb not null default '[]'::jsonb;

-- Seed socials removed for public launch.