# PHASE_04_BIDTHRONE.md — Bidthrone reputation & discovery layer

**Status:** ACTIVE (specified 2026-08-27, autonomous execution authorized).
**Principle:** Bidthrone is the network-level reputation and discovery layer. It is NOT a paid leaderboard. Reputation is derived only from genuine verified marketplace events. No fake people, no seeding, no pay-to-rank — ever.

## Objective

`bidthrone.lol` becomes the cross-network reputation and discovery surface:
- public per-member profiles showing verified marketplace outcomes,
- interpretable reputation dimensions (not one opaque magic number),
- leaderboards derived ONLY from real production data with meaningful empty/new-network states,
- Market Rates (aggregate pricing benchmarks; renamed from "Bid Index" in RC4) — architecture exists, but pages publish only when the underlying sample is sufficient. **Bid Index now means the personal trust score (RC4 §3).**

## User roles

| Role | Powers |
|---|---|
| visitor | browse public profiles, leaderboards, (gated) Market Rates |
| member | view their own profile/reputation, set privacy controls |
| admin | as shared (moderation) |

Reputation cannot be purchased; no payment path writes into it.

## Functional requirements

- **FR-1 Public profile** (`/profile/:handle` on bidthrone host): identity, specialties, network roles, verified completion count, bounty wins, project completions, captain completions, creator wins, sponsor/provider reviews, repeat counterparties, total earnings ONLY if the member opts in, badges from verified facts, portfolio. Honesty: numbers are derived from the ledger/awards/reviews; a member with no verified outcomes shows an empty (not fabricated) profile.
- **FR-2 Interpretable reputation** (avoid one opaque number): dimensions = Reliability, Quality (avg rating), Experience (completed work count), Recent activity. If a composite score is shown, its formula is documented and public. No payment/featured placement can alter it.
- **FR-3 Leaderboards**: Top Builders, Top Creators, Top Captains, Rising, Most Reliable, Most Wins, Most Completed, Top Sponsors — derived from genuine production data ONLY. If sample size is below a documented threshold, show a meaningful "new network / not enough data yet" state. Never seed fake people.
- **FR-4 Market Rates (gated; renamed from "Bid Index" in RC4)**: aggregate pricing pages (FoundersBid landing-page quote ranges, automation/design prices, CultureBid UGC ranges, Bidception captain-fee ranges, cross-network category trends). Rules: anonymize, aggregate, publish sample size + methodology, suppress tiny samples, never expose private deal details, do NOT publish a benchmark without enough data. SEO pages indexable only when the sample threshold is met (noindex below it).
- **FR-5 Privacy controls**: per-member opt-out of earnings display; the profile respects it. (Account-level global opt-out is an extension.)
- **FR-6 Repeat counterparties**: derived from shared sponsor↔provider history across completed work.

## Routes (bidthrone host)

`/` (Bidthrone home: what the network is, top reputation, link to leaderboards) · `/@:handle` or reuse `/profile/:handle` (public profile with network reputation) · `/leaderboards` · `/bid-index` (gated; noindex + empty state until data).

## Data model

**No new migration in this release.** Reputation is computed on the fly from the authoritative tables already present (bounty_awards, projects, project_milestones, reviews, disputes, money_events, reputation_events) so it is always derived from genuine events — never a stale stored number. A `reputation_snapshots` denormalized read model (user_id, computed_at, metrics) is a documented extension point for later when leaderboards need sub-ms reads at scale; it is NOT built here.

## State machines / payments

No new money flows. Reads only. Any "earnings" figure is the sum of PAYOUT_SETTLED/REWARD events the member actually received (and shown only when opted in).

## Security

- Public profile reads no PII; earnings hidden unless opted in.
- Leaderboard queries are aggregate-only (no deal-level detail exposed).
- Market Rates suppresses samples below threshold server-side (never client-trusted).

## Analytics

`bidthrone_profile_viewed`, `leaderboard_viewed`, `bid_index_viewed` — internal only.

## Out of scope

The Sovereign/AI-ruler `/live` entertainment experiment (only after all core Bidthrone is stable, with strict controls — NOT part of this release). Real-time cross-domain SSO (cookies are per-domain; a shared login flow is a later concern).

## Acceptance criteria

| # | Criterion | Check |
|---|---|---|
| AC-1 | public profile shows verified outcomes; a member with none shows an honest empty state (no fabricated numbers) | integration |
| AC-2 | reputation dimensions computed from the ledger/awards/reviews; composite formula documented | unit |
| AC-3 | leaderboards rank only real data; below the sample threshold they show an empty/new-network state (never fake rows) | integration |
| AC-4 | Bid Index suppresses tiny samples (no benchmark page under threshold); methodology + sample size disclosed | integration |
| AC-5 | earnings hidden by default; shown only when the member opts in | integration |
| AC-6 | full gates green; /leaderboards + /bid-index live on bidthrone.lol | CI + curl |