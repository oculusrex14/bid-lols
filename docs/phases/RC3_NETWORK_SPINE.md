# RC3 — NETWORK SPINE / UI V2

**Status:** IMPLEMENTING · **Branch:** `rc3-network-spine` from `main` @ `7315ad0` · **Funding: OFF (stays OFF for the whole release)**

## Objective

Upgrade the Bid Network from a technically competent MVP into a coherent,
polished, high-trust multi-product marketplace: one shared transactional
design system ("Network Spine") with four genuinely different product
surfaces, plus correctness, security and maintainability remediation, and a
production release with mandatory E2E in CI. The backend/product engine is
ahead of the UX; RC3 closes that gap without changing marketplace state
semantics, money invariants, or SEO behaviour shipped in RC2.

Architecture in one sentence: **shared spine, product skin** — the spine
owns navigation, account UX, switcher, type/spacing/grid, controls, forms,
money/status/identity primitives, empty/error/loading states; each product
owns its page morphology (opportunity browse, creative briefs, project
workspace, data intelligence).

## Current verified deployment state (preflight, 2026-08-28)

- `origin/main` = `7315ad0` (docs-only successors of code SHA `fb25a93`), CI
  green (run 33153644903). Working tree clean.
- Production runtime: RC1, SHA lineage `949a095` (last prod deploy 15h before
  preflight). RC2 is **preview-only** (`dpl_G6Xj5WcTK6zm6rkMB3QYQYQ7bwkB`).
- Money: no `MARKETPLACE_MONEY_LIVE` env var on any target → `moneyMode()` =
  `off` everywhere; `BETTER_AUTH_SECRET` production-only; `CASHFREE_MODE` set
  (value redacted). No new migrations required by RC3.
- CultureBid apex DNS still broken (public A = 10.0.1.3 / 10.10.0.1,
  verified again today; www 200). **External blocker** — keep www canonical,
  document exact fix, do not pretend it is fixed.
- Baselines: complexity audit at `docs/reports/rc3-complexity-before.json`
  (9 fns > complexity 15, 22 fns > 120 non-blank lines, max depth 5). E2E
  not in CI. No Dependabot, no CodeQL, CI actions unpinned, no runtime audit
  gate.

## Known bugs to fix (correctness, before any visual work)

1. **Graveyard detail status bug (mandatory).** `src/routes/graveyard.$id.tsx`
   loader projects `screenshots` but **not `status`**, while the row type
   claims `status: string`. At runtime `listing.status` is `undefined`, so
   every status-dependent control is broken: seller publish/withdraw/
   mark-transferred never render, the buyer offer box never appears, offer
   accept/reject never renders, and the status kicker shows empty. Fix:
   select `status`, drop `screenshots` from the detail projection (it is not
   display data — see 2), keep the row type equal to the projection.
   Regression test: a PGLite test asserting the detail query returns status
   for a real row, plus a pure `graveyardControls(status, isSeller, hasViewerOffer)`
   matrix test (would have failed pre-fix because `undefined` matches nothing).
2. **Graveyard screenshots.** Stored as `jsonb` of https-URLs (validated at
   input, max 6). CSP is `img-src 'self' data:` — remote screenshots cannot
   render without either loosening CSP or building an image proxy, and
   neither is safe here. Decision: **keep stored, keep validated, do NOT
   render**, document the limitation, design the detail page so a gallery
   slot can be added later (no fake placeholder). No `img-src` change.
3. **Navigation correctness.** Primary nav has no active state; Blog sits in
   every product's primary nav; Bidthrone CTA shows "Create account" to
   signed-in members; FoundersBid "Post work" dumps users straight into
   bounty creation even though Project is a first-class mode. Fixes:
   - active link: visible accent underline + `aria-current="page"`, nested
     detail routes keep their list parent active;
   - Blog moves out of primary nav into the footer (already there) + a
     compact "More" affordance is not needed;
   - CTA responds to auth: signed-in Bidthrone → "My profile" (own profile,
     else Dashboard); the other three keep their product action;
   - `/post` quick-choose surface on FoundersBid: Bounty vs Project, two
     honest descriptions, links to the two creation flows (a dedicated
     route, no modal state machine).
4. **Account language.** Signup/signin copy says one account for the network;
   add the truthful session caveat: "Your Bid Network account works across
   all four marketplaces. You may be asked to sign in again when moving
   between domains." No invisible-SSO promise.
5. **theme-color.** The static umbrella `#f4efe4` ships on every domain.
   Make it product-aware in SSR (per-product light value in the head
   injector, umbrella default kept for dev), updated by the mode boot script
   for dark. No hydration mismatch (attribute swap only).
6. **Bidception captain picker / child-spec UI (RC1 R6).** Raw internal ids as
   the captain-selection UX. Replace with a searchable eligible-profile list
   (name, handle, relevant metrics from real data) with a designed empty
   state when no eligible profiles exist. No fake captains.

## Architecture / complexity targets

- **Measured, not invented.** `scripts/complexity-report.mjs` (ESLint Linter
  API + TS AST, no new deps) is the audit tool; baseline snapshot committed.
  Gate thresholds (CI): complexity ≤ 15, nesting ≤ 5, function ≤ 120
  non-blank lines — chosen so the refactored tree passes with headroom;
  eslint rules added at `warn` for complexity > 12 / depth > 4 to catch
  drift, `error` enforced by the report gate, not by gaming thresholds.
- **Refactor by business responsibility**, keeping public exports stable:
  - `bounties.server.ts` (747) → split into queries / creation / participation /
    submissions-awards / funding, behind the existing facade exports.
  - `bidception.server.ts` (836) → parent lifecycle / child units / captain /
    budget policy / settlement / queries; atomic transitions stay in one
    transaction module each.
  - `projects.server.ts` (599) → queries / creation / proposals-selection /
    milestones-completion / funding.
  - `settlement.server.ts` (317) → legacy effect pass extracted to
    `settlement.effects.server.ts`; claim/verify/audit stay cohesive.
  - Route files > 250 lines (`bounties.$id`, `bidception.$id`,
    `bounties.new`, `graveyard.$id`, `projects.$id`) → presentational
    sub-components + small route-local helpers; no state-machine changes.
- **Cashfree single source.** `src/lib/payments/provider.ts` becomes the only
  module defining credential lookup, API host, signature verification,
  replay window, and payment-status interpretation. `src/lib/cashfree.ts`
  (Phase 00 legacy) is reduced to a documented compatibility surface:
  `verifyCashfreeWebhook`, `WEBHOOK_MAX_AGE_MS`, `cashfreeOrderIsPaid`
  (re-exports/delegates to the provider module — the four legacy pending
  orders settle through this path, semantics unchanged). `createCashfreeSession`
  has zero consumers (order creation was removed in Phase 00) and is
  deleted; `04_PAYMENTS_AND_TRUST.md` gets a dated addendum. No settlement
  behaviour changes: webhook-only entry, fail-closed, atomic claim,
  idempotent, provider re-verify.
- **authz fail-visible.** `getSession()` stops swallowing infrastructure
  errors: Better Auth's documented "no session" path still returns `null`;
  any thrown error (DB outage, auth stack fault) is logged with the request
  id and surfaces as `AuthzError(500, "auth_unavailable", …)` — a visible
  failure, not a silent anonymous user. No internal details to the browser.
  Regression tests for both branches via an injected session getter.

## Security targets

- Preserve every Phase 00/00.6/01 safeguard (capability enforcement,
  fail-closed webhook, replay window, host-only cookies, CSRF middleware,
  fake-provider-in-deployment refusal). No new env vars, no migrations.
- `security.txt`: host-aware `/.well-known/security.txt` served by the SEO
  middleware (+ dev twin), per-host contact email (existing
  `contact@<apex>` addresses, nothing invented), 90-day expiry,
  `Canonical` + `Preferred-Languages: en`.
- Dev/E2E endpoints (`/api/dev/*`, `/test/checkout/*`): keep the deployed-env
  refusal; add production-simulation tests (handler called with
  `VERCEL_ENV` set → 403, no DB access, no state leak).
- CSP: audit `style-src 'unsafe-inline'` — it IS required (sonner injects a
  stylesheet at runtime; Toaster passes inline style objects). Keep it,
  document why in `05_SECURITY.md`. All other directives unchanged and
  re-verified in the smoke battery. No `includeSubDomains`, no HSTS preload
  (CultureBid DNS).
- Security automation: `.github/dependabot.yml` (npm + github-actions,
  weekly, 5-PR cap); CodeQL `javascript-typescript` audit workflow (separate
  file, runs weekly + on PRs to main, languages limited to js/ts); pin
  `actions/checkout` + `actions/setup-node` to commit SHAs with version
  comments; add `npm audit --omit=dev --audit-level=high` as a CI gate
  (dev-only advisories deliberately out of scope; any unavoidable upstream
  high in prod-deps gets documented, not papered over).
- Webhook test battery (10 cases: no secret / bad sig / stale ts / malformed
  JSON / unpaid / paid / provider-unpaid / duplicate / already-settled /
  effect failure) retained and kept green; funding stays OFF throughout.

## Design system targets (Network Spine)

- **Type scale:** Outfit for all transactional UI (forms, tables, money,
  status, nav, cards, dashboards); Newsreader/Syne only for wordmarks, hero
  statements, editorial headings. Body 15-16px, data 13-14px, money tabular.
- **Grid:** 12-col desktop / 6 tablet / 4 mobile via primitives;
  canvases: `--canvas-wide` 1240px (marketplace browse/detail),
  `--canvas-app` 1080px (workspaces, dashboards), `--canvas-prose` 720px
  (blog/legal). Current `max-w-5xl` blanket lifts on marketplace + data
  surfaces; prose stays narrow.
- **Spacing:** 4px scale; dense inside rows/cards (8/12), generous between
  major sections (48-96). "Inverted density": quiet narrative, efficient
  product surfaces.
- **Surfaces/cards:** 1px hairline borders default; 2px only for focus,
  selected, high-emphasis CTAs, deliberate brand moments; no shadow on every
  card; large narrative sections borderless; real cards only for bounded
  objects (listing, project, profile, offer, metric block, modal). The
  "card inside card" pattern gets reduced — entities stay bounded, sections
  don't.
- **Radii:** controls 8px, cards 12px, popovers/modals 12px, pills only for
  status chips/tags.
- **Product accents** (accessible values, verified ≥4.5:1 as text on each
  product's surface in light AND dark; CTA pairs ≥3:1 for large text):
  FoundersBid warm copper, CultureBid violet/cobalt, Bidception teal,
  Bidthrone royal indigo (the default umbrella accent becomes Bidthrone's —
  bidthrone has no theme override today, so the `:root` palette IS
  Bidthrone's skin). Accent usage: primary CTA, selected filter, active nav,
  links, key status, data highlights. No full-page gradient backgrounds.
- **Status:** one semantic treatment — human label + dot/icon + color, never
  color-only; `DRAFT→Draft`, `OPEN→Open`, `FUNDED→Funded`,
  `UNDER_REVIEW→In review`, `COMPLETED→Completed`, `UNDER_OFFER→Under
  offer`, `TRANSFERRED→Transferred`, `WITHDRAWN→Withdrawn`,
  `AWARDED→Awarded`, `PROPOSAL_SELECTED→Provider selected`, … (map lives in
  one module, raw enum preserved in data).
- **Money:** one `MoneyValue` primitive (tabular numerals, locale grouping,
  integer minor units only) + `MoneyBreakdown` (reward / platform fee /
  sponsor subtotal visually distinct, "Funding off" note when mode is off).
- **Identity:** `Avatar` (initials fallback, deterministic neutral fill — no
  fake photos), `IdentityLine` (avatar + name + handle + role/skills
  chips), `SkillTags`.
- **Interaction states:** every control gets default/hover/focus-visible/
  active/disabled/loading; 120-180ms transitions; `prefers-reduced-motion`
  respected; visible `:focus-visible` rings (no browser-default-only focus).
- **Component list** (created where reuse is real, not forced):
  NetworkSwitcher, PageHeader, SectionHeader, Button, IconButton, Field,
  Input, Textarea, Select, Checkbox, RadioGroup, MoneyValue, MoneyBreakdown,
  StatusBadge, Avatar, IdentityLine, SkillTags, EmptyState, ErrorState,
  LoadingSkeleton, MarketplaceRow, FilterBar, SortControl,
  StickyActionPanel, StepIndicator, FormSection, InlineNotice, Metric,
  DataTable, ProgressBar, BudgetBar.

## FoundersBid UX

- **Home (marketplace-first):** hero 7/5 (headline + one paragraph + Post
  work / Find work | live opportunity preview or clearly-labelled example);
  then real open work (server-fetched; strong empty state + at most two
  labelled examples when empty); Bounty vs Project choice (the two modes as
  scannable cards, not prose); then categories; funding note stays small
  and once; blog link secondary. No multi-paragraph explanation before the
  marketplace.
- **Browse (`/bounties`):** wide canvas, dense scannable rows: reward
  (tabular) · title · sponsor identity when real · category · skills ·
  participants/cap · deadline (relative + absolute in title attr) · status.
  Truthful data only — no invented reputation badges. Filters that exist in
  the query layer are exposed (category, sort newest/ending-soon/reward,
  min reward) in URL search params: back/forward + deep links work; no fake
  filter chips. Empty state initial vs filtered are different.
- **Detail:** 8/4 split; sticky action panel with reward, structure, caps,
  deadlines, status, primary action; main column = overview, deliverables,
  acceptance, skills, IP/confidentiality, submissions (when authorized).
- **Projects browse/detail:** same discipline; sidebar emphasises budget,
  proposal deadline, stage, selected provider, milestones.
- **Creation:** progressive disclosure replacing the schema dump —
  Step 1 What needs doing (title/category/description/skills) →
  Step 2 What "done" means (deliverables/acceptance/IP) →
  Step 3 Participation (cap/qualification/deadlines) → Step 4 Reward
  (advertised amount + structure; **conditional fields only** —
  winner-takes-all renders no split fields; podium renders podium shares;
  finalist pool renders pool share) → Review (summary, exact fee, exact
  sponsor subtotal, funding-off statement). 8/4 with live sticky summary on
  desktop; step indicator + sticky bottom action on mobile. Server stays
  authoritative; per-field client validation; server errors map to fields.

## CultureBid UX

- Morphology: creative-format-first, not "Founders with another font".
- **Home:** visual composition from real data only (category/format icon
  system + live briefs); labelled examples when empty. No stock imagery,
  no fake thumbnails.
- **Browse:** cards emphasise reward, content format, platform/use context,
  creator slots, deadline, category, IP rules; format iconography (Lucide).
- **Creation:** first question "What are you commissioning?" → category
  choices (UGC, short video, photography, design, writing, naming, social
  content, music, other) → progressively revealed format-relevant fields on
  the shared creation framework (same engine, different sequencing/copy).
  No FoundersBid wording leakage (copy guard extended).

## Bidception UX

- The most structurally different surface: a **workspace**, not a detail
  card stack.
- **Parent detail:** main area = hierarchical work-unit list/tree (real
  parent→child data; dependency shown only where real dependency rows
  exist — no invented graph), sidebar = budget + captain + lifecycle +
  actions.
- **Budget bar:** stacked, mathematically reconciled from real ledger fields
  (total / allocated / committed / paid / unallocated; captain fee when the
  model has it; "reserve" only if that concept exists in the schema).
  Funding OFF rendered truthfully; accessible labels, not color-only.
- **Child units:** title, type, owner, budget, dependency, status, progress
  in a compact row; quick-scannable.
- **Captain UX:** searchable eligible-profile selection (name, handle,
  real reputation metrics), empty state designed; internal ids never the
  primary surface.

## Bidthrone UX

- Data-first: the home surfaces the leaderboards, Bid Index, and profile
  discovery as data objects, minimal explanatory chrome.
- **Leaderboards:** dense table (rank / identity / primary skills / wins /
  reliability / quality / period), per-board metric labels (the RC2 fix
  kept), methodology honest; empty boards keep the "empty is better than
  fake" philosophy with better composition.
- **Bid Index:** category table (median / range / sample / period); below
  threshold → "Insufficient sample", never zero-as-price; no computed
  trend without sufficient sample; sample-gate rules unchanged.

## Accessibility

Semantic landmarks; one h1 per page; ordered headings; skip-to-content
link; `aria-current`; native controls first; every form field labelled with
`aria-describedby`/`aria-invalid` on error; visible focus; ~44px touch
targets; no color-only status; reduced motion; no keyboard traps; live
region for async form feedback. Mobile menu: correct `aria-expanded`,
closes predictably (route change + Escape), hidden controls not focusable.
Playwright keyboard pass over the critical flows (tab order, focus rings,
menu, form, filter, stepper, sticky actions).

## E2E / CI

- **New `tests/e2e/`** (Playwright, node `assert`, same conventions as
  `scripts/marketplace-e2e.mjs`): hermetic against a local dev server with
  PGLite + fake provider. Critical paths: 4 homepages (desktop+mobile),
  nav active state, network switcher, dark mode toggle, signup/signin/
  signout, dashboard access, wrong-host 301, auth-aware CTA, `/post`
  chooser, bounty browse + URL-param filters + deep link, bounty create
  multi-step + conditional reward fields + review, project create/browse/
  detail, culture browse/create (no Founders leakage), bidception list/
  create/detail/budget reconciliation/captain picker, bidthrone
  leaderboards + bid-index sample gate, graveyard status controls (the
  regression), money-OFF copy in production-sim mode, dev endpoints 403 in
  production-sim.
- Existing `scripts/marketplace-e2e.mjs` (money-on happy path) stays and is
  also run in CI.
- **CI pipeline** (`.github/workflows/ci.yml`, Node 24, pinned actions,
  hermetic, no secrets): lint → typecheck → unit/integration → build →
  PGLite-artifact sanity → **E2E (dev server + browser)** →
  `npm audit --omit=dev --audit-level=high` → complexity gate
  (`COMPLEXITY_MAX=15 MAX_DEPTH_MAX=5 FN_LINES_MAX=120`).
  CodeQL separate workflow (js/ts only, weekly + PRs). Dependabot weekly.
- Visual QA: screenshots at 390/768/1440 for the key pages, inspected by
  hand (release QA, not a flaky CI gate); smoke baselines regenerated.

## Release criteria (all must be verified, not declared)

1. Gates: lint, typecheck, unit/integration, build, E2E, audit gate,
   complexity gate, CodeQL, smoke — all green on the release SHA.
2. Preview deployed from the exact pushed SHA; verified via real HTTP +
   browser (host routing, canonicals, sitemaps, robots, security headers,
   CSP, dev endpoints 403, zero 5xx in logs, money OFF visible, all four
   product contexts incl. CultureBid www).
3. Production deployed (RC2 also ships to prod this way — it is currently
   preview-only); verified on foundersbid.lol, bidthrone.lol,
   bidception.lol, www.culturebid.lol (apex: documented DNS blocker);
   post-deploy log inspection; rollback = re-deploy last known-good.
4. No secrets in diff/logs; no migrations; funding OFF; no RC2 SEO
   regression (entity heads, canonicals, sitemaps, robots, IndexNow key,
   blog 301s all re-verified in preview).
5. `docs/STATE.md` + this checklist + `docs/reports/RC3_NETWORK_SPINE_REPORT.md`
   updated with actual verification evidence.

## Rollback criteria

Revert production to the last known-good deployment (`vercel redeploy` of
the RC1/RC2-good deployment id) when any of: widespread 5xx, auth outage,
wrong-host routing breakage, broken CSS/assets, main surfaces unbrowsable,
DB errors, webhook behaviour change, unintended money behaviour, security
header regression. Then: diagnose, fix, full local gates, preview, verify,
redeploy, reverify.

## Out of scope

Live payout rail; enabling marketplace money; new gambling/paid-game
mechanics; chat/messaging; arbitrary file uploads; AI matching; notification
providers; new social graph; multi-currency; Phase 05 expansion;
pay-to-rank in any form; DNS provider access (CultureBid apex = documented
external blocker); GSC/Bing verification (human consoles, RC2 follow-ups).

## Workstreams and commit plan

WS0 spec/STATE (this file) · WS1 correctness (graveyard, nav, CTA, /post,
account language, theme-color) · WS2 security (authz, cashfree consolidation,
dev-endpoint tests, security.txt, CSP doc) · WS3 complexity (refactors +
gate) · WS4 spine (tokens, components, shell) · WS5 FoundersBid UX ·
WS6 CultureBid UX · WS7 Bidception UX · WS8 Bidthrone UX · WS9 E2E/CI/
security automation + visual QA · WS10 docs/report + release.
