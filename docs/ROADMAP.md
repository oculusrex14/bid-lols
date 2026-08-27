# ROADMAP.md — Phase Ordering

**Status:** High-level phase ordering only. Phases go active one at a time, in order; the active phase gets a spec at `docs/phases/PHASE_*.md` with goal, capabilities, dependencies, and acceptance criteria. Never implement future phases speculatively.

## Phase 00 — Foundation

Clean the legacy product and establish the shared platform foundation.

Key targets (from the legacy audit, PRIORITY):

- Production must fail loudly on a missing/invalid `DATABASE_URL`; PGLite stays a local dev/test aid only.
- Separate the ordinary app build from potentially-mutating prod migrations (dedicated, gated release step).
- Legacy REMOVE/VERIFY items resolved; data posture is additive — never drop `listings`/`orders`.

Spec: `docs/phases/PHASE_00_FOUNDATION.md` — **COMPLETE 2026-08-26** (checklist + evidence in that file; one external exception: the `culturebid.lol` apex DNS A-records, a DNS-provider change out of repo scope).

## Phase 00.5 — Foundation alignment & reproducibility

Corrective phase after the Phase 00 post-deployment review: production was
deployed from a dirty tree with the Phase 00 commits absent from the GitHub
remote, and the public surfaces carried legacy product language / internal
status copy. Restores source-control integrity (release from one clean
pushed SHA), rewrites legal copy to pre-launch truth, ships deliberate
pre-launch product pages + founding-access capture, branded 404 + host-aware
sitemaps, security-header baseline, graceful stale-serverFn handling, and
excludes PGLite from cloud build output. No Phase 01 features.

Spec: `docs/phases/PHASE_00_5_ALIGNMENT.md` — **COMPLETE 2026-08-27**
(release SHA `2a8edf7`, production deployment `bidthrone-4cgj1bqx4` clean +
verified; evidence in that file's Completion notes; one external exception:
the `culturebid.lol` apex DNS, now with an exact correction runbook).

## Phase 01 — FoundersBid

- **Goal:** Startup bounties/projects on `foundersbid.lol`.
- **Core capability:** Bounty mode (competing participants, sponsor selects winner) and Project mode (proposals → chosen provider → milestone-based work); sponsor funding, qualification and bounded entry, payout to winner(s), transparent fees.
- **Dependencies:** Phase 00 foundation; identity/accounts; collect + payout payment rails.
- **Status:** NOT detailed yet.

## Phase 02 — CultureBid

- **Goal:** Creative bounty marketplace on `culturebid.lol`.
- **Core capability:** Creative categories (UGC, memes, video, photography, design, writing, naming, social content, music, brand challenges) with creative submission, delivery, and judging.
- **Dependencies:** Phase 01 bounty lifecycle and payout mechanics; Phase 00 foundation.
- **Status:** NOT detailed yet.

## Phase 03 — Bidception

- **Goal:** Nested/team bounty system on `bidception.lol`.
- **Core capability:** A captain decomposes a parent project/bounty into funded child bounties; parent/child fund flow and settlement.
- **Dependencies:** Matured Phase 01/02 mechanics; advanced accounting — deliberately not implemented early.
- **Status:** NOT detailed yet.

## Phase 04 — Bidthrone

- **Goal:** Reputation/discovery network and optional entertainment layers on `bidthrone.lol`.
- **Core capability:** Reputation built from genuine completed work and outcomes (no pay-to-rank); discovery surfaces; candidate leaderboards (Top Builders, Top Creators, Top Captains, Rising, Most Reliable, Highest Rated).
- **Dependencies:** Completed-work/outcome data from Phases 01–03; reputation rules that hold up to abuse review.
- **Status:** NOT detailed yet.
