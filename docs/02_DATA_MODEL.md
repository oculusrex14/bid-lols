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
