-- Phase 01 (WS4/WS5): FoundersBid marketplace core — bounties (Mode A) and
-- projects (Mode B). STRICTLY ADDITIVE. Statuses are CHECK-constrained text
-- with state machines owned by src/lib/marketplace/state.ts; money columns
-- are integer minor units with an explicit ISO currency.

-- ---------------------------------------------------------------------------
-- Bounties (Mode A): funded, bounded competitive work.
-- ---------------------------------------------------------------------------
create table if not exists bounties (
  id text primary key,                          -- 'bnt_'
  product text not null check (product in ('foundersbid','culturebid','bidception','bidthrone')),
  sponsor_user_id text not null references users(id),
  title text not null check (length(title) between 8 and 140),
  slug text not null unique,                    -- short url-safe form of the title
  description text not null check (length(description) between 20 and 20000),
  category text not null check (length(category) between 2 and 40),
  skills jsonb not null default '[]'::jsonb,    -- free-form tags, capped by zod
  deliverables text not null default '',
  acceptance_criteria text not null default '',
  -- Money: advertised reward pool; fee charged to sponsor ON TOP (money.ts).
  reward_total_minor bigint not null check (reward_total_minor > 0),
  currency char(3) not null default 'INR',
  reward_structure text not null
    check (reward_structure in ('WINNER_TAKES_ALL','PODIUM','FINALIST_POOL')),
  reward_allocations jsonb not null,            -- [{place, amount_minor, label?}]
  application_deadline timestamptz,
  submission_deadline timestamptz not null,
  participant_cap integer not null default 10 check (participant_cap between 1 and 200),
  qualification_mode text not null default 'SPONSOR_APPROVAL'
    check (qualification_mode in ('APPLICATION_ONLY','SPONSOR_APPROVAL')),
  ip_and_confidentiality text not null default '',
  allowed_attachments text not null default 'links',
  status text not null default 'DRAFT'
    check (status in ('DRAFT','AWAITING_FUNDING','OPEN','APPLICATION_CLOSED',
      'SUBMISSION','JUDGING','AWARDED','SETTLING','COMPLETED',
      'CANCELLED','EXPIRED','DISPUTED')),
  funding_payment_id text references payments(id),  -- set when funding verified
  awarded_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text,
  cancel_reason text,
  expired_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bounties_product_status_idx on bounties (product, status, created_at desc);
create index if not exists bounties_sponsor_idx on bounties (sponsor_user_id, created_at desc);
create index if not exists bounties_deadline_idx on bounties (status, submission_deadline);

-- ---------------------------------------------------------------------------
-- Bounty applications: bounded entry (cap + qualification).
-- ---------------------------------------------------------------------------
create table if not exists bounty_applications (
  id text primary key,                          -- 'app_'
  bounty_id text not null references bounties(id) on delete cascade,
  user_id text not null references users(id),
  message text not null default '' check (length(message) <= 4000),
  status text not null default 'PENDING'
    check (status in ('PENDING','APPROVED','REJECTED','WITHDRAWN')),
  decided_at timestamptz,
  decided_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bounty_id, user_id),
  -- a sponsor can never apply to their own listing
  check (user_id <> (select sponsor_user_id from bounties b where b.id = bounty_id))
);
create index if not exists bounty_applications_bounty_idx on bounty_applications (bounty_id, status, created_at);
create index if not exists bounty_applications_user_idx on bounty_applications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Bounty participants: approved entrants (separate lifecycle from applications).
-- ---------------------------------------------------------------------------
create table if not exists bounty_participants (
  id text primary key,                          -- 'par_'
  bounty_id text not null references bounties(id) on delete cascade,
  user_id text not null references users(id),
  status text not null default 'APPROVED'
    check (status in ('APPROVED','WORK_STARTED','SUBMITTED','WITHDRAWN','DISQUALIFIED')),
  work_started_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bounty_id, user_id)
);
create index if not exists bounty_participants_bounty_idx on bounty_participants (bounty_id, status);

-- ---------------------------------------------------------------------------
-- Bounty submissions (one per participant per bounty; editable pre-deadline).
-- ---------------------------------------------------------------------------
create table if not exists bounty_submissions (
  id text primary key,                          -- 'sub_'
  bounty_id text not null references bounties(id) on delete cascade,
  participant_id text not null references bounty_participants(id) on delete cascade,
  user_id text not null references users(id),
  title text not null check (length(title) between 3 and 140),
  body text not null default '' check (length(body) <= 50000),
  links jsonb not null default '[]'::jsonb,     -- https-only external URLs
  status text not null default 'SUBMITTED'
    check (status in ('SUBMITTED','UNDER_REVIEW','FINALIST','WINNER','NOT_SELECTED')),
  place integer,                                -- set when judged (1 = winner)
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bounty_id, user_id)
);
create index if not exists bounty_submissions_bounty_idx on bounty_submissions (bounty_id, status);

-- ---------------------------------------------------------------------------
-- Bounty awards: judged winners and their payout obligations.
-- ---------------------------------------------------------------------------
create table if not exists bounty_awards (
  id text primary key,                          -- 'awd_'
  bounty_id text not null references bounties(id) on delete cascade,
  user_id text not null references users(id),
  place integer not null check (place >= 1),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'INR',
  status text not null default 'PENDING'
    check (status in ('PENDING','OBLIGATION_CREATED','SETTLED','CANCELLED')),
  payout_obligation_id text,                    -- set when obligation created (0014)
  awarded_by text,                              -- user id or 'admin:<id>'/'system'
  awarded_at timestamptz not null default now(),
  unique (bounty_id, place),
  unique (bounty_id, user_id)
);
create index if not exists bounty_awards_user_idx on bounty_awards (user_id, awarded_at desc);

-- ---------------------------------------------------------------------------
-- Projects (Mode B): proposals -> one provider -> milestones.
-- ---------------------------------------------------------------------------
create table if not exists projects (
  id text primary key,                          -- 'prj_'
  product text not null check (product in ('foundersbid','culturebid','bidception','bidthrone')),
  sponsor_user_id text not null references users(id),
  title text not null check (length(title) between 8 and 140),
  slug text not null unique,
  description text not null check (length(description) between 20 and 30000),
  category text not null check (length(category) between 2 and 40),
  skills jsonb not null default '[]'::jsonb,
  budget_min_minor bigint,
  budget_max_minor bigint,
  currency char(3) not null default 'INR',
  proposal_deadline timestamptz,
  selected_quoted_minor bigint,                 -- set when a proposal is selected
  selected_proposal_id text,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','OPEN_FOR_PROPOSALS','PROPOSAL_SELECTED','AWAITING_FUNDING',
      'ACTIVE','MILESTONE_REVIEW','COMPLETION_REVIEW','COMPLETED','CANCELLED','DISPUTED')),
  funding_payment_id text,
  ip_and_confidentiality text not null default '',
  published_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_product_status_idx on projects (product, status, created_at desc);
create index if not exists projects_sponsor_idx on projects (sponsor_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Project proposals (pre-work only: approach/quote/milestones — never the
-- deliverable itself; product rule: do not encourage unpaid completed work).
-- ---------------------------------------------------------------------------
create table if not exists project_proposals (
  id text primary key,                          -- 'prp_'
  project_id text not null references projects(id) on delete cascade,
  provider_user_id text not null references users(id),
  approach text not null check (length(approach) between 20 and 8000),
  experience text not null default '' check (length(experience) <= 4000),
  evidence_links jsonb not null default '[]'::jsonb,
  quoted_minor bigint not null check (quoted_minor > 0),
  currency char(3) not null default 'INR',
  timeline_weeks integer check (timeline_weeks between 1 and 52),
  milestones_proposed jsonb not null default '[]'::jsonb,
  notes text not null default '' check (length(notes) <= 4000),
  status text not null default 'SUBMITTED'
    check (status in ('SUBMITTED','SHORTLISTED','SELECTED','REJECTED','WITHDRAWN')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, provider_user_id),
  check (provider_user_id <> (select sponsor_user_id from projects p where p.id = project_id))
);
create index if not exists project_proposals_project_idx on project_proposals (project_id, status);

-- ---------------------------------------------------------------------------
-- Project milestones (state modeled separately from the project).
-- ---------------------------------------------------------------------------
create table if not exists project_milestones (
  id text primary key,                          -- 'mst_'
  project_id text not null references projects(id) on delete cascade,
  seq integer not null check (seq >= 1),
  title text not null check (length(title) between 3 and 140),
  description text not null default '' check (length(description) <= 8000),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'INR',
  due_at timestamptz,
  status text not null default 'PENDING'
    check (status in ('PENDING','ACTIVE','SUBMITTED_FOR_REVIEW','APPROVED','REJECTED','PAID_OUT')),
  submitted_at timestamptz,
  decided_at timestamptz,
  feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, seq)
);
create index if not exists project_milestones_project_idx on project_milestones (project_id, seq);