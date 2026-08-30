# 02_DATA_MODEL.md — Target Data Model & Migration Direction

**Status:** Target shared data model for the Bid Network pivot. Grounded in inspection of `migrations/0002–0008` (applied in prod) and `migrations/auth/0001_auth.sql` (never applied — non-recursive glob). No schema changes yet; Phase 00 execution will author `0009_*.sql` and later files.

## ID & Schema Conventions

- **IDs** — `text` primary keys via the existing `makeId(prefix)` generator (`src/lib/ids.ts`): lowercase prefix + `_` + 24 hex (96 bits random). Prefixes already in use: `lst_`, `ord_`, `act_`, `crn_`, `pass_`. Register one prefix per new table (e.g. `usr_`, `prf_`, `pmt_`, `aev_`). No UUIDs — matches the TEXT-id shape of the Better Auth scaffold and keeps ids URL-safe.
- **Timestamps** — `timestamptz not null default now()`, always UTC. `created_at` on every table; `updated_at` where mutable (application-maintained, as in `crown_scores`).
- **Money** — integer minor currency units only (`amount_cents`, never floats — the existing `orders.amount_cents` / `listings.bid_cents` pattern), plus an explicit `currency char(3)` ISO-4217 column. India-first: default `'INR'`; globally extensible. Legacy rows stay USD-cents semantics, read-only, never reinterpreted.
- **Provider references** — immutable: `provider text not null default 'cashfree'` + `provider_order_id text` set once at creation, `unique` (provider-unique), never updated afterward.
- **Idempotency** — `idempotency_key text unique` (nullable) on client-initiated money actions; webhook-driven actions derive it from the provider event id.
- **Statuses** — explicit `text` columns with CHECK constraints and a documented state machine per table (the existing `orders.status in ('pending','paid','failed','expired')` pattern); no state encoded via nulls.
- **Foreign keys** — enforced for all new logical relationships. Legacy `orders.listing_id` and `crown_passes.order_id` are dangling text — do not imitate.
- **Unique constraints** — natural-key uniqueness (`users.email`; `(provider, provider_order_id)`), plus composite natural keys where already proven (e.g. legacy `unique (site, round, token, listing_id)`).
- **Indexes** — per access pattern: append-only tables on `(created_at desc)`; money tables on `(status, created_at)`.
- **Soft delete** — no global soft-delete convention. Per-entity status-based archiving only where justified (e.g. sponsor-archived bounties later); Phase 00 core tables: none.
- **Monetary auditability** — every money action writes a ledger row (`payments`, later `transactions`) plus an `audit_events` row; every state transition is timestamped (existing `paid_at` pattern).

## Phase 00 — Foundation Tables (smallest useful)

**No marketplace tables in Phase 00.** Bounties/projects/participants/awards and friends are deferred to Phase 01. The smallest useful foundation:

1. **`users`** — identity core. `id usr_` PK; `email text not null unique`; `display_name text`; `status text check ('active','suspended','deleted') default 'active'`; `created_at`, `updated_at`. Shape-compatible with the Better Auth `"user"` table so the provider decision stays reversible.
2. **`sessions`** — auth material. `id` PK; `user_id text not null references users(id) on delete cascade`; `token text not null unique`; `expires_at`; `created_at`. Mirrors the Better Auth `"session"` shape. No organization/team structures yet (see Future).
3. **`profiles`** — one public-facing row per user, for the bidthrone discovery surface. `user_id text not null primary key references users(id)`; `bio text not null default ''`; `links jsonb not null default '[]'`; `primary_domain text` (which product surface it is shown on); `created_at`, `updated_at`.
4. **`audit_events`** — append-only, all products. `id aev_` PK; `actor_user_id text references users(id)` (nullable for system/provider events); `action text not null`; `entity_type text not null`; `entity_id text not null`; `meta jsonb not null default '{}'`; `created_at`. Insert-only — no updates or deletes. Index `(entity_type, entity_id, created_at desc)`. Carries the ops/admin trail and every money-action audit entry.
5. **`payments`** — the new payment transaction record. The legacy `orders` table is preserved untouched as read-only history; this table starts the new ledger. `id pmt_` PK; `user_id text not null references users(id)`; `product text not null check (product in ('foundersbid','culturebid','bidception','bidthrone'))` (the product/domain context column); `kind text not null` (funding / fee / subscription / refund — extend as phases need); `amount_cents integer not null check (amount_cents > 0)`; `currency char(3) not null default 'INR'`; `status text not null check ('pending','paid','failed','expired','refunded','disputed') default 'pending'` (canonical order states per `04_PAYMENTS_AND_TRUST`); `provider text not null default 'cashfree'`; `provider_order_id text unique`; `idempotency_key text unique`; `meta jsonb not null default '{}'`; `created_at`, `updated_at`, `paid_at timestamptz`. Index `(status, created_at)`.
6. **`site_stats` (TRANSFORMED)** — keep the real counters `views`, `visits`, `visits_today`, `visits_day`, `launched_at`; decommission `hype_factor`/`hype_locked` (stop reading/writing in code; **no physical column drop in Phase 00** — no destructive prod DDL). New product-scoped aggregate rows join this table as each product launches.

**Analytics in Phase 00:** real counters only (transformed `site_stats`). Payment events are audited in `payments` + `audit_events`. Structured marketplace event tables (bounty created, entry submitted, winner selected) land in Phase 01 with the marketplace — not earlier.

## Future Tables (direction only — no full column specs)

**Phase 01 — marketplace (FoundersBid, reused by CultureBid):**

- `bounties` — the funded problem entity: mode (competing bounty vs milestone project), reward, fee, sponsor, status.
- `projects` — milestone-based execution container (or a mode of `bounties` — decide in the Phase 01 spec).
- `applications`, `proposals`, `submissions` — entry, pre-work proposals (project mode), and work submissions (bounty mode / creative entries).
- `participants` — bounty ↔ user join with bounded-entry status (qualified / entered / disqualified).
- `awards` — winner selection plus payout structure (winner-take-all / podium / finalist-pool) and awarded amounts.
- `milestones` — project checkpoints (due date, approval, payment state).
- `reviews` — post-completion reviews/ratings feeding reputation.

**Money & settlement:**

- `transactions` — funds-ledger entries (funding/deposit, hold, split, release) across the bounty lifecycle; double-entry-style.
- `payouts` — payout records to winners: provider payout refs, status, timestamps.
- `disputes` — dispute cases: parties, status, resolution, monetary impact.

**Phase 04 — reputation:**

- `reputation_events` / `reputation_aggregates` — append-only completed-work/outcome feed plus per-user read-model aggregates (wins, completion rate, reliability, ratings). No pay-to-rank input path, by design.

**Phase 03 — Bidception:**

- Nested-bounty relationship: parent/child links on `bounties` plus child fund-flow/allocation records. Advanced accounting — deliberately not designed here.

**Only if required:** `organizations`/`companies` (employer/company plans) — do not assume; add when a phase needs it.

## Migration Mapping — Legacy → Target

| Legacy table | Tag | Disposition |
|---|---|---|
| `listings` | **KEEP** | Read-only legacy. Holds real paid listings; never dropped (audit: pivot is additive). Later: optional export to cold storage, then archive. |
| `orders` | **KEEP** | Real payment-transaction history — the money audit record. The new `payments` table starts a new ledger; legacy rows are not migrated or reinterpreted. |
| `activity` | **ARCHIVE** | Historical board activity; unused by the new product. Retain read-only; may drop after export + retention period. |
| `site_stats` | **TRANSFORM** | Keep the real counters; decommission fabricated `hype_factor`/`hype_locked` — code first, physical column drop later, not in Phase 00. |
| `crown_predictions`, `crown_scores`, `crown_passes` | **ARCHIVE** | Dormant legacy Crown data. Audit permits them to remain in prod; no deletion in Phase 00. |
| `_migrations` | **KEEP** | The migration ledger — the foundation of the migration system itself. |
| `user` / `session` / `account` / `verification` (`auth/0001`, never applied) | **RESOLVED (Phase 00)** | Do not apply: the Grok-coupled Better Auth scaffold is removed, and the new `users`/`sessions` above are the identity foundation. The file is archived with the scaffold. |

**Phase 00 safety rule:** no destructive deletions. No production data is dropped or altered by Phase 00 migrations — every Phase 00 schema change is additive (new tables, new columns). `DROP LATER` candidates (`activity`, the legacy shape of `site_stats`, optionally `crown_*`) are retained read-only until a later phase has exported what it wants.

## RC4: trust layer (migration 0018, strictly additive)

Bid Index trust infrastructure (BI-1.0):

- `trust_events` — append-only scoring inputs, idempotent on
  (source_type, source_id, user_id, role, event_kind); corrections append
  REVERSAL rows (`reverses_event_id`); indexed by user/role/time, work, source.
- `trust_score_snapshots` — per (user, role, model_version) cache/audit
  records fingerprinted by `input_hash`; never authoritative; scores recompute
  from state plus reversals.
- `trust_score_appeals` — fact challenges (OPEN -> UNDER_REVIEW -> UPHELD /
  CORRECTED / REJECTED); a correction goes through reversal trust events only.
- `trust_risk_flags` — internal signals; SUSPECTED states never lower a score
  by themselves; only CONFIRMED misconduct may become adjudicated evidence.
- `verification_cases` / `verification_events` — future verification
  infrastructure behind `TRUST_VERIFICATION_LIVE=0`; identity documents are
  never stored (provider references and results only).
- `disputes` += `resolution_code`, `responsibility`, `severity_code`,
  `finalized_at` (structured adjudication; OPEN/UNDER_REVIEW have zero effect).
- `reviews` += nullable `value`, `fairness` dimensions (missing is not zero).
- `project_milestones` += `active_at` (authoritative activation stamp);
  `project_milestone_extensions` (append-only, approved pre-breach forward
  moves; the latest approved extension is the effective due date).

## RC4.1 (RC5 Gate 1): snapshot equivalence + database append-only (migration 0019, strictly additive)

- `trust_score_snapshots` += `span_days` (integer, >= 0; 0 when fewer than
  two counted outcomes). With 0018's fields this now persists EVERY
  RoleScoreResult field except two derivations: `bRaw` is reconstructed
  from the stored `pillars` through the model-versioned `roleBase()`
  (deterministic; proven by test) and `uncappedScore` through the
  model-versioned `roleScore(bRaw, confidence)` when a cap applied.
  Cold and warm `trustReportFor()` are materially equivalent (RC5 5.1).
- `trust_events` append-only is now enforced at the DATABASE level:
  `trust_events_reject_mutation()` + the `trust_events_append_only`
  BEFORE UPDATE OR DELETE row trigger (PostgreSQL and PGLite both ship
  PL/pgSQL row triggers; verified on PGLite in CI). The application layer
  also carries no UPDATE/DELETE path (the projector inserts only).
  Corrections remain REVERSAL rows. The single documented escape hatch is
  the RC4 41 reproducibility test, which disables the trigger explicitly
  for that one check and re-enables it.

## RC5.1: currency foundation — NO new migration

Every currency column RC5.1 needs already exists (0013: `bounties`,
`bounty_awards`, `projects`, `project_proposals`, `project_milestones`;
0014: `money_events`, `payout_obligations`, `disputes`; 0015:
`graveyard_listings`; 0016: `parent_works`, `child_works`; 0018:
`trust_events.currency` + `normalized_base_amount_minor`/`base_currency`
reserved for a future normalization spec; `verification_cases.currency`):
`char(3) not null default 'INR'` on the work items. RC5.1 changes no DDL.
The contracts:

- **Work currency is persisted and authoritative.** `bounties.currency` /
  `projects.currency` / `parent_works.currency` are set by the sponsor's
  explicit choice at creation (bounty/project) or funding (parent work) —
  validated by `z.enum(["INR","USD"])` at the boundary, never inferred from
  the viewer. Child works materialize in the PARENT's currency; proposals
  quote in the PROJECT's currency; awards, milestones, disputes, money
  events and payouts all carry the work's currency. Once a funded
  obligation exists, no path mutates its currency.
- **Viewer default currency is not data.** `viewer-currency.server.ts`
  resolves IN->INR / else->USD from the trusted Vercel proxy header
  (`x-vercel-ip-country` — the documented ISO country of the requester's
  public IP; RC5.2 correction of RC5.1's first cut, which read
  `x-vercel-sc`, the serving edge's country) in deployed runtimes and from
  the dev-only `DEFAULT_VIEWER_CURRENCY` override otherwise. It feeds
  sample objects, new-form defaults and the Market Rates default partition.
  It is never written to any table and never selects a payment currency.
- **Market Rates are currency-partitioned aggregates.**
  `marketRateFor(product, category, currency, threshold)` filters
  `currency = $requested` in both the bounty and project legs; the
  `MarketRateSample` carries its currency. A ₹50,000 outcome and a $1,000
  outcome can no longer share a sorted array.
- **BI-1.0 is INR-native (frozen model, explicit gate).** Evidence
  outcomes now carry the work currency. Only `currency = 'INR'` amounts
  enter `valueFactor` (INR paise, rupee thresholds); a non-INR outcome
  keeps its factual completion evidence but its economic amount scores at
  the floor factor 0.75. Verified volume sums INR amounts only, so
  `trust_score_snapshots.verified_volume_minor` +
  `verified_volume_currency` ('INR') describe an INR-only statistic by
  contract — cross-currency normalization would require a new model
  version using `normalized_base_amount_minor`/`base_currency`, which does
  not exist yet. The snapshot fingerprint includes outcome currency.
- **trust_events provenance.** The projector persists the TRUE amount and
  the work item's TRUE currency (RC5.1 replaced the old literal `'INR'`
  insert parameter). All existing events were INR work, so historical
  rows are unchanged.
- **Sample objects are currency-keyed constants** in
  `src/lib/sample-content.ts` (INR set and USD set, reconciling sample
  trees in both); they are never database rows.
