# RC5.1 — Release Correctness + Mobile Cleanup + Currency Foundation

Status: COMPLETE (shipped; see docs/reports/RC5_1_RELEASE_AND_CURRENCY_REPORT.md)

Small corrective release on top of the RC5 runtime (`c2423e5`). No redesign, no
new marketplace phase, no real payments, no TRUST_VERIFICATION_LIVE, no BI-1.0
constant changes, no AUD, no invented activity.

## The three currency concepts (law, verbatim)

- **A. Work currency** — persisted, authoritative, follows the work item.
  An INR 50,000 bounty shows ₹50,000 to everyone. Never converted, never
  relabelled.
- **B. Viewer default currency** — region default used ONLY for (1) sample /
  example marketing objects, (2) the default on new-creation forms, (3) which
  currency's Market Rates are shown first. India → INR; everywhere else → USD.
  Never payment authority; never changes an existing work item.
- **C. FX** — does not exist in RC5.1. No live FX API, no cached rate, no
  "approximately converted" payout. (The dead `src/lib/fx.ts` module from
  Phase 00 is deleted in this release as a landmine.)

## Workstream acceptance criteria

### WS1 — Release reproducibility (P0)

Root cause (verified by reproduction in a detached worktree at `c2423e5`):
the RC5 release worktree linked `node_modules` as a **symlink** into the dev
checkout for speed. `.gitignore` contained `node_modules/` (trailing slash =
directories only); a symlink has git type `blob`, so it was **untracked and
not ignored** → `git status` reported `?? node_modules` → Vercel's git
metadata recorded `gitDirty=1` even though the source tree at `c2423e5` was
objectively clean. The earlier report's "clean worktree" claim was true of the
tracked files; the untracked symlink slipped past it.

Fix: `.gitignore` pattern `node_modules` (no trailing slash) matches files,
symlinks and directories.

Acceptance:
- RC1.1 post-deploy Vercel deployment metadata: `gitCommitSha` ==
  `gitDirty` source SHA of this release AND `gitDirty != "1"`. Verified via
  `vercel inspect` on the real deployment, not local git status.
- Release worktree created with `git worktree add --detach <dir>
  <FINAL_RUNTIME_SHA>`; `git status --porcelain=v1 --untracked-files=all`
  prints NOTHING (with the node_modules symlink present).
- No deploy from the development checkout.

### WS2 — Mobile header

- Below `md`: header shows mark+wordmark left; primary CTA + ONE 44px menu
  button right. The standalone appearance icon toggle is NOT rendered.
- At `md` and above: the icon toggle is present (desktop unchanged).
- Appearance lives only inside the single mobile menu (`variant="inline"`).
- 390px: no horizontal overflow on any of the four homes; CTA visible;
  exactly one menu button.
- E2E assertions added for all of the above (390px) plus desktop icon
  visibility.

### WS3 — Most Reliable wording

- Registry `most_reliable.explanation` = "Providers ranked by the BI-1.0
  reliability estimate, a Bayesian estimate derived from weighted verified
  provider outcomes. It is shown as a percentage but is not the literal
  percentage of jobs completed clean." + eligibility floor sentence.
- No public copy (registry, docs, tests) may describe the pillar as a literal
  completion share / evidence ratio.
- Methodology doc updated: the pillar is a Bayesian posterior from weighted
  outcomes (economic-value weighting, complexity, recency,
  repeat-counterparty damping, severity weights, model prior).
- Row format stays `Reliability 92% · 8 verified outcomes` (the word is
  "Reliability", not "% jobs completed").
- Implementation (ranking, gates) unchanged.

### WS4 — FoundersBid marketing money

- `FoundersWorkTicket` reward renders through `trimZeroDecimals`: ₹85,000 /
  $1,000 (no .00). Nonzero minor units stay exact (₹85,000.50, $1,000.50).
- Accounting/detail/ledger surfaces keep the exact formatter.

### WS5 — Money core INR + USD

- One client-safe registry in `src/lib/money.ts`:
  `SupportedCurrency = "INR" | "USD"` with code / locale (en-IN, en-US) /
  minor digits (2, 2) / symbol (₹, $).
- `formatMinor(10000000,"INR") === "₹1,00,000.00"`
- `formatMinorTrimmed(10000000,"INR") === "₹1,00,000"`
- `formatMinor(10000000,"USD") === "$100,000.00"`
- `formatMinorTrimmed(10000000,"USD") === "$100,000"`
- `formatMinor(100050,"USD") === "$1,000.50"`
- No "USD 1,00,000.00"; no Indian grouping for USD; no symbol+code doubling.
- Unknown currency at the formatter boundary THROWS (never assumes INR).
- `ACCEPTED_CURRENCIES = {INR, USD}` at authoritative boundaries.
- DB strings are coerced with a throwing helper, never with `?? "INR"`
  fallbacks on real records.

### WS6 — Viewer region default

- ONE server-side resolver (`src/lib/viewer-currency.server.ts`):
  - deployed runtime: trusted Vercel edge header `x-vercel-sc`; `IN` → `INR`,
    any other value / missing → `USD`.
  - non-deployed: explicit `DEFAULT_VIEWER_CURRENCY=INR|USD` override;
    otherwise `USD`.
- Exposed to components as the safe string only (via the shell context /
  home loader), never as raw infrastructure headers.
- Tests: IN→INR, US→USD, AU→USD, GB→USD, missing→USD, override in dev, no
  client-form-field can pick a payment currency.

### WS7 — Region-aware samples

- `sample-content.ts` carries an explicit amount set per currency
  (illustrative, NOT FX-converted):
  - Founders hero: ₹85,000 / $1,000; research sample: ₹40,000 / $500.
  - Culture hero: ₹50,000 / $600; UGC ₹20,000/$250; Photography ₹35,000/$425;
    Naming ₹25,000/$300; Music ₹30,000/$350.
  - Bidception INR tree: 100,000 = 10,000 + 30,000 + 20,000 + 25,000 +
    15,000 + 0. Bidception USD tree: 1,200 = 120 + 360 + 240 + 300 + 180 + 0.
    parent = captain + children + reserve for BOTH, pinned by tests.
- Samples keep `data-example="true"` + visible EXAMPLE / SAMPLE labels.
- No sample row in any table; no sample JSON-LD (existing tests keep pinning
  this).

### WS8 — Creation form default currency

- Bounty create (founders + culture), project create, Bidception funding:
  currency selector defaulting to viewer currency; sponsor explicitly picks
  INR/USD; unknown values rejected by zod (`z.enum`).
- Persisted to `bounties.currency` / `projects.currency` /
  `parent_works.currency` (columns already exist since 0013/0016; no
  migration).
- Selecting a different currency does NOT convert numbers (no FX anywhere).
- Once funded, currency is immutable (no edit path exists; documented).
- Minimum bounty floor stays 100,000 minor units in both currencies
  (₹1,000 INR / $1,000 USD); the form hint names the currency.
- Child works under a parent inherit the parent's currency (materializer
  uses `parent.currency`, never a literal "INR").

### WS9 — Payment provider currency safety

- `ProviderCapabilities` gains `currencies` (collection currencies the
  provider actually supports): Cashfree `["INR"]`, fake `["INR","USD"]`.
- Cashfree stays INR-only; `createOrder` keeps its hard guard.
- Funding entry points (`publishBountyForFunding`, `fundProject`,
  `publishParentForFunding`) check provider currency support BEFORE any DB
  write and return `{ ok:false, code:"unsupported_currency" }` with a clear
  server-side message.
- Tests: Cashfree rejects a USD order before any provider call; fake provider
  exercises a USD order; funding still OFF in production.

### WS10 — Market Rates currency partition

- `marketRateFor(product, category, currency, threshold)` — every SQL query
  filters `currency = $requested`. No mixed-currency arrays, ever.
- `MarketRateSample` carries `currency`.
- `/market-rates?currency=INR|USD` URL-addressable + small selector; unknown
  value normalizes to the viewer default (documented behavior, no 404).
- Page labels name the currency; 0 outcomes in a currency shows an honest
  empty/insufficient state, never INR numbers labelled USD.
- Homepage preview consumes `marketRateFor(null, cat, viewerCurrency,
  MARKET_RATE_MIN_SAMPLE)` — same gated source as the page.
- Test: a fixture with 10+ completed INR and 10+ completed USD outcomes in
  one category produces two independent aggregates with correct medians; the
  medians differ so a mixed query could not pass.

### WS11/WS12 — BI-1.0 stays INR-native

- `RoleOutcome` gains `currency` (the work item's persisted currency, loaded
  from `bounties/projects/parent_works/disputes.currency` — all NOT NULL
  default 'INR').
- The economic-value gate: only `currency === "INR"` amounts enter
  `valueFactor` / event weights. Any non-INR outcome keeps its FACTUAL
  completion evidence (it still counts as an outcome for reliability,
  experience, reviews, caps) but its economic amount is scored at the floor
  (`valueFactor(0) = 0.75`) — the documented no-missing-amount behavior. A
  USD cent is never read as an INR paise.
- Verified volume = INR-denominated outcomes only;
  `trust_score_snapshots.verified_volume_currency` stays 'INR' (option A:
  scope explicitly labelled in docs). No mixed-currency sum, no FX.
- The fingerprint includes outcome currency, so a cache built before the gate
  cannot be reused for changed economics.
- The projector persists the TRUE amount + TRUE currency into
  `trust_events` (factual provenance replaces the old literal `'INR'`).
- No BI-1.0 constant changes; all existing INR fixtures produce exactly the
  same numbers (existing trust tests stay green).
- Documented: "BI-1.0 is INR-native. Cross-currency economic normalization
  requires a new model version / explicit normalization specification before
  non-INR economic value can affect the Bid Index."
- **Migration: NONE** — every currency column already exists (0013/0014/0015/
  0016/0018). Stated explicitly in the report.

### WS13 — Real work display

- Every real-record money surface renders with ITS persisted currency:
  bounty award lines, proposal quotes, selected-quote line, admin payment
  table, graveyard offer input labels, Bidception tree/panels (already
  currency-aware in most places). No accidental `formatMinor(x)` default-INR
  on records that carry a currency.

### WS14 — CultureBid DNS

- Rechecked at release time (`dig`/resolver on apex vs www). Recorded
  honestly in the report; www stays canonical until the apex is genuinely
  fixed. No false PASS.

### WS15 — Branch protection

- Documented recommended GitHub ruleset (require CI + CodeQL green, no force
  pushes) in the report + ops notes. NOT enabled in this phase (no PR-based
  workflow change without explicit authorization).

### WS16 — SEO

- No indexing-policy changes in RC5.1.

## Release gate (this phase)

lint 0 · typecheck clean · full test matrix (unit + PGLite + e2e critical
paths + marketplace journey + style-audit 390/768/1440) · complexity 0 ·
contrast 2/2 · public-copy clean · npm audit 0 · CI green · CodeQL green ·
preview of exact pushed SHA verified (INR-forced fixture + USD default) ·
production deploy from clean detached worktree · Vercel metadata
`gitDirty != 1` · 4-domain route sweep with zero unexpected 5xx · funding
OFF · verification OFF · docs + report + STATE.

## Stop conditions

See the RC5.1 spec (non-USD in BI-1.0, mixed Market Rates, fake FX, currency
mutation of funded work, dirty metadata, CI/CodeQL failure, funding
reachable). Any of these → STOP and report, do not improvise.
