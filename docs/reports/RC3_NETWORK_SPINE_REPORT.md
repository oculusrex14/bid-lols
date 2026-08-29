# RC3 NETWORK SPINE / UI V2 — RELEASE REPORT

**Status:** IN PROGRESS (this file is completed at release; see the checklist at the bottom for the verified state)

## Release

- Final SHA: (filled at release)
- Production deployment: (filled at release)
- Production verification: (filled at release)

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

- `tests/e2e/critical-paths.mjs`: 30 assertions across the four products —
  homes + accents + zero console errors, active nav, network switcher
  (canonical origins), dark mode + theme-color, mobile overflow/menu,
  signup/signin/signout, dashboard, verification seam, auth-aware CTA,
  /post chooser, URL-backed filters, conditional reward fields, culture
  format-first create, bidception auth gate, leaderboard methodology,
  bid-index sample gate, graveyard empty state, money-OFF posture.
- `scripts/marketplace-e2e.mjs` updated for the 5-step creation flow and
  state-based assertions: full funded journey (fake provider → webhook
  settlement → OPEN → apply (auto-approve) → work → submission → public
  listing).
- CI (ci.yml): gates job (lint/typecheck/test/build + complexity gate +
  prod-dep audit) and e2e job (playwright + both suites), actions pinned to
  commit SHAs; codeql.yml (js/ts, weekly); dependabot.yml.

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
- First IndexNow submission (operator).
- E2E visual-diff in CI: intentionally release-QA only (font/render
  variance); the programmatic design assertions cover the regressions that
  matter.
- graveyard screenshots rendering (needs an image proxy or a deliberate,
  documented img-src decision).
- RC1 R6 leftovers outside RC3 scope: none — captain picker + child-kind UI
  shipped in RC3.

## Final checklist (updated at release)

- [ ] gates green locally (lint/typecheck/test/build/complexity/audit)
- [ ] E2E green (both suites)
- [ ] visual QA green (48 captures, 0 problems)
- [ ] preview deployed + verified
- [ ] production deployed + verified
- [ ] logs inspected
- [ ] funding OFF verified on prod
- [ ] STATE.md updated