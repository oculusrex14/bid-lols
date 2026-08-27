-- Phase 01B (WS-G): FoundersBid Startup Graveyard — listings + offers.
-- STRICTLY ADDITIVE. The platform takes NO money here until a safe
-- transaction rail exists (04_PAYMENTS_AND_TRUST + docs/ops/PAYOUTS.md);
-- an accepted offer is a recorded commitment, never a payment status.

create table if not exists graveyard_listings (
  id text primary key,                          -- 'gyl_'
  product text not null check (product in ('foundersbid','culturebid','bidception','bidthrone')),
  seller_user_id text not null references users(id),
  title text not null check (length(title) between 8 and 140),
  slug text not null unique,
  description text not null check (length(description) between 20 and 20000),
  reason_of_death text not null default '' check (length(reason_of_death) <= 2000),
  includes jsonb not null default '[]'::jsonb,  -- included asset kinds (strings)
  technology jsonb not null default '[]'::jsonb,
  screenshots jsonb not null default '[]'::jsonb,  -- https-only external URLs
  liabilities text not null default '' check (length(liabilities) <= 4000),
  history_self_reported text not null default '' check (length(history_self_reported) <= 4000),
  transfer_checklist jsonb not null default '[]'::jsonb,  -- checklist items (strings)
  asking_price_minor bigint,
  reserve_minor bigint,
  currency char(3) not null default 'INR',
  status text not null default 'DRAFT'
    check (status in ('DRAFT','LISTED','UNDER_OFFER','TRANSFERRED','WITHDRAWN')),
  transferred_at timestamptz,
  withdrawn_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists graveyard_listings_status_idx on graveyard_listings (product, status, created_at desc);
create index if not exists graveyard_listings_seller_idx on graveyard_listings (seller_user_id, created_at desc);

create table if not exists graveyard_offers (
  id text primary key,                          -- 'gyo_'
  listing_id text not null references graveyard_listings(id) on delete cascade,
  buyer_user_id text not null references users(id),
  amount_minor bigint not null check (amount_minor > 0),
  message text not null default '' check (length(message) <= 2000),
  status text not null default 'PENDING'
    check (status in ('PENDING','ACCEPTED','REJECTED','WITHDRAWN')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (listing_id, buyer_user_id)
  -- self-offer prevention enforced in the service layer (no subquery CHECKs).
);
create index if not exists graveyard_offers_listing_idx on graveyard_offers (listing_id, status, created_at);