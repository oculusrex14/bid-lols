# RC5 — PRODUCT OBJECT REDESIGN + RC4.1 TRUST CORRECTNESS HARDENING

Status: IN PROGRESS. Supersedes the RC3 design-system restrictions where the
two-layer law below says so (docs/03_DESIGN_SYSTEM.md is the living record;
this phase file is the working spec).

Baseline main when RC5 began: ca49dc8 (docs), runtime b9a698f, deployment
dpl_8Rx9WTFQC3b7kuPCqPAepEuLswPd (RC4).

## Mission

One operational design system + four distinct product object languages + one
recognizable network family. A public record looks like a record, a bounty
board looks like a board, a creative brief looks like creative work, a team
project looks like a funded structure.

Product visual roles:

- Bidthrone = archival ledger / public work record (dark-first)
- FoundersBid = workshop paper / job tickets
- CultureBid = editorial creative studio / brief posters
- Bidception = systems console / allocation tree

## Two-layer visual law (supersedes RC3 where stated)

LAYER A — OPERATIONAL SPINE (shared, unchanged): Button/ButtonLink, Field /
Input / Textarea / Select / CheckRow, StatusBadge, MoneyValue /
MoneyBreakdown, Avatar, ReviewCard, Empty/error/loading primitives,
DataTable, BudgetBar, filters, auth, forms, admin, payment states, lifecycle
controls. Simple, tokenized, hairline, accessible, authority-free.

LAYER B — PRODUCT OBJECTS (new, allowed): clearly owned
presentational components in src/components/product-objects/ (and
src/components/brand/) for homepage hero objects, marketplace card
morphologies, public-record presentation, brief posters, budget trees, sample
visualization. May use 16px radius, selective shadows, decorative gradients,
pseudo-elements, clipped folder tabs, local illustrative media. Rules:

- presentation only: no business logic, no authority, no database access,
  no payment logic, no auth decisions;
- raw product colors/shadows/gradients live in src/styles.css under the
  marked PRODUCT OBJECT LAYER; TSX uses semantic classes;
- accessibility, money invariants, truthful-data rules, CSP, and server
  authorization are NOT weakened by this exception.

## Gate 1 — RC4.1 trust correctness (before any visual work)

- 5.1 Snapshot cold/warm equivalence: a valid snapshot-backed
  trustReportFor() must equal the cold path in role/modelVersion/status/
  score/band/confidence/confidenceLabel/bRaw/pillars/primaryOutcomes/
  uniqueCounterparties/effectiveSampleSize/spanDays/verifiedVolumeMinor/
  capApplied/uncappedScore (and therefore the overall score/band/cap).
  bRaw is reconstructed from stored pillars through the model-versioned
  roleBase() (proven by test). span_days is persisted: strictly additive
  migration 0019. 0018 is never mutated.
- 5.2 Fingerprint: hashReport includes every scoring-relevant non-outcome
  fact (currentlyRestricted, severeEventReinstatedDaysAgo) plus the model
  version. A cached score never survives a restriction change; reinstatement
  changes the fingerprint too.
- 5.3 Leaderboard cache regression: an eligible provider stays eligible
  through trustReportFor() then bidIndexLeaderboard() (warm snapshot must
  not zero n_eff); same for the overall board.
- 5.4 Marginal impact: counterfactuals that are NR/RESTRICTED carry
  impactPoints: null and counterfactualStatus, never 0. Private UI says
  "not enough history for a comparable score".
- 5.5 One leaderboard registry (src/lib/marketplace/leaderboard-registry.ts):
  key/title/family/metric/minimum-evidence/format/optional role/explanation.
  ServerFn validator, dispatch, navigation, titles, formatters all derive
  from it. No duplicate board arrays.
- 5.6 Most Reliable ranks the BI-1.0 PROVIDER RELIABILITY PILLAR
  ("Reliability 92% / 8 verified outcomes"), not the overall provider score.
  Gates: provider score-eligible, n_eff >= 5, >= 3 unrelated counterparties.
  Divergent fixtures: high-reliability/average-other vs lower-reliability/
  higher-overall must separate on the two boards.
- 5.7 Homepage Market Rates preview consumes marketRateFor() /
  MARKET_RATE_MIN_SAMPLE (same source as /market-rates). The bespoke
  bidIndexReady SQL is deleted. Preview shape: category/sampleSize/
  sufficient/minMinor/medianMinor/maxMinor.
- 5.8 Append-only: DB-level enforcement decision for trust_events
  (PostgreSQL + PGLite portability). Corrections remain REVERSAL rows.
- 5.9 Gate: npm run lint / typecheck / test / build green before design work.

## Gate 2 — design targets

Fonts: Newsreader (display for Bidthrone/FoundersBid/CultureBid heroes),
Outfit (body/UI everywhere; Bidception display at 600/700 weight), Syne only
where still used (removed if fully unused after a repo-wide search + green
build). No Google Fonts, no new families.

Type scale: hero display clamp(40px, 5.2vw, 64px), line-height 1.02, serif
tracking -0.03em (Bidception -0.04em), hero lead ~16.5px / 42ch, section
micro-label 11-12px uppercase 0.14em/600, kicker 11px uppercase 0.16em,
tabular figures for money/data. No serif in inputs/labels/buttons/statuses/
admin/payment/lifecycle controls.

Color: RC5 targets in the spec section 8, subject to WCAG AA; text tiers
adjust, concepts do not. THEME_COLORS stays synchronized with --bg
(contrast-audit.test.mjs hard gate). Bidthrone default theme-color is the
dark page (dark-first browser chrome).

Bidthrone dark-first: new visitors get dark SSR/first paint on bidthrone.lol;
stored preference always wins; no flash, no hydration mismatch; other
products stay light-first. API: readMode(fallback), modeBootScript(fallback),
DEFAULT_THEME_MODE in host-seo-shared.

Header: 64px sticky, z-40, product header token, backdrop blur 16px, 1px
hairline; grid 1fr auto 1fr (mark+wordmark / product nav / account+CTA);
active nav = subtle inset 2px accent rule. Mobile: mark+wordmark, compact
primary CTA, ONE menu button (44px targets); inside the menu: product nav,
Bid Network switcher, sign in/dashboard, appearance toggle, blog, account
secondary actions. No second menu icon, no second competing network rail.

Funding status: the single authority is moneyMode() in
src/lib/payments/provider.ts, threaded public-safely through shell context
as "off" | "sandbox" | "live". Marketplace shell shows a quiet "Funding not
live" chip when off (inside the mobile menu when space is constrained);
money forms keep the fuller explanation; repeated homepage funding
paragraphs are removed once the chip is reliable. Test IDs preserved or
updated deliberately.

Layout: new --canvas-brand (73.75rem / 1180px) + .canvas-brand for hero
compositions and product-object galleries; canvas-wide stays for browse/
filter pages and operational workspaces.

## Gate 3 — data honesty (samples)

Examples are labelled presentation, never inventory. Client-safe
constants module (src/lib/sample-content.ts): SampleObject<T> = T &
{ example: true }. Every sample root carries data-example="true" and visible
text "EXAMPLE" or "SAMPLE" (prefer "Example, not live"). No sample rows in
users/bounties/projects/parent_works/reviews/reputation_events/
trust_events. No sample in JSON-LD. No sample counts in real headings.
Samples never labelled verified/paid/settled/live. "Open now" sections show
real rows only; samples live in a separate labelled section. CultureBid
sample media is deterministic local artwork under public/sample-media/
(no Unsplash, no CSP expansion).

## Gate 4 — per-product object work

FoundersBid: warm workshop paper brand gradient (allowed brand layer);
manila folder work ticket (clip-path tab, paper tape, rotated EXAMPLE
ribbon, raw values in styles.css); hero example = labelled sample when no
open inventory, real fields in the same morphology when open work exists;
bounty vs project two-mode chooser (Compete/Submit/Review vs
Propose/Choose/Milestones/Approval, funding-off copy truthful); real job
cards as a board (reward/title/category/deadline/participants/status);
graveyard keeps its asset semantics with Founders document styling.

CultureBid: editorial hero ("A better way to commission creative work.",
Newsreader, accent italic); hero brief poster (16px radius, 16:9 local
media, EXAMPLE ribbon, "Example brief. Not live."); sample brief wall
(UGC/Photography/Naming/Music, minor-unit amounts, every tile EXAMPLE);
real cards use only stored creative fields (usageNotes or "See brief for
usage terms"; never inferred perpetual/exclusive/paid amplification);
brief detail grouped CREATIVE/MONEY/RULES/LICENSE; gallery 4/2/1 columns.

Bidception: console identity (dark graphite product header even in light
mode; Outfit 600/700 tight hero); role rail (Start a project / Captain a
team / Take a part — no "Fund a project" while moneyMode is off; captain and
take-a-part destinations are real routes, labelled honestly); budget-tree
product object (presentation only; receives authoritative values); sample
tree reconciles exactly (total = captain + children + reserve); real home
preview shows a real parent summary (title/status/budget/child count) when
child allocations are not exposed, and the full visual tree only for the
SAMPLE demo and the REAL /bidception/:id workspace (8/4 layout; tree
dominates main; sidebar keeps budget integrity/captain/lifecycle/actions;
precise words: allocated/committed/available/reserve — never paid/settled
unless authoritative).

Bidthrone: record/case-file identity (no crypto/casino/influencer look);
hero "Reputation built from work, not self-promotion." with primary CTA
"Create your record" (anonymous) / "My profile" (authenticated); public
record card hero object (SAMPLE RECORD / NOT A REAL MEMBER, @example, EX
avatar, Bid Index NR "Not enough history" — no invented number, 0/0/0 fact
tiles inside the labelled sample, three dashed "No reviews yet" slots,
neutral timeline with "No settled work yet" — no fake chronology); lower
grid = Leaderboard preview (ghost ledger: headers + row lines + ghost bars,
rank cell "—", "No eligible records yet", no fake identities/scores/ranks)
at ~1.1fr / Market Rates preview (real sampleSize/sufficient/min/median/max
from marketRateFor, "3/10 Insufficient sample" below threshold, progress
width = sample completeness ONLY) at ~0.9fr. /leaderboards: board
selector + selected board ledger + metric explanation (never 12 giant empty
tables). /bid-index: personal 300-900 surface with first-class designed NR;
NO category n/10 bars there (that is Market Rates). /market-rates: ledger-
like, threshold >= 10, sample disclosed, no price below threshold. Public
profile: case-file layout (identity, Bid Index state, factual counters, role
breakdown, work history, real reviews, public disputes); no cover photo, no
follower count, no vanity badges; the home sample record is its miniature.

## Gate 5 — QA and release

- 390 / 768 / 1440 reviewed on the critical routes of all four products
  (style-audit.mjs extended with viewports + bidthrone /market-rates).
- Test matrix per spec section 37 (trust, design, shell, samples, founders,
  culture, bidception, bidthrone, money, public copy).
- Public copy guards unchanged (no em dash in rendered copy, no legacy
  terms); contrast gate unchanged and passing.
- Complexity gate unchanged (max CC <= 15 in production; product objects
  SPLIT the big homepage/route components, never add giant switches).
- Security: CSP unchanged (local fonts/icons/sample art only), authz
  unchanged, error sanitization unchanged, schema boot gate includes 0019.
- Release reproducibility: clean tree, local SHA == origin/main == production
  source SHA, no .vercel/ committed, gitDirty=0.
- Migration 0019 (if shipped): additive, idempotent, auditable; gated
  preflight BEFORE code deploy; row counts verified.
- Funding stays OFF; TRUST_VERIFICATION_LIVE stays 0.

## Acceptance (definition of done)

cold trust result == valid cached trust result; taxonomy separation holds
(Bid Index personal 300-900 only; Market Rates aggregate pricing only);
money off; verification off; no fake live work/users/reviews/scores/prices/
leaderboard values; security gates unregressed; the four products visibly
read as sibling products with distinct object languages over one shared
spine; 390/768/1440 reviewed; exact clean pushed SHA deployed and
smoke-tested; STATE.md + docs/reports/RC5_PRODUCT_OBJECTS_REPORT.md true.
