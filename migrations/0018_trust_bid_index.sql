-- RC4: Bid Index trust infrastructure (BI-1.0). STRICTLY ADDITIVE.
--
-- Adds: trust_events (append-only scoring inputs), trust_score_snapshots
-- (cache/audit), trust_score_appeals (fact challenges), trust_risk_flags
-- (suspected risk never lowers a score by itself), verification_cases +
-- verification_events (future verification infrastructure, feature-flagged
-- OFF), structured dispute resolution columns, extra review dimensions
-- (value, fairness), milestone activation timestamps, milestone deadline
-- extensions.
--
-- No prior table is rewritten; historical data (reputation_events, free-text
-- dispute resolutions) stays untouched and in place. BI-1.0 reads the new
-- versioned trust layer only.

-- ---------------------------------------------------------------------------
-- trust_events: the append-only, idempotently keyed scoring input layer.
-- Append-only: no UPDATE/DELETE path exists in application code; corrections
-- are new REVERSAL events pointing at the value they undo. The UNIQUE key on
-- (source_type, source_id, user_id, role, event_kind) makes projection
-- idempotent — the same authoritative fact can never register twice.
-- ---------------------------------------------------------------------------
create table if not exists trust_events (
  id text primary key,                          -- 'tev_'
  user_id text not null references users(id),
  role text not null check (role in ('PROVIDER','SPONSOR','CAPTAIN')),
  product text not null check (product in ('foundersbid','culturebid','bidception','bidthrone')),
  work_type text not null check (work_type in ('BOUNTY','PROJECT','PARENT_WORK')),
  work_id text not null,
  counterparty_user_id text references users(id),
  event_kind text not null check (event_kind in (
    'CLEAN_COMPLETION',
    'ATTRIBUTABLE_CANCELLATION',
    'ABANDONMENT_OR_NONPERFORMANCE',
    'PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK',
    'FRAUD_OR_COLLUSION_CONFIRMED',
    'REVERSAL')),
  outcome_value numeric,
  severity_code text not null default 'NORMAL'
    check (severity_code in ('NORMAL','ATTRIBUTABLE_CANCELLATION',
      'ABANDONMENT_OR_NONPERFORMANCE','PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK',
      'FRAUD_OR_COLLUSION_CONFIRMED')),
  amount_minor bigint check (amount_minor is null or amount_minor >= 0),
  currency char(3),
  normalized_base_amount_minor bigint
    check (normalized_base_amount_minor is null or normalized_base_amount_minor >= 0),
  base_currency char(3),
  complexity_raw numeric,
  complexity_version text,
  source_type text not null,
  source_id text not null,
  occurred_at timestamptz not null,
  reverses_event_id text references trust_events(id),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_type, source_id, user_id, role, event_kind)
);
create index if not exists trust_events_user_role_idx on trust_events (user_id, role, occurred_at);
create index if not exists trust_events_work_idx on trust_events (work_type, work_id);
create index if not exists trust_events_source_idx on trust_events (source_type, source_id);
create index if not exists trust_events_counterparty_idx on trust_events (counterparty_user_id);

-- ---------------------------------------------------------------------------
-- trust_score_snapshots: CACHE + AUDIT records, never the authoritative
-- source (scores are recomputable from trust_events alone). No admin UI may
-- write a score directly; invalidation fires on eligibility-relevant changes
-- via the input_hash on read.
-- ---------------------------------------------------------------------------
create table if not exists trust_score_snapshots (
  id text primary key,                          -- 'tss_'
  user_id text not null references users(id),
  role text not null check (role in ('PROVIDER','SPONSOR','CAPTAIN','OVERALL')),
  model_version text not null,
  score integer check (score is null or score between 300 and 900),
  status text not null check (status in ('NR','SCORED','RESTRICTED','UNDER_TRUST_REVIEW')),
  confidence numeric check (confidence is null or confidence between 0 and 1),
  effective_sample_size numeric,
  unique_counterparties integer,
  primary_outcomes integer,
  verified_volume_minor bigint,
  verified_volume_currency char(3),
  pillars jsonb,
  caps jsonb not null default '{}'::jsonb,
  input_hash text not null,
  as_of timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, role, model_version)
);
create index if not exists trust_score_snapshots_stale_idx
  on trust_score_snapshots (user_id, model_version, input_hash);

-- ---------------------------------------------------------------------------
-- trust_score_appeals: a challenge to FACTS, never a direct score write. An
-- upheld appeal results in a REVERSAL/correction trust event and a rebuild.
-- ---------------------------------------------------------------------------
create table if not exists trust_score_appeals (
  id text primary key,                          -- 'tsa_'
  user_id text not null references users(id),
  trust_event_id text references trust_events(id),
  snapshot_id text references trust_score_snapshots(id),
  reason text not null check (length(reason) between 10 and 4000),
  status text not null default 'OPEN'
    check (status in ('OPEN','UNDER_REVIEW','UPHELD','CORRECTED','REJECTED')),
  admin_notes text not null default '' check (length(admin_notes) <= 4000),
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trust_score_appeals_user_idx on trust_score_appeals (user_id, created_at desc);
create index if not exists trust_score_appeals_open_idx on trust_score_appeals (status, created_at);

-- ---------------------------------------------------------------------------
-- trust_risk_flags: INTERNAL signals only. SUSPECTED flags must never lower
-- a Bid Index by themselves (false positives must not become punishment).
-- Only CONFIRMED misconduct may become an adjudicated trust event.
-- ---------------------------------------------------------------------------
create table if not exists trust_risk_flags (
  id text primary key,                          -- 'trf_'
  user_id text not null references users(id),
  kind text not null check (kind in (
    'REPEATED_COUNTERPARTY_CONCENTRATION','RELATED_PARTY_ACTIVITY',
    'POSSIBLE_REVIEW_RING','ABNORMAL_TRANSACTION_LOOP','HIGH_VALUE_NEW_ACCOUNT',
    'CHARGEBACK_PATTERN','POSSIBLE_MULTI_ACCOUNT','IDENTITY_MISMATCH',
    'COLLUSION_SUSPECTED')),
  status text not null default 'OPEN' check (status in ('OPEN','CLEARED','CONFIRMED')),
  source text not null default 'system',
  evidence_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);
create index if not exists trust_risk_flags_user_idx on trust_risk_flags (user_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- verification_cases / verification_events: future verified-founder /
-- verified-provider infrastructure. TRUST_VERIFICATION_LIVE=0 in this
-- release: no purchase flow, no provider integration, zero Bid Index effect.
-- Identity documents are NEVER stored here (no scans, no images) — the table
-- holds provider references and results only.
-- ---------------------------------------------------------------------------
create table if not exists verification_cases (
  id text primary key,                          -- 'vfc_'
  user_id text not null references users(id),
  scope text not null check (scope in ('PERSONAL','BUSINESS')),
  check_type text not null check (check_type in (
    'EMAIL','PHONE','GOVERNMENT_ID','BUSINESS_REGISTRATION',
    'BUSINESS_DOMAIN_CONTROL','PAYOUT_ACCOUNT_MATCH','TAX_REGISTRATION',
    'SOCIAL_ACCOUNT_OWNERSHIP')),
  provider text,
  provider_case_ref text,
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED','AWAITING_PAYMENT','PENDING','VERIFIED',
      'REJECTED','EXPIRED','REVOKED')),
  fee_minor bigint check (fee_minor is null or fee_minor >= 0),
  currency char(3),
  payment_status text not null default 'UNPAID'
    check (payment_status in ('UNPAID','PAID','REFUNDED')),
  requested_at timestamptz not null default now(),
  verified_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists verification_cases_user_idx on verification_cases (user_id, check_type, created_at desc);
create index if not exists verification_cases_status_idx on verification_cases (status, expires_at);

create table if not exists verification_events (
  id text primary key,                          -- 'vfe_'
  case_id text not null references verification_cases(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor text not null default 'system' check (actor in ('system','admin','user','provider')),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists verification_events_case_idx on verification_events (case_id, created_at);

-- ---------------------------------------------------------------------------
-- Disputes: structured adjudication (additive; free-text resolution stays).
-- OPEN / UNDER_REVIEW have ZERO score effect; only finalized_at being set
-- (a final adjudication) creates scoring evidence, and responsibility is a
-- CTRL field the admin sets — never inferred from claimant vs respondent.
-- ---------------------------------------------------------------------------
alter table disputes add column if not exists resolution_code text
  check (resolution_code is null or resolution_code in (
    'NO_FAULT','PROVIDER_AT_FAULT','SPONSOR_AT_FAULT','CAPTAIN_AT_FAULT',
    'SHARED_FAULT','PLATFORM_OR_PROVIDER_FAULT','FRAUD_CONFIRMED',
    'COLLUSION_CONFIRMED','ABUSIVE_CHARGEBACK_CONFIRMED','OTHER_NO_SCORE_EFFECT'));
alter table disputes add column if not exists responsibility text
  check (responsibility is null or responsibility in ('PROVIDER','SPONSOR','CAPTAIN','SHARED','NOBODY','PLATFORM'));
alter table disputes add column if not exists severity_code text
  check (severity_code is null or severity_code in ('NORMAL','ATTRIBUTABLE_CANCELLATION',
    'ABANDONMENT_OR_NONPERFORMANCE','PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK','FRAUD_OR_COLLUSION_CONFIRMED'));
alter table disputes add column if not exists finalized_at timestamptz;

-- ---------------------------------------------------------------------------
-- Reviews: extra nullable dimensions (missing is NOT zero), RC4 §42.
-- ---------------------------------------------------------------------------
alter table reviews add column if not exists value integer check (value between 1 and 5);
alter table reviews add column if not exists fairness integer check (fairness between 1 and 5);

-- ---------------------------------------------------------------------------
-- Milestones: authoritative activation timestamp (BI-1.0 timeliness needs a
-- measured planned window) and append-only approved deadline extensions.
-- An approved extension BEFORE breach resets the effective due date and is
-- neutral in the model.
-- ---------------------------------------------------------------------------
alter table project_milestones add column if not exists active_at timestamptz;

create table if not exists project_milestone_extensions (
  id text primary key,                          -- 'mex_'
  milestone_id text not null references project_milestones(id) on delete cascade,
  previous_due_at timestamptz not null,
  new_due_at timestamptz not null,
  approved_by text not null,
  reason text not null default '' check (length(reason) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists project_milestone_extensions_milestone_idx
  on project_milestone_extensions (milestone_id, created_at);