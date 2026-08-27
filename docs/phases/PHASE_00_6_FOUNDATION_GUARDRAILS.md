# PHASE 00.6 — Foundation Guardrails

Status: IN PROGRESS
Started: 27 August 2026
Follows: PHASE_00_5_ALIGNMENT.md (COMPLETE 2026-08-27)

## Purpose

Small corrective phase for foundation seam defects found by the post-release
source + production audit of Phase 00.5. Objectives ONLY:

1. correct founding-access data semantics (WS1)
2. correct privacy disclosure (WS2)
3. harden analytics semantics (WS3)
4. fix middleware composition defects (WS4)
5. establish independent CI (WS5)
6. small canonical/asset cleanup (WS6, WS7)

Hard constraints:

- No marketplace features. No accounts. No bounty/project implementation.
  No product-direction changes.
- **No production deployment in this phase.** Release = push a clean,
  reviewed SHA + wait for CI green + create a Vercel PREVIEW from that exact
  SHA, then STOP for external audit.
- The 4 legacy pending Cashfree orders remain untouched (webhook-only).

## Acceptance criteria

### WS1 — Waitlist data model

- **AC-1.1** Additive migration `0011_waitlist_normalize.sql`:
  `waitlist_people(id uuid pk, email text, email_norm text unique,
  created_at, updated_at)` + `waitlist_interests(id uuid pk, person_id uuid
  not null references waitlist_people(id), product_key text check, role text
  check, consent_text text, consent_at timestamptz, created_at, updated_at,
  unique(person_id, product_key, role))`. Backfill existing
  `waitlist_entries` rows into people+interests (idempotent; no data loss;
  the old table is NOT dropped by this migration).
- **AC-1.2** One email can simultaneously hold multiple interests (e.g.
  FoundersBid/sponsor + FoundersBid/builder + CultureBid/creator +
  Bidception/captain); verified by test.
- **AC-1.3** Resubmitting an identical (person, product, role) interest is
  idempotent: no duplicate row; consent_text/consent_at/updated_at refresh.
- **AC-1.4** The server writer targets the new tables only (no new writes to
  `waitlist_entries`); existing prod rows are preserved and backfilled.
- **AC-1.5** Migrations verified against the hermetic PGLite database first;
  the gated apply to the shared Neon database is additive-only (dry-run →
  apply → ledger 0002–0011 → row-count snapshot pre/post).

### WS2 — Privacy truth

- **AC-2.1** The privacy page discloses that the app MAY TEMPORARILY PROCESS
  the client IP address in memory for abuse prevention / rate limiting when
  submitting the form; that it is NOT persisted to the application database;
  that it is NOT used for advertising or profiling; and that Vercel may
  independently process request information as hosting infrastructure.
- **AC-2.2** No unqualified "we do not store IP addresses" claim remains in
  public copy (source-scan + rendered-page check).

### WS3 — Analytics semantics

- **AC-3.1** `trackPageView` / `trackVisit` / `trackOutboundClick` no longer
  accept or trust a client-supplied product key: the server determines
  `product_key` from the request Host inside the serverFn; the client payload
  carries nothing the server cannot itself determine.
- **AC-3.2** `TrackProductView`'s sessionStorage failure path is deliberate
  and tested: storage works → at most one visit per session per product;
  storage unavailable → the visit is recorded per page impression (documented
  degradation). Decision logic extracted to a pure, unit-tested function.
- **AC-3.3** Metric definitions are documented precisely (module docs +
  phase notes): `views` = page impressions; `visits` = per-browser-session,
  per-product deduped count (DEGRADES to per-impression when session storage
  is unavailable — therefore NOT a unique-visitor count and MUST NOT be
  labelled as one); `clicks` = outbound link clicks.
- **AC-3.4** No public surface exposes these counters as bidder/sponsor
  statistics (there is none today; the prohibition is documented).
- **AC-3.5** www→apex normalization: `www.bidthrone.lol`,
  `www.foundersbid.lol`, `www.bidception.lol` return an HTTP 301 permanent
  redirect to the same-path apex URL (edge-level on Vercel where possible,
  middleware-level on the local built preview, mirrored in dev).
  **culturebid is excluded** (apex DNS broken; www is the only working
  origin) until the DNS fix. The redirect decision is shared logic with unit
  tests. After the redirects exist, canonical URLs and redirect targets
  agree (apex-only sitemaps/canonicals — verified).

### WS4 — Request / error composition

- **AC-4.1** A stale/unknown serverFn call, AFTER ALL middleware has run,
  returns: status 404, JSON body `code: "stale_client_bundle"`, a
  refresh-oriented message, and a `requestId` that equals the response's
  `x-request-id` header. Integration-level regression (middleware chain
  composed around a simulated stale resolver rejection), not only
  `staleServerFnResponse()` in isolation.
- **AC-4.2** The unknown-route classification is boundary-aware:
  `/terms` known; `/termsXYZ` unknown; `/privacyXYZ` unknown;
  `/api/webhooks/cashfree` + `/api/favicon` known (real handlers);
  `/api/anything-else` unknown; `/_serverFn/...` known; `/random` unknown;
  `/terms/` matches the router's actual behavior (verified empirically and
  asserted consistently).
- **AC-4.3** An arbitrary unknown route with `Accept: application/json`
  returns an honest 404 envelope (never the framework's not-found 500 quirk);
  a genuine 500 on a real route is never relabelled (unit tests).
- **AC-4.4** Every JSON response that contains a `requestId` field carries the
  SAME value in `x-request-id`. Audit result: the Cashfree webhook ignored /
  non-paid 200 path is fixed to set the header; all other webhook paths
  verified consistent; regression test covers the fixed path (signed
  non-paid event → 200, body.requestId === x-request-id) and the fail-closed
  401 path.

### WS5 — CI / release guardrails

- **AC-5.1** `.github/workflows/ci.yml` runs on `pull_request` + `push` to
  `main`, Node 24, with npm dependency caching: `npm ci`, `npm run lint`,
  `npm run typecheck`, `npm test`, `npm run build`. No production secrets in
  CI. Tests remain hermetic (PGLite/local config only). The workflow fails
  the run on any gate failure.
- **AC-5.2** The pushed release SHA has a GREEN CI run (observed via
  `gh run`), independent of local self-assessment.
- **AC-5.3** Branch-protection recommendation documented (require the CI
  status before merge to main; prevent force pushes) including the
  browser-side steps in case the app lacks API permission for GitHub
  settings.

### WS6 — Indexing / canonical cleanup

- **AC-6.1** Deliberate indexing policy (documented): home pages indexable
  (`index,follow` explicit); legal pages (terms/privacy/refund/contact)
  `noindex,follow`; unknown routes `noindex,follow` (Phase 00.5, kept).
- **AC-6.2** Sitemaps contain product-content URLs only: the home URL per
  host (legal pages removed from inventories).
- **AC-6.3** No fake/demo URLs are indexed (none exist as independent routes;
  examples render inside the home page).
- **AC-6.4** Canonical URLs agree with redirect targets: apex pages canonical
  to the apex; www hosts 301 to the same-path apex URL.

### WS7 — Favicon

- **AC-7.1** `GET /favicon.ico` returns 200 with a valid ICO (PNG-in-ICO is
  acceptable; generated from the existing SVG artwork, reproducible script in
  `scripts/`); the existing `favicon.svg` + `rel=icon` link are kept.
- **AC-7.2** Avoidable `/favicon.ico` 404s disappear from logs after the
  change (verified on the preview surface).

### Architecture debt (record only)

- **AD-1** Recorded (not acted on): the SEO + CSP Nitro middleware buffer the
  final HTML via `Response.text()` to rewrite the document, which defeats
  streaming SSR; reconsider as the marketplace UI grows. This is NOT a
  framework rewrite in this phase.

## Out of scope

- CultureBid apex DNS correction (external; runbook in
  docs/ops/DEPLOYMENT.md) — only the follow-up www→apex normalization wiring
  is documented here (AC-3.5 exclusion note).
- Production deployment (explicitly deferred to the external audit).
- Phase 01.

## Completion checklist

- [x] WS1 … AC-1.1..1.5
- [x] WS2 … AC-2.1..2.2
- [x] WS3 … AC-3.1..3.5
- [x] WS4 … AC-4.1..4.4
- [x] WS5 … AC-5.1..5.3
- [x] WS6 … AC-6.1..6.4
- [x] WS7 … AC-7.1..7.2
- [x] AD-1 recorded

## Completion notes (local verification, 2026-08-27)

- **WS1**: `0011_waitlist_normalize.sql` verified on hermetic PGLite first
  (writer + multi-interest + idempotent-refresh + backfill tests,
  `src/lib/waitlist.test.ts` — 7/7), then gated-applied to the shared Neon
  DB (dry-run → 1 pending → apply → ledger 0002–0011; pre/post snapshots:
  waitlist_entries 0 (backfill no-op), orders 4 pending, site_stats
  untouched, archive table preserved). Live preview round-trip: one email
  accumulated FoundersBid/sponsor + FoundersBid/builder +
  CultureBid/creator interests (all 200, `created:true` each).
- **WS2**: privacy copy per product asserts the qualified disclosure in
  `legal.test.ts` ("temporarily process your IP address in memory", "not
  persisted", "not used for advertising or profiling"); no unqualified
  no-IP-storage claim remains (source-scan + rendered-page checks).
- **WS3**: serverFns take no data (`trackPageView({})` etc.); the handler
  derives the product from the request Host. `visit-dedup.test.ts` pins
  both deliberate paths (6 tests). Live: `recordPageView()` with no key
  increments the server-derived product's row.
- **WS3/AC-3.5**: `wwwRedirectFor` unit-tested (3 products 301 with
  path+query; culturebid + unknown hosts never redirect); built preview +
  dev server both verified by curl (`www.bidthrone.lol` → 301
  `https://bidthrone.lol/`, `www.foundersbid.lol/terms?x=1` → 301
  `https://foundersbid.lol/terms?x=1`, `www.culturebid.lol` → 200 no
  redirect). Implemented app-level in ALL runtimes: an initial
  `vercel.json` attempt was rejected by Vercel's schema (`redirects`
  entries do not accept a `host` property — deploy failed with
  "should NOT have additional property `host`"), so the Nitro
  `seo-host` middleware + dev twin are the single source of the 301s
  (documented in docs/ops/DEPLOYMENT.md; CultureBid excluded pending DNS).
- **WS4**: stale serverFn after the FULL middleware chain (integration
  test composing `staleServerFnGuard` under the real `request-id`
  middleware): 404 + `code: stale_client_bundle` + refresh message +
  body.requestId === x-request-id. That test caught a latent defect in the
  request-id "specific envelope" branch (returned a body-consumed
  Response → would have sent an empty body in production); fixed +
  regression-pinned. Boundary-aware `isKnownRoute` unit-tested against the
  WS4-B case list; `/terms/` empirically a router 307 (documented).
  Webhook: ignored 200 path now sets x-request-id === body.requestId
  (signed-event regression test incl. fail-closed 401 + stale-timestamp
  401).
- **WS5**: `.github/workflows/ci.yml` (Node 24, npm ci + cache, lint →
  typecheck → test → build, hermetic, no secrets); branch-protection
  recommendation in docs/ops/DEPLOYMENT.md. CI green on the release SHA is
  part of the release record below.
- **WS6**: deliberate indexing policy implemented in
  `robotsMetaFor(productKey, pathname)` (home `index,follow`; legal
  `noindex,follow`; unknown routes `noindex,follow` per Phase 00.5) and
  asserted in the head-injection tests; sitemaps now home-only per host
  (unit-tested ×4 products + host.test.ts). No fake/demo URLs exist as
  routes (examples render inside the home page). Canonicals (apex) agree
  with the www→apex 301 targets.
- **WS7**: `public/favicon.ico` (1130 bytes, valid ICO header, two
  PNG-in-ICO rasters 32/16, magic verified) generated by
  `scripts/generate-favicon-ico.mjs` from `public/favicon.svg` (kept);
  built preview: `GET /favicon.ico` → 200 `image/vnd.microsoft.icon`.
- **Gates**: typecheck clean; eslint clean; `npm test` = 498 mjs + 127 ts,
  0 fail; `vite build` clean; dev + built smokes exit 0 (baselines
  regenerated).
- **Security headers/CSP re-verified after all middleware changes**: all
  four baseline headers present; CSP nonces still match the two inline
  scripts; HSTS untouched (Vercel's).
- **Release record**: pushed branch `main` @ oculusrex14/bid-lols; release
  SHA + CI run id + preview deployment id are recorded in docs/STATE.md
  "Last release (Phase 00.6)" once the gates pass — **no production
  deployment in this phase** (explicit directive; STOP for external audit
  of the SHA).
