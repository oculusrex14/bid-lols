# RC4 FINAL RELEASE REPORT — Bid Index / Trust Infrastructure / Social Cards

Status: **COMPLETE** (production release). Funding remains OFF.
TRUST_VERIFICATION_LIVE remains OFF (0).

## Release identity

- **Runtime SHA (production):** `b9a698f6d9ec` (clean detached checkout,
  `vercel deploy --prod`)
- **Production deployment:** `dpl_8Rx9WTFQC3b7kuPCqPAepEuLswPd`
  (`bidthrone-40tkbngwi-oculusrex14s-projects.vercel.app`), Ready, aliased to
  all four domains.
- **Ops/docs SHA on main:** `8a569b9` (projector production opt-in guard;
  script-only, no runtime redeploy). Previous good deployment:
  `dpl_7dzaSDwdvFtP6CgyGBjYi9Az5BDQ` (RC3 end state), chain intact for
  rollback.
- **CI:** gates+Playwright run `33266736330` (b9a698f) **success**; CodeQL
  `33266736307` **success**; post-deploy ops run `33268651893` (CI) +
  `33268651890` (CodeQL) **success**. Note: the red runs on
  dependabot/* branches (TypeScript 7.0.2, ESLint 10.9.1 majors) are
  dependabot's own branch runs, not main.

## Test totals (exact, gate battery + new suites)

- `scripts/**/*.test.mjs`: **1504 tests, 1504 pass, 0 fail**
  (incl. new `og-assets.test.mjs`, `bid-index-sim` assertions moved into the
  ts tree).
- `src/**/*.test.ts` + `tests/**/*.test.ts`: **295 tests, 295 pass, 0 fail**
  (adds model primitives 28, pipeline invariants 15, DB integration 10,
  sim personas 6, reveal tests, ledger drift updated for 0018).
- Playwright critical paths: **42/42 PASS** (extends §72: /market-rates
  separation, methodology page, versioned social card over HTTP).
- Marketplace journey (fake provider, dev-only): **7/7 PASS**.
- Complexity gate: **violations=0** (BI-1.0 core refactored to table-driven
  helpers; prod max 15). `npm audit --omit=dev --audit-level=high`: 0
  vulnerabilities. Lint: 0 errors.

## Migration

- `0018_trust_bid_index.sql` — strictly additive:
  `trust_events` (append-only, idempotent
  `(source_type, source_id, user_id, role, event_kind)` unique key),
  `trust_score_snapshots` (input_hash cache/audit),
  `trust_score_appeals`, `trust_risk_flags`,
  `verification_cases` + `verification_events` (TRUST_VERIFICATION_LIVE=0),
  disputes += `resolution_code`/`responsibility`/`severity_code`/
  `finalized_at`, reviews += `value`/`fairness`,
  project_milestones += `active_at`, `project_milestone_extensions`.
- **Verification:** gated step executed — dry-run listed exactly
  `0018_trust_bid_index.sql` → apply → ledger tail verified
  (`0016, 0017, 0018`) → all 7 new tables + 4 dispute columns present →
  row counts unchanged (0 bounties/0 loss; nothing destructive exists in
  the file). Schema-ledger boot gate updated
  (`REQUIRED_MIGRATIONS` now 17 entries; drift test updated and green).

## Trust backfill (production, honest)

- `npx tsx scripts/rebuild-trust-events.mjs` dry-run + `--apply` against
  production (explicit gated invocation, `USE_REAL_DB=1`; never in CI):
  **2 members inspected → 0 events createable, 0 reversals; rerun idempotent**
  (would-create=0/0/0). Production state: 2 users, 1 profile (handleless,
  hence not publicly listed), 0 bounties/projects/disputes →
  **0 primary outcomes, 0 score-eligible members.** Nothing fabricated.
  The network ships with NR everywhere, exactly as specified.

## Bid Index (model BI-1.0) — as implemented

- **Eligibility (§6):** per role, ≥2 primary score-eligible closed outcomes
  AND ≥2 distinct unrelated counterparties, else `NR / Not enough history`.
- **Primary unit (§7):** one evidence unit per (user, role, work item);
  milestones/review dimensions feed pillars, never sample size.
- **Role weights/priors (§23–25):** Provider Reliability .35 (.70/4),
  Quality .20 (.70/5), Timeliness .15 (.70/4), Communication .10 (.70/5),
  Integrity .20 (.85/5); Sponsor Funding .35, Clarity/Fairness .20,
  Decision timeliness .15, Communication .10, Integrity .20; Captain Parent
  completion .30, Stewardship .20 (.75/4), Child outcomes .15, Timeliness
  .15, Sponsor review .05, Integrity .15. Base =
  0.70·geometric + 0.30·arithmetic.
- **Value factor (§13):** `V(a)=clamp(0.75,1.75,1+0.22·ln(max(0.25,a/25000)))`
  (₹25k→1.00, ₹1L→1.305, ₹10L+→1.75; role exposure in integer minor units).
- **Complexity (§15):** `sat(x,k)=1−e^(−x/k)`; bounty 0.55·S+0.45·D (4/45),
  project 0.25·S+0.45·M+0.30·D (4/4/60), captain
  0.15·S+0.25·U+0.20·E+0.20·P+0.20·D (6/5/4/5/90); `W_c=0.90+0.35·C`.
  Observational only (skills count, milestone count, planned duration,
  Bidception child units/edges/workers) — never self-reported.
- **Recency (§16):** `R=1+0.15·2^(−age/365)` — no decay of old history.
- **Damping (§17):** same-pair outcomes 1–3→×1.00, 4–10→×0.60, 11+→×0.30
  (chronological, deterministic); self/related-party → weight 0.
- **Failure severities (§19):** cancellation 1.5, abandonment 2.25, payment
  default/abusive chargeback 2.75, fraud/collusion 4.0; failure weight
  clamp 0.40–5.00. SHARED_FAULT splits 0.5/0.5 (§20, tested).
- **Confidence (§29–31):** Kish n_eff over primary weights, diversity
  `D=0.70+0.30·min(U/5,1)`, span `H=0.85+0.15·min(days/365,1)`,
  `C=(1−e^(−n_eff/8))·D·H`; labels PROVISIONAL/SUPPORTED/HIGH; shrinkage to
  the 0.60 network prior; RoleScore = round(300+600·B_role), clamp 300–900.
- **Overall (§36):** exposure blend with an 80% per-role share cap and
  geometric mix; role scores always stay visible; the strictest active cap
  binds the overall (§62.15).
- **Hard caps (§34):** major default → 649 for 180 days, linear recovery to
  799 by day 730; 2+ majors within 730 days → 549 (recovery to 699);
  severe integrity → RESTRICTED (no numeric score while restricted), 499→649
  linear over 365–1095 days after reinstatement.
- **Marginal impact (§35):** private report shows true
  score-with − score-without per adverse event (no invented point tables).
- **Bands (§33):** NR · 300–499 Critical observed risk · 500–599 High
  observed risk · 600–679 Caution · 680–739 Building · 740–799 Established
  · 800–849 Strong · 850–900 Exceptional.

### Fixture/simulation results (model verification, not calibration)

`npx tsx src/lib/trust/bid-index-sim.ts` over the production functions:

| Persona | Result |
| --- | --- |
| NEW USER (1 job) | NR, conf 0.08 |
| 2 clean / 2 counterparties / ~30d | 673-ish, PROVISIONAL (unit fixture 655–700 band ≈680) |
| 10 clean / 5 counterparties / ~365d | ~793 region, SUPPORTED (test pins 780–810) |
| 20 clean / 5 counterparties / ~730d | 847, HIGH (target 840–855) |
| 50 diverse | high 800s, never trivially 900 |
| WHALE (₹10,00,000 + small) | 674, conf 0.15 — one giant job cannot fake evidence |
| SCAM PROVIDER (small-clean then ₹5L abandonment) | capped 649 |
| SCAM SPONSOR (chargeback) | capped 649 |
| DISPUTE ABUSER (2 majors inside 730d) | capped 549 |
| COLLUDING PAIR (100 tiny reciprocal) | **NR** (single counterparty; n_eff 97 but eligibility blocks) — farming cannot create a score at all |
| INACTIVE VETERAN | 810 (old clean history still counts) |
| REHABILITATED DEFAULT (old major + years clean) | 742, uncapped after expiry |
| RESTRICTED (confirmed fraud) | RESTRICTED, no numeric |

Cross-validation honesty (§60/§65): the model is deterministic and
property-tested; NO predictive/statistical validation is claimed. Empirical
calibration runbook (temporal validation, Brier/log-loss/AUC, ≥500 eligible
+ ≥50 adjudicated adverse outcomes as the entry bar) is documented as
future work.

## Social cards (P0)

- Generated deterministically by `scripts/generate-og-assets.mjs` (SVG →
  sharp PNG, committed to `public/og/trust-v1/`); rerunnable; never
  hand-edited.
- Exact URLs (all verified live: 200, image/png, **1200×630**, 33–45 KB):
  - https://bidthrone.lol/og/trust-v1/bidthrone.png
  - https://foundersbid.lol/og/trust-v1/foundersbid.png
  - https://www.culturebid.lol/og/trust-v1/culturebid.png
  - https://bidception.lol/og/trust-v1/bidception.png
- Metadata (verified in live HTML for all four hosts): og:image +
  og:image:secure_url + og:image:type=image/png + width/height 1200/630 +
  og:image:alt + twitter:card=summary_large_image + twitter:title/
  description/image/image:alt. Each host references ONLY its own card;
  **zero `/og.jpg` references in live metadata on any host.**
- Legacy `public/og.jpg` REPLACED by a current neutral Bid Network card
  (1200×630 PNG), so an accidental historical reference cannot resurrect
  the old artwork; no source file emits it.
- Bidthrone card copy: "Reputation built from completed work." / "A 300–900
  Bid Index from verified marketplace outcomes." — no fake people, numbers,
  ranks, or legacy pay-to-rank copy (test-enforced).
- X cache note (operator): the implementation guarantees correct HTML and
  NEW asset URLs; X's page-card cache is external. To re-fetch once, test
  with a unique harmless URL: **https://bidthrone.lol/?share=trust-v1**
  (canonical remains https://bidthrone.lol/). Declared: correct HTML + new
  URLs verified; NOT declared: X's cache state.

## Taxonomy & routes

- `/bid-index` (bidthrone): methodology + bands + disclaimers + personal
  report link when signed in; noindex (private aggregate policy) until the
  network decides otherwise.
- `/market-rates` (bidthrone): the renamed aggregate pricing product
  (`MarketRateSample`, `marketRateFor`, `MARKET_RATE_MIN_SAMPLE=10`);
  sample-gated, currently "Insufficient sample" everywhere honestly;
  noindex until a category genuinely qualifies. Bid Index/market-rates
  separation asserted in copy + E2E.
- `/settings/trust`: private report — overall, role reports, pillars,
  why-the-score-moved (true marginal impacts), active cap + uncapped value,
  appeal pointer.
- `/leaderboards`: factual boards preserved; `most_reliable` re-backed by
  real BI-1.0 provider evidence (no more `reliability: 0` ranking); new score
  boards (Highest Bid Index / Top Providers / Sponsors / Captains) with
  stricter eligibility (eligible + confidence ≥0.45 + n_eff ≥5 + U ≥3) —
  all honestly empty today.
- Public profile: Bid Index block (score, band, confidence, 0–100 model
  pillars with the "model dimensions, not star reviews" framing, factual
  verified-outcome line) + honest "Not enough history" NR state
  (test-covered; no public scored member exists yet in production).
- Capability matrix: /bid-index, /market-rates, /leaderboards are
  bidthrone-canonical (redirects from other hosts intact).

## Reviews

- Blind reciprocal reveal (§26): one shared eligibility definition
  (`review-reveal.ts`) used by the public listing SQL and the scoring
  evidence; both-submitted → reveal, else 14-day window; immutable reviews;
  duplicate/self-review schema-prohibited (all tested against PGLite).
- New nullable dimensions `value` (provider quality mean with `quality`)
  and `fairness` (sponsor clarity mean with `clarity`); missing is never
  zero.
- Reviewer weight = 0.60 + 0.40·min(1, √(reviewerVerifiedOutcomes/10)) —
  never the reviewer's own Bid Index (no rich-get-richer).

## Verification infrastructure (built, DISABLED)

`verification_cases`/`verification_events` exist (scopes, check types,
status flows, append-only status history). TRUST_VERIFICATION_LIVE remains
**0**: no purchase flow, no provider integration, no raw identity documents
(provider references/results only). Payment gives **zero** Bid Index effect
— BI-1.0 identity-assurance weight is exactly 0, covered by the model's
exclusion list and documented in methodology + ops runbook.

## Production posture

- **Funding OFF** — no `MARKETPLACE_MONEY_LIVE` anywhere (production env
  names verified; `.env.local` has none); nothing takes money in RC4 code.
- **Verification OFF** — no `TRUST_VERIFICATION_LIVE` anywhere.
- **5xx:** none observed during release verification (17/17 smoke 200; all
  four domains 200; trust surfaces 200; marketplace surfaces 200; legal/
  blog 200). Vercel function logs for this project return 0 lines
  historically; direct probes are the verification of record (as in RC3).
- The 500 seen on the PREVIEW `/market-rates` was the schema-ledger boot
  gate correctly refusing to serve before the production migration was
  applied — the RC3 incident class now fails loudly at first request, and
  it went away the moment 0018 was in the ledger. Production never served
  a boot-gate error (migration preceded the deploy).

## External blockers (unchanged)

- **CultureBid apex DNS** (private 10.x records; www works as canonical) —
  operator follow-up per docs/ops/DEPLOYMENT.md.
- **X page-cache**: see the `?share=trust-v1` note above.
- **GSC/Bing verification**, **Vercel↔GitHub git integration + branch
  protection** (Dependabot branches run their own CI; majors stay unmerged
  on purpose), **contact@foundersbid.lol mailbox existence on Hostinger**
  (MX exists; mailbox provisioning is operator-side) — all operator
  follow-ups documented in STATE.md.

## Acceptance checklist (§87) — verified

Buy-able score ✗ (no purchase path) · one-job score ✗ (NR) ·
one-counterparty farming ✗ (NR; damping) · losing bounty neutral ✅ ·
value sub-linear + capped ✅ · larger default hurts ≥ smaller ✅ ·
complexity observable, capped ✅ · unresolved dispute = zero ✅ ·
finalized at-fault affects ✅ · vindicated untouched ✅ · recent major
default caps a veteran ≤649 ✅ · paid verification = 0 points ✅ ·
demographics absent ✅ · every displayed number reproducible from state ✅ ·
model versioned ✅ · corrections audited ✅ · no admin score writes ✅ ·
Market Rates ≠ Bid Index ✅ · no legacy artwork in any preview ✅ ·
funding OFF ✅

Report end. Runtime = `b9a698f`; docs/ops = `8a569b9`.