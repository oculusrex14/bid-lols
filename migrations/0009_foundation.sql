-- Phase 00 foundation: identity, audit, and payments tables + truthful-analytics
-- support. STRICTLY ADDITIVE — no legacy rows or columns are altered, dropped,
-- or deleted (AC-3). The legacy boards (listings/orders/activity/crown_*)
-- remain untouched as read-only payment history.

-- ---------------------------------------------------------------------------
-- Analytics (W2): outbound clicks get their own counter, represented
-- independently of views/visits, and site_stats learns the new product keys
-- (legacy keys stay valid for historical rows).
-- ---------------------------------------------------------------------------
alter table site_stats add column if not exists clicks bigint not null default 0;

do $$
begin
  -- Re-add the widened constraint; dropping the narrow one is data-safe.
  alter table site_stats drop constraint if exists site_stats_site_check;
  alter table site_stats add constraint site_stats_site_check
    check (site in (
      'founders', 'culture', 'bidception', -- legacy rows
      'foundersbid', 'culturebid', 'bidthrone' -- product keys (bidception unchanged)
    ));
end $$;

-- ---------------------------------------------------------------------------
-- Identity foundation (Phase 01+ builds the auth UI on top of these; the
-- Better Auth schema under migrations/auth/ is archived and never applied).
-- Shape-compatible with Better Auth's "user"/"session" tables so the provider
-- decision stays reversible.
-- ---------------------------------------------------------------------------
create table if not exists users (
  id text primary key,             -- 'usr_' + 12-byte hex
  email text not null unique,
  display_name text,
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token text not null unique,      -- 192-bit hex (makeToken)
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions (user_id, created_at desc);

-- One public-facing row per user, for the bidthrone discovery surface.
create table if not exists profiles (
  user_id text not null primary key references users(id),
  bio text not null default '',
  links jsonb not null default '[]'::jsonb,
  primary_domain text,             -- which product surface it is shown on
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only audit trail (all products; every money action writes a row).
create table if not exists audit_events (
  id text primary key,             -- 'aev_' + 12-byte hex
  actor_user_id text references users(id),  -- null for system/provider events
  action text not null,
  entity_type text not null,
  entity_id text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_entity_idx on audit_events (entity_type, entity_id, created_at desc);

-- New payment ledger. Legacy `orders` is preserved as read-only history;
-- this table starts the new ledger with the canonical status set.
create table if not exists payments (
  id text primary key,             -- 'pmt_' + 12-byte hex
  user_id text not null references users(id),
  product text not null check (product in ('foundersbid', 'culturebid', 'bidception', 'bidthrone')),
  kind text not null,              -- funding / fee / subscription / refund — extend as phases need
  amount_cents integer not null check (amount_cents > 0),
  currency char(3) not null default 'INR',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired', 'refunded', 'disputed')),
  provider text not null default 'cashfree',
  provider_order_id text unique,
  idempotency_key text unique,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_status_idx on payments (status, created_at);
