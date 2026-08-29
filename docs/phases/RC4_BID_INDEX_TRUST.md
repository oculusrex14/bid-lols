# RC4 — BID INDEX / TRUST INFRASTRUCTURE / SOCIAL CARD REMEDIATION

Status: IN PROGRESS. This file is the working spec record for RC4; the full
methodology text lives in `docs/BID_INDEX_METHODOLOGY.md`.

## Mission

Bidthrone stops being a pricing-lookup surface and becomes the trust surface.

- **Bid Index** is redefined, permanently: the PERSON / MARKETPLACE TRUST
  SCORE (300–900, network-wide, derived from verified behaviour, model
  **BI-1.0**). It answers: "how much evidence do we have that this person will
  honour commitments made on the Bid Network?"
- The old aggregate price benchmark keeps its function but takes the name
  Market Rates** (route `/market-rates`; code `MarketRateSample`,
  `marketRateFor(...)`, `MARKET_RATE_MIN_SAMPLE`). It is never called
  "Bid Index" again.

Trust cannot be bought (no paid placement, no paid score, paid verification
earns zero points), cannot be earned by popularity (followers never enter),
and is NR ("Not enough history") until real evidence exists.

## P0 — social preview remediation (shipped first)

X still shows the legacy "BID.LOL / Pay to rank" card because current
metadata references `${origin}/og.jpg` — pre-pivot artwork, crawl-cached.

- `scripts/generate-og-assets.mjs` renders deterministic 1200×630 cards from
  SVG templates via `sharp` (build-time devDependency).
- Versioned, centralized URLs: `/og/trust-v1/<product>.png` (public/og/...).
  `OG_ASSET_VERSION` is the single source of truth.
- Four cards in each product's identity (RC3 spine; no fake numbers, no
  legacy copy). Legacy `/og.jpg` is REPLACED by a current neutral network
  card and metadata verifiably stops referencing it (cache control:
  new asset URL is the invalidation mechanism).
- Every public page emits full OG + twitter metadata (og:image:secure_url,
  og:image:type, width/height, alt, twitter:image/alt …).
- Tests assert: per-host distinct URLs, images exist, PNG, exactly 1200×630,
  size bound, metadata match, no `/og.jpg` reference, no legacy pay-to-rank
  copy in public source.

## Taxonomy change (deliberate)

| Old                       | New                            |
| ------------------------- | ------------------------------ |
| "Bid Index" (pricing)     | **Market Rates** — `/market-rates` |
| `bidIndexFor`, `BID_INDEX_MIN_SAMPLE` | `marketRateFor`, `MARKET_RATE_MIN_SAMPLE` |
| `/bid-index` pricing page | **Bid Index methodology surface** + signed-in personal report |

Bidthrone navigation concept: **Bid Index · Leaderboards · Market rates**.
`/market-rates` stays noindex (private aggregate) until samples genuinely
reach the threshold.

## The model — BI-1.0 (fixed; implemented verbatim from the spec)

- **Identity**: one member, three role scores — PROVIDER / SPONSOR / CAPTAIN —
  plus an Overall Bid Index where multiple roles are eligible.
- **Eligibility** (per role): ≥2 primary score-eligible closed outcomes AND
  ≥2 distinct unrelated counterparties. Otherwise NR ("Not enough history").
- **Primary evidence unit**: one per (user, role, work item) — milestones and
  review dimensions never inflate sample size; they feed pillars inside the
  outcome.
- **Value factor**: `V(a)=clamp(0.75,1.75, 1+0.22*ln(max(0.25, a/25000)))`
  (a = role's actual economic exposure, in INR, from integer minor units).
- **Complexity** (observational, never self-reported):
  `sat(x,k)=1-e^(-x/k)`; bounty `0.55*S+0.45*D` (k=4/45); project
  `0.25*S+0.45*M+0.30*D` (4/4/60); captain
  `0.15*S+0.25*U+0.20*E+0.20*P+0.20*D` (6/5/4/5/90).
  `W_complexity = 0.90+0.35*C`.
- **Recency** `R(age)=1+0.15*2^(-age/365)` (no decay to zero).
- **Pair damping** per unordered pair, chronological: outcomes 1–3 P=1.0,
  4–10 P=0.60, 11+ P=0.30; self-dealing / related-party weight 0.
- **Weight** `W=clamp(0.40,2.50, V*W_complexity*R*P)`;
  failure weight `clamp(0.40,5.00, W*severity)` with severities
  NORMAL 1.0 / ATTRIBUTABLE_CANCELLATION 1.5 / ABANDONMENT_OR_NONPERFORMANCE
  2.25 / PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK 2.75 /
  FRAUD_OR_COLLUSION_CONFIRMED 4.0.
- **Pillars** (fractional Bayesian `posterior=(μκ+Σwy)/(κ+Σw)`):
  provider Reliability .70/4=.35, Quality .70/5=.20, Timeliness .70/4=.15,
  Communication .70/5=.10, Integrity .85/5=.20;
  sponsor Funding .35, Clarity/Fairness .20, Decision timeliness .15,
  Communication .10, Integrity .20;
  captain Parent completion .30, Budget stewardship .20, Child outcomes .15,
  Timeliness .15, Sponsor review .05, Integrity .15.
  Review observations are gated on reciprocal reveal and weighted by
  `ReviewerFactor=0.60+0.40*min(1,sqrt(reviewerVerifiedPrimaryOutcomes/10))`.
- **Role base** `B_raw=0.70*exp(Σ a_i·ln(max(0.05,p_i)))+0.30*Σ a_i·p_i`.
- **Confidence** `C=(1-e^(-n_eff/8))·D·H` with Kish n_eff,
  `D=0.70+0.30·min(U/5,1)`, `H=0.85+0.15·min(Hdays/365,1)`;
  labels PROVISIONAL <0.45 ≤ SUPPORTED <0.75 ≤ HIGH CONFIDENCE.
- **Shrinkage**: `B_role = C·B_raw+(1-C)·0.60`;
  `RoleScore=clamped round(300+600·B_role)`.
- **Overall**: exposure blend `E=sqrt(n_eff)·clamp(1,1.6,1+0.10·ln(1+vol/25000))`,
  shares hard-capped at 80% per role, geometric blend, then score.
- **Hard caps** (final adjudicated events only): MAJOR_DEFAULT 649 for 180d
  then linear recovery to 799 by day 730; 2+ majors within 730d → 549 with
  linear recovery to 699; severe integrity: numeric score withheld while
  restricted, 499 → 649 linear over 365–1095d after reinstatement.
- **Marginal impact**: `score_with − score_without_event` (true marginal
  effect of one finalized event — no invented point tables).
- **Bands**: NR · 300–499 Critical observed risk · 500–599 High observed
  risk · 600–679 Caution · 680–739 Building · 740–799 Established ·
  800–849 Strong · 850–900 Exceptional.
- No black-box ML. Deterministic, reproducible from the database.

## Data layer

Migration `0018_trust_bid_index.sql` (strictly additive):

- `trust_events` — append-only scoring inputs; unique idempotent
  `source_type+source_id+user_id+role+event_kind` keys; reversals append
  `REVERSAL` events (`reverses_event_id`); indexed by user/role/time, work
  and source. No writable "points" column.
- `trust_score_snapshots` — cache/audit record per (user, role, model);
  never authoritative; deleted values are reproducible.
- `trust_score_appeals` — factual challenges (OPEN → UNDER_REVIEW →
  UPHELD/CORRECTED/REJECTED); corrections only via reversal trust events.
- `trust_risk_flags` — SUSPECTED flags never lower a score by themselves.
- `verification_cases` + `verification_events` — future verified-founder /
  verified-provider infrastructure, feature-flagged OFF
  (`TRUST_VERIFICATION_LIVE=0`). No raw identity documents are ever stored.
- disputes +: `resolution_code`, `responsibility`, `severity_code`,
  `finalized_at` (structured adjudication; OPEN/UNDER_REVIEW carry zero score
  effect; claimant≠respondent is not the responsibility axis).
- reviews +: nullable `value`, `fairness` dimensions (missing ≠ zero).
- project_milestones +: `active_at` (authoritative activation timestamp).
- `project_milestone_extensions` — approved pre-breach deadline extensions
  (append-only) → effective due date.

## Trust event projector

`scripts/rebuild-trust-events.mjs --dry-run | --apply` (server core in
`src/lib/trust/projector.server.ts`): deterministic, idempotent, rebuildable
mapping from authoritative marketplace state to trust events. Bounties,
projects, bids' lifecycle transitions; disputes recomputed only after final
structured adjudication; honest empty backfill acceptable — no fabricated
history. Score snapshots recompute on read when the input hash changes.

## Reviews

Blind reciprocal reveal: neither side sees the counterparty's review until
both submitted or 14 days pass from first submission; public review listing
and the scoring input share one reveal eligibility function; hidden reviews
cannot leak via any read path; reviews immutable (admin corrections
exception documented).

## Simulation / invariants (no production-data claims)

`scripts/bid-index-sim.mjs` runs the PRODUCTION scoring functions over
synthetic personas (new user, steady provider, whale, scam provider/sponsor,
colluding pair, vindicated provider, bad captain, inactive veteran …).
Property tests prove the §62 invariants (NR gates, monotonicity of clean
evidence, cap dominance, dispute-no-effect-until-final, band bounds …).
**No predictive cross-validation claim**: BI-1.0 is model-verified now;
empirical calibration is future work (≥500 eligible outcomes + ≥50
adjudicated adverse outcomes before BI-1.x evaluation is even discussed).

## Routes hit in this release

- `/bid-index` (bidthrone; other hosts redirect by capability) —
  methodology + signed-in score report link.
- `/market-rates` (bidthrone) — the renamed pricing aggregate (noindex).
- `/settings/trust` — private score report: pillars, why-the-score-moved
  (marginal impacts), active caps + recovery schedule, appeals.
- `/leaderboards` — factual boards kept; reliability board re-backed by real
  evidence (the old `reliability: 0` bulk-loader bug is removed); score
  boards added but gated on stricter eligibility (empty when no one
  qualifies — never padded).
- `/profile/:handle` — public Bid Index block (score, confidence, band,
  pillars, factual record) when eligible; honest "Not enough history" NR.

## Verification / security invariants carried into RC4

- Client input can never directly author score, weight, severity, or
  outcome values; only trusted server services write `trust_events`; admin
  adjudication is audited and cannot type a preferred score.
- TRUST_VERIFICATION_LIVE stays 0; there is no checkout; payment grants zero
  Bid Index effect.
- Funding (MARKETPLACE_Money) remains OFF everywhere.

## Release gates

Standard RC3 gate battery (lint, typecheck, tests, build, complexity, audit,
Playwright) + new: OG asset integrity test, model property tests, simulation
smoke, trust-event idempotency tests, migration ledger drift test
(0018 added to REQUIRED_MIGRATIONS before deploy). Production smoke extended
with `/market-rates` after every deploy.

## Verification status in RC4 (honest)

Verification adapters: designed only (schema + boundaries). Any paid
verification would earn zero Bid Index points — documented and tested as an
invariant of the model (identity assurance weight in BI-1.0 is exactly 0).