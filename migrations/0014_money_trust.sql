-- Phase 01 (WS3/WS7/WS8): money decomposition, payout obligations, reviews,
-- disputes, notifications, reports, marketplace analytics, reputation seeds.
-- STRICTLY ADDITIVE. money_events is append-only (no updates/deletes ever).

-- ---------------------------------------------------------------------------
-- money_events: the append-only decomposition of every money-state
-- transition. sponsor charge == sum of its decomposition rows, always.
-- ---------------------------------------------------------------------------
create table if not exists money_events (
  id text primary key,                          -- 'mev_'
  entity_type text not null
    check (entity_type in ('BOUNTY','PROJECT','MILESTONE','AWARD','PAYOUT','REFUND')),
  entity_id text not null,
  type text not null
    check (type in ('REWARD','PLATFORM_FEE','TAX','PROCESSING','REFUND',
      'PAYOUT_OBLIGATION','PAYOUT_SETTLED')),
  amount_minor bigint not null,                 -- negative allowed for REFUND direction
  currency char(3) not null default 'INR',
  provider text not null default 'cashfree',
  provider_ref text,                            -- immutable once set
  payment_id text references payments(id),
  actor_user_id text references users(id),      -- null for system/provider events
  system text not null default 'system'
    check (system in ('system','provider','admin')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists money_events_entity_idx on money_events (entity_type, entity_id, created_at desc);
create index if not exists money_events_payment_idx on money_events (payment_id);

-- ---------------------------------------------------------------------------
-- payout_obligations: money the platform OWES a winner/provider. Created at
-- award/milestone approval; settled ONLY by a real payout rail. A pending
-- obligation is a public, honest liability — never a fabricated payment.
-- ---------------------------------------------------------------------------
create table if not exists payout_obligations (
  id text primary key,                          -- 'pob_'
  award_id text references bounty_awards(id),
  milestone_id text references project_milestones(id),
  payee_user_id text not null references users(id),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'INR',
  status text not null default 'PENDING'
    check (status in ('PENDING','SETTLED','FAILED','CANCELLED')),
  provider text,
  provider_payout_ref text unique,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  -- an obligation belongs to exactly one source (award or milestone)
  check ((award_id is null) <> (milestone_id is null))
);
create index if not exists payout_obligations_payee_idx on payout_obligations (payee_user_id, status, created_at desc);
create index if not exists payout_obligations_status_idx on payout_obligations (status, created_at);

-- ---------------------------------------------------------------------------
-- Reviews: post-completion only, both directions, structured dimensions.
-- ---------------------------------------------------------------------------
create table if not exists reviews (
  id text primary key,                          -- 'rev_'
  work_type text not null check (work_type in ('BOUNTY','PROJECT')),
  work_id text not null,
  reviewer_user_id text not null references users(id),
  reviewee_user_id text not null references users(id),
  direction text not null check (direction in ('SPONSOR_TO_PROVIDER','PROVIDER_TO_SPONSOR')),
  quality integer check (quality between 1 and 5),
  communication integer check (communication between 1 and 5),
  timeliness integer check (timeliness between 1 and 5),
  clarity integer check (clarity between 1 and 5),
  body text not null default '' check (length(body) <= 4000),
  created_at timestamptz not null default now(),
  unique (work_type, work_id, reviewer_user_id),
  check (reviewer_user_id <> reviewee_user_id)
);
create index if not exists reviews_reviewee_idx on reviews (reviewee_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Disputes: manual workflow (no AI adjudication). Admin resolutions audited.
-- ---------------------------------------------------------------------------
create table if not exists disputes (
  id text primary key,                          -- 'dsp_'
  work_type text not null check (work_type in ('BOUNTY','PROJECT')),
  work_id text not null,
  claimant_user_id text not null references users(id),
  respondent_user_id text not null references users(id),
  reason text not null check (length(reason) between 10 and 4000),
  evidence_links jsonb not null default '[]'::jsonb,
  disputed_amount_minor bigint,
  currency char(3) not null default 'INR',
  status text not null default 'OPEN'
    check (status in ('OPEN','UNDER_REVIEW','RESOLVED','CLOSED')),
  resolution text,
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists disputes_status_idx on disputes (status, created_at);
create index if not exists disputes_work_idx on disputes (work_type, work_id);

-- ---------------------------------------------------------------------------
-- notifications: in-app is authoritative; email is adapter-gated (mail.ts).
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id text primary key,                          -- 'ntf_'
  user_id text not null references users(id) on delete cascade,
  type text not null,
  title text not null check (length(title) <= 200),
  body text not null default '' check (length(body) <= 1000),
  entity_type text,
  entity_id text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on notifications (user_id, created_at desc)
  where read_at is null;

-- ---------------------------------------------------------------------------
-- reports: user-facing content reports (admin queue).
-- ---------------------------------------------------------------------------
create table if not exists reports (
  id text primary key,                          -- 'rpt_'
  reporter_user_id text not null references users(id),
  entity_type text not null,
  entity_id text not null,
  reason text not null check (length(reason) between 4 and 2000),
  status text not null default 'OPEN'
    check (status in ('OPEN','REVIEWED','ACTIONED','DISMISSED')),
  handled_by text,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on reports (status, created_at);

-- ---------------------------------------------------------------------------
-- marketplace_events: first-party, structured, internal-only analytics
-- (no public exposure until integrity semantics are specified — 00.6 rule).
-- ---------------------------------------------------------------------------
create table if not exists marketplace_events (
  id text primary key,                          -- 'mke_'
  name text not null,
  actor_user_id text references users(id),
  entity_type text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists marketplace_events_name_idx on marketplace_events (name, created_at desc);
create index if not exists marketplace_events_entity_idx on marketplace_events (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reputation_events: append-only verified-outcome feed (Phase 04 consumes).
-- Written ONLY by verified marketplace transitions — no other writes exist.
-- ---------------------------------------------------------------------------
create table if not exists reputation_events (
  id text primary key,                          -- 'rep_'
  user_id text not null references users(id),
  kind text not null,
  work_type text,
  work_id text,
  counterparty_user_id text references users(id),
  weight numeric not null default 1,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists reputation_events_user_idx on reputation_events (user_id, created_at desc);