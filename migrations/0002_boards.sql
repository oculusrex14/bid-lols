create table if not exists listings (
  id text primary key,
  site text not null check (site in ('founders', 'bidception')),
  url text not null,
  url_key text not null,
  title text not null,
  tagline text not null default '',
  team text not null default '',
  bid_cents integer not null default 0,
  rank integer,
  clicks integer not null default 0,
  swap_count integer not null default 0,
  manage_token text not null unique,
  created_at timestamptz not null default now(),
  last_bid_at timestamptz not null default now(),
  unique (site, url_key)
);

create index if not exists listings_site_bid_idx on listings (site, bid_cents desc);
create index if not exists listings_site_rank_idx on listings (site, rank);

create table if not exists orders (
  id text primary key,
  site text not null check (site in ('founders', 'bidception')),
  kind text not null check (kind in ('bid', 'swap')),
  amount_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  listing_id text,
  manage_token text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists orders_status_idx on orders (status);

create table if not exists activity (
  id text primary key,
  site text not null check (site in ('founders', 'bidception')),
  listing_id text,
  kind text not null check (kind in ('bid', 'rebid', 'swap', 'click')),
  amount_cents integer,
  rank_to integer,
  title text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists activity_site_created_idx on activity (site, created_at desc);

-- Seed data removed for public launch. Boards start empty.