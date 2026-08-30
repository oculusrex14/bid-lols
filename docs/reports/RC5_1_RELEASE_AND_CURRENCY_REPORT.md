# RC5.1 — Release Correctness + Mobile Cleanup + Currency Foundation (release report)

Date: 2026-08-30. Phase spec: `docs/phases/RC5_1_RELEASE_AND_CURRENCY.md`.
Small corrective release on top of the RC5 runtime. No redesign, no new
marketplace phase, no real payments, no TRUST_VERIFICATION_LIVE, no BI-1.0
constant changes, no AUD, no invented activity, no FX.

## 1. Final runtime SHA

`2de3489db780aa2c90cffcb9c6d93680756c0db3` (4 focused commits on top of the
RC5 docs commit `437c600`):

- `ae88dcf` fix(release): ignore node_modules symlinks so release worktrees stay clean
- `67e4f85` feat(currency): INR+USD work-currency foundation, viewer region default, currency-partitioned Market Rates
- `5beb932` test(currency): RC5.1 regressions
- `2de3489` docs(currency): RC5.1 currency law, BI-1.0 INR-native scope, Bayesian Most Reliable wording

## 2. Post-release docs SHA

Filled at the docs commit below this report (main after `2de3489`).
Docs-only: STATE.md, the phase doc status line, this report. No runtime change.

## 3. Production deployment

`dpl_BZfofYryfFtXhriUCcnjJ6RrQFLs` (`bidthrone-5em0fwm43-…vercel.app`),
aliased to all four canonical hosts; state READY/PROMOTED.

## 4. Actual Vercel gitDirty metadata (API-verified, not local-status-verified)

`GET /v6/deployments/dpl_BZfofYryfFtXhriUCcnjJ6RrQFLs`:

- `meta.gitCommitSha = 2de3489db780aa2c90cffcb9c6d93680756c0db3` (= FINAL_RUNTIME_SHA)
- `meta.gitDirty = <absent>` (not `"1"`; Vercel only sets the field when dirty)

The preview deployment (`dpl_HEDa5SPQ83iNTwwfXq7Epy1XguhH`) shows the same:
`gitCommitSha = 2de3489…`, `gitDirty` absent.

## 5. Why the old RC5 showed gitDirty=1

Root cause (reproduced empirically in a detached worktree at `c2423e5`):
the release worktree linked `node_modules` as a **symlink** into the dev
checkout for speed. `.gitignore` contained `node_modules/` — the trailing
slash restricts the pattern to directories. A symlink has git type `blob`,
so the link was **untracked AND not ignored**: `git status --porcelain`
reported `?? node_modules` inside an otherwise-clean tree, and Vercel's CLI
recorded `gitDirty=1` at deploy time. The RC5 report's "clean worktree"
claim was true of every TRACKED file; the untracked symlink slipped past
the status check as it was then written.

Fix: `.gitignore` now lists `node_modules` (no slash — matches file, symlink
and directory at any depth). Protocol hardened in `docs/ops/DEPLOYMENT.md`:
re-run `git status --porcelain=v1 --untracked-files=all` in the release
worktree IMMEDIATELY before `vercel deploy --prod`, and verify the actual
Vercel deployment metadata (`gitCommitSha` + `gitDirty != "1"`) after
deploy — a local clean status never substitutes for the platform metadata.
If metadata still reports dirty from an objectively clean worktree, STOP and
investigate the CLI/source mechanism instead of recording `gitDirty=0`.

Verified: the RC5.1 release worktree (detached at `2de3489`, with the
`node_modules` symlink and `.vercel/project.json` present) prints NOTHING on
that status command, and the resulting production deployment has
`gitCommitSha=2de3489` with `gitDirty` absent.

## 6. Migration

**NONE.** Every currency column RC5.1 needs already exists and is
`char(3) not null default 'INR'`: `bounties`, `bounty_awards`, `projects`,
`project_proposals`, `project_milestones` (0013); `money_events`,
`payout_obligations`, `disputes` (0014); `graveyard_listings` (0015);
`parent_works`, `child_works` (0016); `trust_events.currency` (+ the
reserved `normalized_base_amount_minor`/`base_currency` for a future
normalization spec) and `trust_score_snapshots.verified_volume_currency`
(0018). The production ledger stays `0002…0019`. No migration preflight
was required; none was run.

## 7. Supported work currencies

`INR` and `USD` — the explicit registry in `src/lib/money.ts`
(`SupportedCurrency`, `CURRENCY_CONFIG`: locale en-IN/en-US, 2 minor
digits, symbols ₹/$). Unknown codes fail visibly at every authoritative
boundary: `toSupportedCurrency` throws; creation inputs use
`z.enum(["INR","USD"])`; `marketRateFor` takes a required currency; the
sample accessors throw on unsupported currencies. No AUD this phase.

## 8. Region default policy

ONE resolver (`src/lib/viewer-currency.server.ts`):

- deployed runtime: trusted Vercel edge header `x-vercel-sc` — `IN` → `INR`,
  any other value or missing → `USD`;
- non-deployed (local dev/tests): explicit `DEFAULT_VIEWER_CURRENCY=INR|USD`
  override, otherwise `USD`. The override is honored ONLY outside deployed
  runtimes (pinned by test).

The result crosses to components as the safe string only (via the shell
context / home loader / market-rates loader). It is used exclusively for
sample objects, new-form defaults, and which Market Rates partition shows
first. It is never payment authority and never changes a persisted work
item's currency. No client form field, header or query parameter can pick a
payment currency (the market-rates `?currency=` is a display-partition
selection, validated to INR/USD, unknown values normalize to the viewer
default — documented on the page and pinned by E2E).

## 9. NO-FX policy

There is no foreign-exchange capability in this release: no live FX API, no
cached rate, no converted payouts, no historical conversion. Changing a
form's currency changes the DENOMINATION of the numbers already typed —
never their value (1000 stays 1000). The dead Phase 00 `src/lib/fx.ts`
module (live USD→INR fetch with 15-minute cache and a silent fallback rate
of 85 — exactly the class of component this law forbids) had zero code
importers and was DELETED together with its test. The `INR_PER_USD` Vercel
env var is now dead config (operator cleanup, non-blocking).

## 10. Cashfree currency support

Cashfree remains INR-only and is declared, not assumed:
`ProviderCapabilities.currencies = ["INR"]` on `CashfreeProvider`
(= ["INR","USD"] on the fake test provider). `createOrder` keeps its hard
INR guard, and every funding entry point (`publishBountyForFunding`,
`fundProject`, `publishParentForFunding`) calls
`unsupportedCollectionError()` BEFORE any state write or provider order and
returns `{ ok:false, code:"unsupported_currency" }` with a clear
server-side message. Tests pin: Cashfree rejects a USD order before any
network/credential access; the fake provider exercises USD end-to-end
(USD parent funds, settles, and its child bounty inherits USD). No fake
USD support was added to Cashfree; no USD→INR conversion is attempted.

## 11. Funding state

**OFF.** `vercel env ls` (all environments): no `MARKETPLACE_MONEY_LIVE`,
no `PAYMENT_PROVIDER`, no `TRUST_VERIFICATION_LIVE`, no
`DEFAULT_VIEWER_CURRENCY`. Live behavior: "Funding not live" chips on the
three marketplace shells (absent on Bidthrone, by design), creation
surfaces state drafts are free and funding is not enabled, the fake
provider is refused in any deployed runtime. The test runtime (dev/CI) runs
`PAYMENT_PROVIDER=fake MARKETPLACE_MONEY_LIVE=1` → `sandbox` → chips
intentionally absent there (mode-tolerant assertions, unchanged from RC5).

## 12. BI-1.0 INR-native limitation (documented boundary)

"BI-1.0 is INR-native. Cross-currency economic normalization requires a new
model version / explicit normalization specification before non-INR
economic value can affect the Bid Index."

Implementation (no constant changed):

- every evidence outcome carries the work item's persisted currency
  (loaded from `bounties/projects/parent_works/disputes.currency`);
- only `currency === "INR"` amounts enter `valueFactor` (INR paise,
  rupee thresholds); a non-INR outcome KEEPS its factual completion
  evidence (it still counts for reliability, experience, reviews, caps)
  but its economic amount is scored at the floor factor 0.75 — the
  documented no-missing-amount behavior. A USD cent is never read as an
  INR paise;
- verified volume sums INR-denominated amounts only
  (`trust_score_snapshots.verified_volume_currency` stays `'INR'` — the
  INR-only scope is the documented contract, option A of the workstream);
- the snapshot fingerprint includes outcome currency (a pre-gate cache
  cannot be reused once a denomination matters);
- the projector now persists the TRUE amount + TRUE currency into
  `trust_events` (the old literal `'INR'` parameter is gone);
- pinned by `tests/trust-currency.test.ts` (PGLite end-to-end) +
  `score-core.test.ts` unit gates; all pre-existing INR trust tests pass
  unchanged (the gate is a no-op for all-INR members — fixture bands from
  RC4/RC4.1 still hold).

## 13. Market Rates currency partition rule

Currency is part of the aggregate identity.
`marketRateFor(product, category, currency, threshold)` filters
`currency = $requested` in BOTH the completed-bounty and completed-project
SQL legs; `MarketRateSample` carries its currency; the `/market-rates`
page is URL-addressable per currency with a small selector, labels every
surface with the currency, and shows an honest empty state when a
partition has zero outcomes (never a fallback to the other currency's
numbers). The homepage Bidthrone preview consumes the SAME
`marketRateFor()` source in the viewer-default currency. Pinned by
`tests/currency-foundation.test.ts`: a 10+10 mixed-currency fixture
produces two independent aggregates with currency-pure medians; empty
partitions stay empty; the preview equals the live source per partition.

## 14. Exact tests (new/updated in this release)

- `tests/currency-foundation.test.ts` (new, PGLite): Market Rates currency
  partition (11 INR + 11 USD in one category → two aggregates, pure
  medians; empty USD partition honest; homepage preview = live source);
  bounty + project creation persists the sponsor's currency (USD and
  default-INR paths); proposals inherit the project currency; viewer-region
  resolver (IN→INR; US/AU/GB/missing→USD; dev-only override; deployed
  runtime ignores the override; no client source can pick the currency).
- `tests/trust-currency.test.ts` (new, PGLite): USD outcome never scored as
  INR paise (floor factor, INR-only volume, facts intact); projector
  persists true amount + true currency (USD round-trip, INR twin stays
  INR).
- `tests/money-display-theme.test.ts`: INR/USD grouping, symbols, trim in
  both currencies, cents/paise retention, major display, unknown-currency
  rejection (the old JPY pass-through test is replaced by the rejection
  test — JPY is not a supported work currency).
- `tests/sample-content.test.ts`: both sample sets flagged/labelled/integer;
  INR and USD Bidception trees reconcile exactly to the minor unit; INR/USD
  sets pinned as independent illustrative values; no sample rows in any
  table; unknown sample currency throws.
- `tests/leaderboard-registry.test.ts`: Most Reliable copy pins
  (Bayesian wording present; literal-share/evidence-ratio wording absent;
  row format unchanged).
- `tests/bidception-funding.test.ts`: USD parent funds through the fake
  provider (parent + payment rows persist USD; child bounty inherits USD);
  Cashfree declares INR-only and rejects a USD order before any provider
  call.
- `tests/trust-rc41.test.ts`: fingerprint unit gains the currency fact;
  §5.7 preview test uses the explicit currency signature.
- `src/lib/trust/score-core.test.ts`: currency on the outcome helper +
  three gate tests (USD floor, INR-only volume, all-INR invariance).
- `tests/e2e/critical-paths.mjs`: 61 assertions total — new: market-rates
  currency selector + `?currency=INR` partition label + unknown-value
  normalization; Most Reliable Bayesian copy on the live page; mobile
  header shows no standalone appearance icon (visibility-based) with the
  CTA still visible; desktop keeps the icon.
- `scripts/style-audit.mjs`: responsive matrix gains `/bounties/new`
  (form currency step) and `/market-rates?currency=USD`; 106 captures.
- Existing trust suite (model-v1, score-core, trust-integration,
  RC4/RC4.1) passes unchanged — BI-1.0 invariance.

Totals at the runtime SHA: **2039 tests** (1693 mjs + 346 ts), 0 failures.

## 15. CI run

`33294850970` (workflow "CI", main, head `2de3489…`) — success. Gates:
lint 0 errors, typecheck clean, full test matrix, vite build + PGLite
artifact sanity, complexity gate 0 violations, `npm audit --omit=dev
--audit-level=high` 0.

## 16. CodeQL run

`33294850935` (head `2de3489…`) — success.

## 17. Production route sweep

- `scripts/prod-critical-smoke.mjs`: **17/17** at 200 (incl. both
  marketplace/browse surfaces that caused the RC3 incident).
- Spec route list: bidthrone `/`, `/leaderboards`, `/bid-index`,
  `/market-rates`, `/market-rates?currency=INR`,
  `/market-rates?currency=USD`, `/blog`, `/signup`, `/terms`; foundersbid
  `/`, `/bounties`, `/projects`, `/graveyard`, `/post`, `/blog`, `/terms`;
  www.culturebid `/`, `/bounties`, `/blog`, `/terms`; bidception `/`,
  `/bidception`, `/blog`, `/terms` — **all 24 at 200**.
- Broad posture sweep: 108 routes across the four domains — **zero 5xx**
  (200/301/307-signin only, per the established posture).
- Live RC5.1 surface checks on production: dark-first `data-mode="dark"` +
  `theme-color #0c0d10` on Bidthrone; Market Rates currency-labelled
  partitions with honest empty states; Most Reliable Bayesian wording live;
  "Funding not live" chips on exactly the three marketplace hosts; sample
  money rendered in the viewer-default currency with zero-decimal trimming
  (this vantage resolved to the USD partition: `$1,000`/`$500` on
  FoundersBid; the INR set was verified through the forced
  `DEFAULT_VIEWER_CURRENCY=INR` fixture: `₹85,000`/`₹40,000` trimmed,
  culture `₹50,000/20,000/35,000/25,000/30,000`, Bidception tree
  `₹1,00,000 = 10,000 + 30,000 + 20,000 + 25,000 + 15,000 + 0`).
- App security headers in the RC5.1 build (CSP with nonce, nosniff,
  referrer-policy, permissions-policy, x-request-id) verified by invoking
  the built Nitro handler directly; HSTS is set by the Vercel edge and was
  re-observed on production.

## 18. Current CultureBid DNS status

Rechecked 2026-08-30 at release time: `culturebid.lol` apex STILL returns
private `10.x` addresses (10.10.0.1 / 10.0.1.3) — the apex is UNREACHABLE
and was NOT fixed by this release; `www.culturebid.lol` CNAMEs to Vercel
and serves the app (200 on all swept www routes). No false PASS: the apex
remains an external operator action; www stays canonical until it is
genuinely fixed (fix/rollback runbook: `docs/ops/DEPLOYMENT.md` "DNS note").

## 19. Rollback deployment

`dpl_BmNTfoudCa2417AsevLXFcaYL7xR` (RC5 runtime `c2423e5`,
`bidthrone-4wjwso2ol-…`). Rollback = re-point the four aliases to that
deployment (`vercel alias` / dashboard); the production database schema is
unchanged by RC5.1 (no migration), so no database rollback step exists and
the RC5 runtime is fully compatible with the current ledger.

## Release-gate summary (as executed)

- implementation complete; all tests green locally (2039) and in CI;
- CI + CodeQL green on the exact runtime SHA;
- preview of the exact pushed SHA verified (metadata SHA + gitDirty absent;
  dark-first; USD market-rate partition; security headers in build);
- clean detached release worktree confirmed (porcelain empty immediately
  before deploy, node_modules symlink + .vercel/project.json present);
- production deployed from that worktree; Vercel metadata
  `gitCommitSha = 2de3489`, `gitDirty` absent;
- 17/17 smoke + 24 spec routes + 108-route sweep, zero 5xx;
- funding OFF (env-listed + live chips), verification OFF;
- CultureBid DNS recorded honestly (apex still broken, www canonical);
- docs updated: STATE.md, phase doc, 02/03/04 + methodology + DEPLOYMENT.

## Operator follow-ups (unchanged + new)

- CultureBid apex DNS (still broken — see §18).
- GSC / Bing Webmaster verification (all four properties).
- Vercel↔GitHub integration + branch protection. **Recommended GitHub
  ruleset (documented, NOT enabled in this phase):** target branch
  `main`; require status checks `CI` (gates job) and `CodeQL` before
  merging; block force pushes; require pulls from the same branch is
  optional (the autonomous direct-to-main workflow continues until this is
  explicitly authorized).
- NEW: remove the dead `INR_PER_USD` Vercel env var (Development +
  Production) — `fx.ts` no longer exists.
- X/Twitter cache refresh check via `https://bidthrone.lol/?share=trust-v1`.
- Confirm the `contact@foundersbid.lol` mailbox at the operator side.
