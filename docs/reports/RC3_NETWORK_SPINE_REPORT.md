# RC3 NETWORK SPINE / UI V2 — RELEASE REPORT

**Status:** COMPLETE — released to production and verified; post-release incident + hardening recorded in the addendum below.

## Release

- Branch: `rc3-network-spine` -> fast-forwarded to `main` (7 commits after
  `7315ad0`); final release SHA `85c2dc4` (app code) + docs commits.
- CI on the release SHA: run `33239509984` SUCCESS (gates: lint, typecheck,
  1454 mjs + 220 ts tests, build, artifact sanity, complexity gate,
  npm-audit-high; e2e: funded marketplace journey + critical paths on
  Playwright chromium). Iterations to green: workflow-parse fix (unquoted
  colon in a step name), then two E2E runner-race fixes (hydration and
  action-note early-match on slow runners) — each reproducing locally first.
- Preview: `dpl_EX2WMK9rUB6E8Mnd5rWD5CzD3JVT` from `0e28a02` (app-identical),
  verified (heads, switcher, robots, sitemap, IndexNow, security.txt).
- Production deployment (final, aliased): `dpl_E2UdhbQVjJq3kPqKRBHaLCk8MhUQ` — clean detached checkout of `c89bf13` (the docs-only commit recording this id deliberately triggers no redeploy); earlier prod deploys this session served identical app code: `dpl_8uUQ9dRq1ASTzFFCxNSRAvXzHoJV`, `dpl_Dc4KtXabx3rngNPVsrGvhEFgyNCc` (aliased to all
  four domains), deployed 2026-08-29 ~07:03 UTC from a detached, clean
  checkout of the final pushed SHA `c90f36e` (docs-only successor of app
  SHA `85c2dc4`). An intermediate prod deploy `dpl_Dc4KtXabx3rngNPVsrGvhEFgyNCc`
  served the same app code while the final docs commit was landing.
- Funding: OFF (no MARKETPLACE_MONEY_LIVE on any target; no migrations in
  RC3; nothing on the live sites takes payment).
- Production verification: 4/4 domains 200 (bidthrone.lol, foundersbid.lol,
  www.culturebid.lol, bidception.lol — apex culturebid.lol remains the
  documented DNS blocker); per-product title + theme-color + canonical
  (culturebid = www); auth-aware CTAs; funding-off copy live; wrong-host
  301 (bidthrone/bounties -> foundersbid) and www->apex 301; sitemap,
  robots, IndexNow key 200; security.txt live; CSP with per-request nonce +
  full header baseline (HSTS is Vercel's); branded 404; zero 5xx in
  production logs (the only "error" lines are intentional 404 probes and a
  bot probe, both correctly rejected).

- Post-release production state (schema-incident fix, boot schema gate, H1 copy fix, error-page sanitization, current deployment ids): see the addendum below and docs/STATE.md.

## Correctness fixes

- **Graveyard detail status bug (the mandatory one).** The loader's SQL
  projected `screenshots` but NOT `status` while the row type claimed both;
  at runtime `listing.status` was `undefined`, so publish/withdraw/
  mark-transferred/buyer-offer/accept-reject controls never rendered and the
  status kicker was blank. Fixed by extracting `getGraveyardDetail` (row type
  == SQL projection) and rendering every status-dependent control from the
  pure `graveyardControls` matrix; the matrix also exposed and fixed a
  second silent bug (UI offered Withdraw in UNDER_OFFER where the engine
  refuses it). Regression tests: `src/lib/marketplace/state.test.ts`
  (would fail on the old query).
- **Graveyard included-checkbox bug.** `graveyard.new` rendered checkboxes
  with `name={k}` but read `inc-${k}` on submit — every "what is included"
  selection was silently dropped. Fixed (state-driven checkboxes).
- **Bounty detail H1 "undefined" (RC2-era production bug).** `getBountyDetail`
  did not select `b.title` while `BountyPublic` claimed it — every public
  bounty detail page rendered `<h1>undefined</h1>` in production. Fixed the
  projection; regression test `bounty-detail-projection.test.ts` fails on
  the old query.
- **Bidception allocate form sent no `kind`.** The engine requires
  `kind: BOUNTY | PROJECT` (+ spec); the UI never sent it, so the allocate
  action could only fail. The workspace allocation form now carries kind +
  category/deadline/cap and maps unit numbers to real child ids.
- **Apply/Submission feedback disappearing.** POST serverFns invalidate the
  route and the remount dropped parent-held state — a successful application
  could look like nothing happened. Apply/Submit now render their result
  locally AND the page reloads to the authoritative state.
- Real 404s, auth-aware CTA, product theme-color, navigation active states
  (details in the sections below).

## Security changes

- `authz.getSession`: an internal auth/DB failure surfaced as a 500 with the
  request-id envelope (logged `[authz] …`), never as a silent "anonymous
  user"; shell context degrades anonymously but logs. Tests:
  `src/lib/authz.test.ts`.
- Cashfree consolidation: `src/lib/payments/provider.ts` is the ONLY module
  defining credential lookup, API host, webhook signature verification,
  replay window and PAID interpretation; the legacy Phase 00
  `src/lib/cashfree.ts` was removed (its still-needed settlement surface
  — `verifyCashfreeWebhook`, `cashfreeOrderIsPaid` — lives on and delegates
  to the provider class). `createCashfreeSession` (dead since Phase 00) was
  deleted with a dated addendum in `docs/04_PAYMENTS_AND_TRUST.md`.
  Webhook battery extended (malformed JSON, missing order id, paid-once,
  effect-failure rollback); funding stays OFF throughout.
- Dev/E2E endpoints production-simulation tests (`tests/dev-endpoints-deployed-guard.test.ts`)
  pin 403 + no state leak under `VERCEL_ENV` and the second
  PAYMENT_PROVIDER guard.
- `/.well-known/security.txt` served host-aware (existing contact@ channel,
  +90d expiry, reachable-origin canonical).
- CSP audit documented in `docs/05_SECURITY.md` (`style-src 'unsafe-inline'`
  kept with justification: sonner runtime stylesheet; `img-src` not
  loosened — graveyard screenshots stay unrendered by design).
- Security automation: dependabot.yml, codeql.yml, CI actions pinned to
  commit SHAs, `npm audit --omit=dev --audit-level=high` gate.

## Complexity changes

Measured with `scripts/complexity-report.mjs` (ESLint Linter API + TS AST —
no invented numbers); baseline snapshot `docs/reports/rc3-complexity-before.json`.

Before (production code):
- 9 functions with cyclomatic complexity > 15 (max 38,
  `entityMetaFor`), max nesting depth 5, 22 functions over 120 non-blank
  lines (max 333).

After:
- 0 complexity/depth violations (gate: CC<=15, depth<=5, production-only).

Refactors by business responsibility (not metric gaming):
- bidception.server: `allocateChildWork` -> loadAllocatableParent /
  parentAllocationBalance / nextChildSeq / materialize{Bounty,Project}Child /
  insertChildWorkRow (same transaction); `completeChild` ->
  linkedCompletionBlocker. Plus the RC1-R6 captain picker data
  (`listEligibleCaptains`) and the child-kind fix.
- bounties.server: applyToBounty -> applicationGuard (pure) +
  applicationBlocker (tx). projects.server: selectProposal ->
  proposalMilestoneError + childAllocationBlocker.
- graveyard.server: createListing -> listingSecretError + insertListingRow.
- settlement.server: applyBidEffect -> rebidEffect + newListingEffect.
- seo-host middleware: entityMetaFor -> per-entity resolvers.
- request-id middleware: logging/envelope/fresh-response helpers.
- webhook route: table-driven paid-event classification.
- legal.ts: legalDoc -> per-document builders (text verbatim).
- UI: page bodies split into section components (BountyMain/BountyPanel,
  ProjectMain/ProjectPanel, GraveyardMain/GraveyardPanel, shell nav/footer,
  home sections, form steps) — no state-machine changes.

## UI system

- Tokens: layout canvases (1240/1080/720), product accents
  (contrast-verified >=4.5:1 light+dark), radii 8/12, hairline borders,
  global focus-visible, reduced motion, skeleton pulse.
- Components (src/components/ui/): Button/IconButton/ButtonLink,
  Field/Input/Textarea/Select/CheckRow, MoneyValue/MoneyBreakdown,
  StatusBadge, Avatar/IdentityLine/SkillTags, EmptyState/ErrorState/
  InlineNotice/LoadingRows, PageHeader/SectionHeader/FormSection,
  MarketplaceRow/FilterBar/FilterChip/SortControl/StepIndicator/StickyPanel,
  Metric/DataTable/ProgressBar/BudgetBar, ReviewBox.
- Product skin verified in-browser: founders #97431d, culture #6d28d9,
  bidception #0c6b62, bidthrone #4f46e5 (light) — each product's computed
  `--accent` asserted during visual QA.
- Mobile: 0px horizontal overflow at 390px on all key pages; 44px targets;
  menu closes predictably with aria-expanded.

## FoundersBid

Home (marketplace-first 7/5 hero with live preview or labelled example),
browse rows with real sponsor identity + URL-backed filters, 8/4 detail
with sticky decision panel, 5-step creation with conditional reward fields
and the server-computed fee plan, /post chooser.

## CultureBid

Format-first home and browse cards (icon system, platforms, slots),
"What are you commissioning?" creation with the structured brief step
(formats/platform/licensing/posting/performance) on the shared engine.
No FoundersBid copy leakage (guard-pinned).

## Bidception

Workspace detail: work-unit tree (real depends_on), stacked budget bar
(total = allocated + captain fee + available, from the ledger fields, no
implied movement), completion progress, searchable eligible-captain picker
(real members with a public signal), captain fee form, kind+spec allocation
form. List and home show the tree/budget shape with labelled examples.

## Bidthrone

Data-first home with live board slices + Bid Index signal + honest gates;
leaderboards as dense sections (rank/avatar/identity/skills/metric);
Bid Index as a DataTable with "Insufficient sample" cells — no zero prices,
no invented trend.

## Accessibility

Skip link; one h1 per page with readable text across display-font spans;
aria-current nav; labelled fields with aria-invalid + aria-describedby;
status = label + dot + color (never color-only); visible focus rings
(--ring, accent-based); reduced-motion support; live regions for action
feedback; 44px+ touch targets; the network switcher is an Escape/outside-
closable ARIA menu.

## E2E / CI

- `tests/e2e/critical-paths.mjs`: 38 assertions across the four products
  (verified count at the final state) — homes + accents + zero console
  errors, active nav, network switcher (canonical origins), dark mode +
  theme-color, mobile overflow/menu, signup/signin/signout, dashboard,
  verification seam, auth-aware CTA, /post chooser, URL-backed filters,
  conditional reward fields, culture format-first create, bidception auth
  gate, leaderboard methodology, bid-index sample gate, graveyard empty
  state, money-OFF posture. The home-H1 assertion is a prefix match with a
  no-code-punctuation rule: a syntactic artifact prepended to a major
  heading (the stray `);` that shipped on the founders home) fails CI
  instead of slipping through the original substring check.
- `scripts/marketplace-e2e.mjs` updated for the 5-step creation flow and
  state-based assertions: full funded journey (fake provider → webhook
  settlement → OPEN → apply (auto-approve) → work → submission → public
  listing).
- `scripts/prod-critical-smoke.mjs` (post-release, P0 #5): the 16-route
  production critical-route smoke (all four homepages, founders
  /bounties /projects /graveyard, culture /bounties, bidception
  /bidception, bidthrone /leaderboards /bid-index, signin, signup,
  robots, sitemap, security.txt) — mandatory after every production deploy
  (DEPLOYMENT.md step 10); homepage-only verification is explicitly
  insufficient.
- CI (ci.yml): gates job (lint/typecheck/test/build + complexity gate +
  prod-dep audit + measured WCAG contrast audit + schema-ledger drift test)
  and e2e job (playwright + both suites), actions pinned to commit SHAs;
  codeql.yml (js/ts, weekly); dependabot.yml.

## Visual QA

scripts/rc3-visual.mjs: 48 full-page captures at 390/768/1440 across all
four products (light+dark capable), asserting: HTTP 200, zero console/page
errors, 0px horizontal overflow, per-product computed accent, border-2
count (card-reduction test: 0 on the new surfaces), auth-aware CTA text,
per-product theme-color. Report: screenshots/rc3/report.json. One design
caveat is recorded honestly: this release's model could not render images,
so pixel-level inspection was complemented by these programmatic
assertions; the PNGs are committed for the operator to review.

## Known external blockers

- culturebid.lol apex DNS still misconfigured (private 10.x A records,
  re-verified during RC3 preflight); www.culturebid.lol remains the
  canonical origin. Exact fix: docs/ops/DEPLOYMENT.md "DNS note".

## Known non-blocking follow-ups

- GSC/Bing verification for the four properties (RC2 external action).
- E2E visual-diff in CI: intentionally release-QA only (font/render
  variance); the programmatic design assertions cover the regressions that
  matter.
- graveyard screenshots rendering (needs an image proxy or a deliberate,
  documented img-src decision).
- RC1 R6 leftovers outside RC3 scope: none — captain picker + child-kind UI
  shipped in RC3.

## Post-release addendum (2026-08-29)

**IndexNow first submission — done.** 18 public URLs (from the four
production sitemaps; culturebid via www, the only reachable origin)
submitted with `scripts/indexnow-submit.mjs --apply`; all four hosts
answered 202 (accepted). The key file (`/<key>key.txt`) had been serving
200 on the prod hosts since the RC2 release.

**Production schema-drift incident — found and fixed.** A full-surface
production sweep (beyond the theme-token probes) found
`foundersbid.lol/bounties` and `www.culturebid.lol/bounties` returning 500:
`column b.creative does not exist`. Root cause: the shared browse query
introduced in this release (a369c90) selects `bounties.creative`, added by
migration 0017; the production ledger had 0002–0016 but 0017 had never
been applied. Every other surface returned 200, and the app booted fine on
the stale schema — so the drift surfaced at the route, not at deploy time.

Fix:
- 0017 applied to production through the gated step
  (`scripts/migrate.mjs` dry-run → apply → verify): strictly additive
  (`bounties.creative jsonb`, `parent_work_id` links, `child_works.kind`).
  Both /bounties returned 200 immediately; no code change was needed for
  the data fix.
- New boot gate (`src/lib/schema-ledger.ts`, commit d28d380, shipped in the
  post-incident deployment): the Neon path asserts
  `_migrations` contains `REQUIRED_MIGRATIONS` before the first query;
  missing files fail loudly at boot with the exact names, and an
  unreadable ledger fails loudly too. A CI test pins REQUIRED_MIGRATIONS
  to the `migrations/` directory. DEPLOYMENT.md step 4 is now enforced,
  not just documented: a skipped apply fails the smoke test instead of a
  user's page two releases later. PGLite (local hermetic runtime)
  self-migrates to head and is exempt.

**Founders home H1 typo — found and fixed.** The hero heading rendered as
"); Get startup work done" (a stray `);` text node inside the `<h1>`).
The home-H1 E2E guard used a substring match, which a prepended artifact
cannot fail; it is now a prefix match plus a no-code-punctuation rule.
Fix: 40a2a16, deployment dpl_HaHbAwGeiojAgG3Fzpg1mxtfXd8Z, verified on the
live domain.

**Error-page sanitization (P0 #2) — two channels closed.** The schema
incident above is how the need was found: `AppErrorComponent` rendered raw
`error.message`, and Start's dehydrated hydration state additionally
serializes `Error` instances as `new Error("message")` inside the SSR
script payload — both reached the browser on every 500.
- Production copy is now fixed: "Something went wrong" / "Try again or
  contact support." (`import.meta.env.PROD` gate; the local built preview
  is a production build and sanitizes too, which is what you want to
  verify). Dev keeps diagnostics. The real error is written to the server
  log (`[route-error]` + the middleware's `[request <id>] ... -> 500`).
- The SSR 5xx document gets a fixed-position "Request ID: <id>" line
  injected by the request-id middleware BEFORE the hydration marker
  (outside the React tree, so hydration cannot wipe it), and every
  serialized `new Error("...")` in the payload is scrubbed to the
  sanitized placeholder (deployed runtimes only; local dev keeps the full
  payload). The injected value equals the `x-request-id` response header
  and both server log lines: one id the user can quote that correlates all
  three. Verified end-to-end on a production build by forcing a real SSR
  500 (unreachable DB) on the local built preview: the served document
  carries only the neutral copy + request line, zero internal strings,
  while the server log retains the full error under that exact id.
- Intentionally untouched: designed domain errors keep their mapped
  envelopes (`{ code, message, requestId }`) and in-form notices; 404s
  keep the designed page; 4xx/2xx HTML and JSON bodies pass through
  byte-identical. Regression tests: copy function, rendered page,
  injection placement, payload scrub (incl. escaped quotes), pass-throughs.

**Critical-route smoke + release preflight (P0 #4 / P0 #5).**
- `scripts/prod-critical-smoke.mjs`: 16-route production smoke (all four
  homepages + browse/detail + account + search/disclosure surfaces),
  production URLs or `--local` against a dev/built server with per-route
  Host headers. Mandatory after every production deploy (DEPLOYMENT.md
  step 10); homepage-only verification is explicitly insufficient.
- DEPLOYMENT.md step 4 now carries the explicit 7-point schema preflight
  (latest migration → dry-run → no deploy while pending → additive apply →
  zero pending → exact-SHA deploy → smoke), documented as an
  operator/runtime-side gate: the production DATABASE_URL never enters
  ordinary CI.
- Both ran on the final state below: 16/16 on the production deployment.

**Final verified production state (closeout).** App SHA `1fccb8f` →
deployment `dpl_EfRsnBWF9VJqQdJUVFmZPRUSd9wT` (`bidthrone-fzxtzfmz1`),
preview-verified first (`dpl_FY8xTpwcFtGE2ngaoW1Wt1XyvWRU`), CI green on
the exact SHA. All 16 critical routes 200; all four homepages + themes +
theme-colors correct; wrong-host 301s intact; funding OFF (no
MARKETPLACE_MONEY_LIVE on any target); production logs clean; both
/bounties 200; H1 clean. Rollback chain: dpl_EfRsnBWF9VJqQdJUVFmZPRUSd9w
→ dpl_HaHbAwGeiojAgG3Fzpg1mxtfXd8Z → dpl_5WugdV9fwyvWthw6kBVR6DLva58i →
dpl_8EUVrSncC6fPQ14237Tc1jGFoBNR → dpl_E2UdhbQVjJq3kPqKRBHaLCk8MhUQ (RC3
original).

## Final checklist (updated at release)

- [x] gates green locally (lint/typecheck/test/build/complexity/audit)
- [x] E2E green (both suites)
- [x] visual QA green (48 captures, 0 problems)
- [x] preview deployed + verified
- [x] production deployed + verified
- [x] logs inspected
- [x] funding OFF verified on prod
- [x] STATE.md updated