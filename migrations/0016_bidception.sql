-- Phase 03 (WS-B): Bidception — parent works, captains, child allocations.
-- STRICTLY ADDITIVE. The budget invariant (allocated + reserved + captain fee
-- ≤ funded budget) is enforced transactionally in the engine with row locking
-- on the parent row — money cannot be created by nesting.

create table if not exists parent_works (
  id text primary key,                          -- 'pwr_'
  product text not null check (product in ('foundersbid','culturebid','bidception','bidthrone')),
  sponsor_user_id text not null references users(id),
  captain_user_id text references users(id),    -- null until selected
  title text not null check (length(title) between 8 and 140),
  slug text not null unique,
  objective text not null check (length(objective) between 20 and 20000),
  funded_budget_minor bigint,
  captain_compensation_minor bigint not null default 0 check (captain_compensation_minor >= 0),
  currency char(3) not null default 'INR',
  status text not null default 'DRAFT'
    check (status in ('DRAFT','AWAITING_FUNDING','FUNDED','ACTIVE','COMPLETING','COMPLETED','CANCELLED','DISPUTED')),
  funding_payment_id text,
  captain_selected_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists parent_works_status_idx on parent_works (product, status, created_at desc);
create index if not exists parent_works_captain_idx on parent_works (captain_user_id);

create table if not exists child_works (
  id text primary key,                          -- 'cwk_'
  parent_work_id text not null references parent_works(id) on delete cascade,
  bounty_id text references bounties(id),
  project_id text references projects(id),
  title text not null check (length(title) between 3 and 140),
  allocated_minor bigint not null check (allocated_minor > 0),
  currency char(3) not null default 'INR',
  state text not null default 'BLOCKED'
    check (state in ('BLOCKED','READY','ACTIVE','COMPLETE','FAILED')),
  depends_on jsonb not null default '[]'::jsonb,   -- child_work ids
  seq integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a child is a budget reservation; it links to AT MOST ONE engine entity
  -- (bounty or project) once materialized. Both null = reserved, unlinked.
  check (bounty_id is null or project_id is null)
);
create index if not exists child_works_parent_idx on child_works (parent_work_id, seq);

-- money_events.entity_type is widened (additively) so parent-work funding
-- settlements are labelled PARENT_WORK rather than borrowing BOUNTY.
alter table money_events drop constraint if exists money_events_entity_type_check;
alter table money_events add constraint money_events_entity_type_check
  check (entity_type in ('BOUNTY','PROJECT','MILESTONE','AWARD','PAYOUT','REFUND','PARENT_WORK'));
