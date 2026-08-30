# Bid Index — Published Methodology (Model BI-1.0)

The **Bid Index** is a marketplace trust score based on verified outcomes on
the Bid Network. It is **not a credit score** and does not use
credit-bureau information. It does not predict the future; it summarizes
how much verified evidence exists that a member honours the commitments they
make on foundersbid.lol, culturebid.lol and bidception.lol.

The 300–900 scale is a familiar presentation range. The formula itself is
original to this marketplace and fully deterministic — every number can be
recomputed from the database.

## Identity: one number, three role scores

- **Provider Index** — did the work (bounty winners, delivered projects,
  Bidception child builders).
- **Sponsor Index** — funded the work, decided on time, settled fairly.
- **Captain Index** — carried a Bidception parent project.

Bidthrone generates no work outcomes; it reads the network record.
When several roles are scored, an **Overall Bid Index** blends them with
weights that never let a strong role conceal a weak one, and displayed role
scores are never hidden (Provider 830 / Sponsor 610 stays visible).

## Eligibility (NR — not enough history)

A role gets its first number only when **both** are true:

1. at least 2 primary score-eligible closed outcomes, and
2. at least 2 distinct unrelated counterparties.

Better work structure adds evidence, but one project — and one review — is
never a score. Milestones and review dimensions feed the quality of that
outcome's evidence, never the sample size.

## The evidence: what weighs, and by how much

- **Value** `V(a) = clamp(0.75, 1.75, 1 + 0.22·ln(max(0.25, a/25000)))` — a
  ₹25,000 outcome counts as 1.0; ₹1,00,000 ≈ 1.30; ₹10,00,000+ caps near 1.75.
  Money increases evidence logarithmically, never linearly.
- **Complexity** `W_c = 0.90 + 0.35·C` (C ∈ [0,1]) — derived ONLY from
  structured work facts (distinct skills, milestones, planned duration,
  Bidception units/edges/workers). Never from self-description or length.
- **Recency** `R = 1 + 0.15·2^(−age/365)` — recent work has a modest
  premium; old legitimate work never decays away.
- **Repeat counterparty damping** — the 1st–3rd outcomes with the same
  counterparty count fully, the 4th–10th at 0.60, the 11th+ at 0.30.
  Self-dealing and related-party outcomes count zero.
- **Failure evidence** (final adjudications only): attributable cancellation
  ×1.5, abandonment/non-performance ×2.25, payment default or abusive
  chargeback ×2.75, confirmed fraud/collusion ×4.0 — clamped to 5.0.

## Pillars

Each role computes behavioral pillars as fractional Bayesian updates
`posterior = (μκ + Σ·w·y)/(κ + Σ·w)`:

- Provider: Reliability 35% (μ.70/κ4) · Quality 20% (.70/5) · Timeliness 15%
  (.70/4) · Communication 10% (.70/5) · Integrity 20% (.85/5).
- Sponsor: Funding 35% (.70/4) · Clarity/Fairness 20% (.70/5) · Decision
  timeliness 15% (.70/4) · Communication 10% (.70/5) · Integrity 20% (.85/5).
- Captain: Parent completion 30% (.70/4) · Budget stewardship 20% (.75/4) ·
  Child outcomes 15% (.70/4) · Timeliness 15% (.70/4) · Sponsor review 5%
  (.70/5) · Integrity 15% (.85/5).

A weak Integrity pillar cannot be washed out by many strong reviews: the
behavioral base is 0.70·geometric + 0.30·arithmetic over the pillars.

## Confidence — separate from the score

`C = (1 − e^(−n_eff/8)) · D · H` where `n_eff` is the Kish effective sample
size of primary outcome weights, `D` = 0.70+0.30·min(U/5, 1) counterparty
diversity, `H` = 0.85+0.15·min(spanDays/365, 1). Labels: **PROVISIONAL**
(<0.45), **SUPPORTED** (≥0.45), **HIGH** (≥0.75). One giant transaction has
n_eff ≈ 1 and can never fake ten independent jobs.

The displayed score shrinks towards the network behavioral prior (0.60 →
660 on the scale) as confidence drops: `RoleScore = round(300 + 600·(C·B_raw
+ (1−C)·0.60))`, clamped to 300–900.

## Hard caps (beyond the Bayesian engine)

Only FINAL adjudicated events trigger caps; they expire on a schedule:

- **Major default** (serious abandonment, payment default, abusive
  chargeback, material captain failure): role and overall max **649** for
  180 days, then a linear recovery to 799 by day 730. The adverse event
  still remains in Bayesian history.
- **2+ majors within 730 days**: max **549**, linear recovery to 699 over
  the next year.
- **Confirmed severe integrity (fraud/collusion)**: no public numeric score
  while the account is restricted ("RESTRICTED · under trust review");
  after formal reinstatement, 499 for a year, then a linear recovery to 649
  through day 1095.

## Bands

| Range   | Band                  |
| ------- | --------------------- |
| NR      | Not enough history    |
| 300–499 | Critical observed risk|
| 500–599 | High observed risk    |
| 600–679 | Caution               |
| 680–739 | Building              |
| 740–799 | Established           |
| 800–849 | Strong                |
| 850–900 | Exceptional           |

Bands describe historical behavioural evidence. They never say "safe" or
"will not default".

## What never affects the score

Followers, social reach, stars on any external platform, profile
completeness, bio length, views, logins, number of bids, wealth, account
age by itself, page placement, payment of ANY fee, verification status
(0% weight in BI-1.0), any demographic or protected characteristic,
geography, device or IP data.

## Disputes and review reveal

- Open or under-review disputes have **zero** score effect; complaining is
  free. Only final structured adjudications (resolution code +
  responsibility + severity + finalized date) create evidence.
- Responsibility is a recorded adjudication decision, never inferred from
  who complained. Vindicated parties are untouched; shared fault splits the
  failure weight half-half.
- Losing a bounty is never a failure.
- Reviews are blind-reciprocal: neither side sees the other's review until
  both submit or 14 days pass; reviews are immutable afterwards.
- Reviewer weight grows only with the reviewer's own verified outcomes
  (60% new, 100% established) — never with their Bid Index (no
  rich-get-richer loop).

## Marginal impact instead of point tables

The private report shows an adverse event's true effect: the score with
the event minus the score without it, computed by this model. That single
number automatically includes value, complexity, damping, confidence, and
caps. When removing the event would drop the role below eligibility (NR)
or into RESTRICTED, there is NO comparable number: the report says
"not enough history for a comparable score" instead of printing 0. Zero
points means "comparable, and the difference is zero"; it never means
"incomparable".

## Corrections and appeals

Facts can be challenged (trust score appeals). Corrections happen only via
append-only reversal/correction trust events followed by a rebuild — no
admin can type a preferred score, and every correction is audited.

## Model governance

BI-1.0 is frozen. Weights, priors, caps, eligibility, and bands change only
in a NEW version (BI-1.1, BI-2.0…), never by silent edits, and old
snapshots are preserved. Verification status is honest: BI-1.0 is
**model-verified now** (deterministic, tested, simulated); **empirical
calibration** on real default outcomes is future work that requires ~500+
score-eligible resolved outcomes and ~50 genuine adjudicated adverse
outcomes before it is even discussed. No predictive-performance claims are
made until temporal validation succeeds.

Identity verification may add at most a small assurance weight in a future,
separately reviewed model. Payment for verification earns zero points,
today and ever.
## RC4.1 correctness addendum (shipped with RC5)

Snapshot equivalence. A cached score read must be materially identical to a
fresh compute for the same authoritative facts, model version, and as-of.
The snapshot now persists every RoleScoreResult field (0018 fields plus
`span_days` from 0019); `bRaw` is rebuilt from the stored pillars through
the model-versioned `roleBase()` and `uncappedScore` through
`roleScore(bRaw, confidence)` when a cap applied. Overall score, band, and
cap are therefore identical cold and warm (regression-tested).

Fingerprint. The snapshot input hash includes the model version, every
outcome's identity and scoring-relevant fields, reveal-gated review facts,
AND the role-level restriction/reinstatement facts. A cached number can
never survive an account becoming formally restricted (the read becomes
RESTRICTED, not the stale score), and a reinstatement changes the hash so
the recovery-cap schedule recomputes.

Leaderboard cache. Score boards re-verify every candidate through the full
scoring path on each read; a warm snapshot can no longer zero out the
evidence statistics that the board gates on (confidence, effective sample
size, unrelated counterparties).

Most Reliable. The "Most Reliable" board ranks the BI-1.0 PROVIDER
RELIABILITY PILLAR (0 to 1, displayed as a percentage with the verified
outcome count), never the 300-900 provider score. Eligibility: provider
role score-eligible, effective sample size >= 5, >= 3 unrelated
counterparties. It is a board in the single leaderboard registry; the
registry is the one source of board identity (names, floors, formatters).

Append-only enforcement. `trust_events` is append-only at TWO levels: the
application layer has no UPDATE/DELETE path, and migration 0019 adds a
database BEFORE UPDATE OR DELETE trigger that rejects both with a named
exception (verified on PostgreSQL tooling and PGLite; the reproducibility
test that deletes all events uses the one documented disable/re-enable
escape, which application code does not have).
