-- The Crown: daily #1 prediction game layered on the boards.
-- Unowned rows; identity is a device token + display handle (auth stays OFF).

create table if not exists crown_predictions (
  id text primary key,
  site text not null check (site in ('founders', 'culture', 'bidception')),
  round text not null,                -- UTC day key, e.g. '2026-08-25'
  token text not null,
  handle text not null,
  listing_id text not null,
  multiplier integer not null default 1,
  settled boolean not null default false,
  won boolean not null default false,
  created_at timestamptz not null default now(),
  unique (site, round, token, listing_id)
);

create index if not exists crown_predictions_settle_idx on crown_predictions (site, round, settled);
create index if not exists crown_predictions_owner_idx on crown_predictions (site, token, round);

create table if not exists crown_scores (
  site text not null check (site in ('founders', 'culture', 'bidception')),
  token text not null,
  handle text not null,
  points integer not null default 0,
  wins integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (site, token)
);

create index if not exists crown_scores_rank_idx on crown_scores (site, points desc, wins desc, streak desc);

create table if not exists crown_passes (
  id text primary key,
  site text not null check (site in ('founders', 'culture', 'bidception')),
  token text not null,
  handle text not null,
  order_id text not null unique,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists crown_passes_lookup_idx on crown_passes (site, token);

-- Oracle Pass orders join the same single payment rail as bids and swaps.
alter table orders drop constraint if exists orders_kind_check;
alter table orders add constraint orders_kind_check
  check (kind in ('bid', 'swap', 'oracle'));
