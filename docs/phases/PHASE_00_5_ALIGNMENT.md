# PHASE 00.5 — Foundation Alignment & Reproducibility

Status: IN PROGRESS
Started: 26 August 2026
Supersedes: nothing. Phase 00 (`PHASE_00_FOUNDATION.md`) remains COMPLETE for what
it built; this phase corrects post-deployment review findings: (a) production was
deployed from a dirty working tree with the Phase 00 commit chain not on the
configured GitHub remote, and (b) the deployed public surfaces still carried
legacy pay-to-rank product language and read as internal engineering status
pages rather than deliberate pre-launch product pages.

## Purpose

Make the deployed foundation **accurately represent the intended Bid Network**
and make **production fully reproducible from GitHub**. This phase does NOT
build the bounty marketplace and does NOT open any transactions.

## Hard constraints

- No Phase 01+ features: no listings, no bids, no accounts/auth, no payment
  checkout. The only new write path is the founding-access capture.
- No fabricated activity: no fake counters, no fake listings presented as real,
  no fake payouts. All example content is visibly labelled EXAMPLE/DEMO.
- Money invariants unchanged: webhook-only, fail-closed settlement; the four
  legacy pending Cashfree orders are not settled, refunded, or deleted in this
  phase — their operational treatment is documented instead.
- Legal pages must describe only functionality that currently exists.
- Security: never bypass auth (none exists), never trust client-sent money or
  client-sent product origin, validate all input server-side, keep webhooks
  fail-closed.
- Git: never force-push; release = one exact committed + pushed SHA.

## Workstreams & acceptance criteria

Each AC is testable by the listed check. "Public copy" = everything a visitor
or crawler reads: `src/routes/**`, `src/components/**`, `src/lib/legal.ts`,
`scripts/host-seo-shared.mjs`. Docs and tests are excluded from copy scans.

### WS0 — Source control integrity

- **AC-0.1** Working tree is clean: `git status --porcelain` prints nothing.
- **AC-0.2** The complete Phase 00 commit chain is on the configured GitHub
  remote (`origin` = `github.com/oculusrex14/bid-lols`, branch `main`):
  `git rev-parse main` == `git rev-parse origin/main` after a fetch, with no
  force-push used (fast-forward only).
- **AC-0.3** The final production deployment is created from a clean working
  tree at the released SHA: at deploy time local `HEAD` == pushed remote `HEAD`
  == the SHA the deployment was built from, and the deployment record does not
  report `gitDirty`/dirty status.
- **AC-0.4** Any remaining intended uncommitted Phase 00 changes are committed
  (checked at start: tree was clean at `aa06e2d`).

### WS1 — Legal content is P0

Legacy forbidden terms in public copy: `pay-to-rank`, `rank`/`ranks`/
`rankings` (as a paid product concept), `bid to rank`, `$5`, `minimum bid`,
`re-bid`/`rebid`, `URL swap`/`swap fee`, `manage link`/`manage URL`,
`no accounts` (as a legacy reassurance line), `listing`, `outbid`, `Oracle`,
`Crown`, `hype`, `sponsored`.

- **AC-1.1** Grep of public copy files for the forbidden-term patterns (case
  insensitive) returns zero matches.
- **AC-1.2** Terms of service describe only what exists now: the pre-launch
  site, the founding-access capture (email + role + consent), page analytics,
  and an explicit statement that **marketplace bounty/project transactions are
  not yet publicly available and no payment is currently accepted**. No
  invented final marketplace terms.
- **AC-1.3** Privacy describes **only data actually collected**: (a) per-host
  page-view/visit/outbound-click counters (aggregates, no PII); (b)
  founding-access entries: email, role/intention, origin product, created_at,
  consent text + consent timestamp; (c) browser-local items (appearance
  preference, session visit marker); (d) platform hosting data (Vercel).
  It states no accounts exist and no payment data is processed **today**.
- **AC-1.4** Refund policy states plainly that **no payments are currently
  accepted** and that legacy rank purchases, re-bids, swaps, and any future
  bounty settlement are **not** described because they are not currently
  available; payment terms will be specified before transactions open.
- **AC-1.5** All four legal routes render on all four product hosts with the
  updated copy (preview: curl each host × each slug, assert forbidden-term
  absence in the HTML body).
- **AC-1.6** "Updated" date is the Phase 00.5 rewrite date.

### WS2 — Public product surfaces

- **AC-2.1** Bidthrone: keeps the core line "Put money on a problem. See who
  takes the throne."; shows a visual four-step flow
  **problem → funded work → verified outcome → earned reputation**; states
  explicitly that Bidthrone reputation **cannot be purchased** (earned from
  verified completed work only); shows the three network products with useful,
  distinct one-line descriptions; primary CTA is founding access.
- **AC-2.2** FoundersBid: explains BOTH modes with clear labels —
  **BOUNTY** (multiple qualified participants compete on bounded work) and
  **PROJECT** (providers submit proposals first; one is selected before any
  work is done); demonstrates each with content visibly labelled EXAMPLE
  (or DEMO) that is never counted as marketplace activity; presents the
  category set: development, AI automation, design, product, research, data,
  marketing/GTM, content, business operations; primary CTAs "I need work done"
  and "I want to build" both open the founding-access capture with the
  matching role preselected.
- **AC-2.3** CultureBid: explains creative bounty use cases (UGC, short-form
  video, photography, design, writing, brand challenges); shows the fairness
  mechanics conceptually — winner takes all, podium payout, finalist pool,
  limited/approved participant slots — and explains that capped, qualified
  participation prevents unlimited creators from being asked to perform
  speculative unpaid work; primary CTAs "I'm a brand" / "I'm a creator".
- **AC-2.4** Bidception: shows a concrete labelled example — a ₹100,000 parent
  project → captain → four child bounties (landing page, demo video, outreach,
  analytics) with child amounts that reconcile with the parent — plus the line
  "One problem. A team forms around the money."; positioned clearly as a
  later product on the network (founding access, not a live board).
- **AC-2.5** No internal engineering status copy is public: grep of `src/`
  for `foundation phase`, `plumbing`, `nothing has been listed`,
  `nothing has been paid out`, `no rankings exist` returns zero matches.
- **AC-2.6** No fabricated activity anywhere: every example is labelled
  EXAMPLE/DEMO; no counts, no "members", no "bounties open" presented as real.
- **AC-2.7** The four domains are deliberately distinct (own hero, own content
  structure) — verified visually at desktop and mobile, not only by HTML
  assertions.
- **AC-2.8** Responsive & accessible: no horizontal overflow at 390 px
  (smoke), landmarks/headings in order, keyboard-focusable CTAs/form,
  contrast from the existing token system.

### WS3 — Pre-launch conversion (founding access)

- **AC-3.1** Capture schema: migration `0010_waitlist.sql` (additive,
  idempotent, gated-applied like other migrations) creates
  `waitlist_entries(id uuid pk, email text, email_norm text unique,
  role text check, product_key text check, consent text, consent_at
  timestamptz, created_at timestamptz, updated_at timestamptz)`.
  Role enum: `sponsor` (sponsor/founder), `builder`, `brand`, `creator`,
  `captain` (captain/interested).
- **AC-3.2** Server-side validation (zod) on the server function: valid email,
  role in the enum, consent acknowledged; the **origin product is derived
  server-side from the request Host header** (never from the client payload).
  Invalid input → 4xx machine-readable error, no DB write.
- **AC-3.3** Spam protection: hidden honeypot field (filled ⇒ silent fake
  success, no write); best-effort per-IP rate limit (in-memory,
  multi-instance caveat documented); hard per-email uniqueness (one row per
  address — repeat submission updates role/consent/timestamps, does not
  duplicate).
- **AC-3.4** Explicit success state (confirmation, form cleared, **no public
  counts shown**) and explicit error state (human-readable, safe to display).
- **AC-3.5** No accounts: no authentication, no session, no login UI is
  introduced for the waitlist.

### WS4 — UX priority

- **AC-4.1** Header: the founding-access CTA is the visually primary action
  (accent treatment); the theme control is a compact secondary icon control,
  not a dominant two-button pill in the header; CTA remains reachable at
  390 px without horizontal overflow.
- **AC-4.2** No new animation beyond existing token motion (`--motion-*`);
  no keyframes added.

### WS5 — CultureBid DNS safety

- **AC-5.1** `docs/ops/DEPLOYMENT.md` (or dedicated DNS note) records the
  exact correction: the `culturebid.lol` apex A records currently resolve to
  private `10.x` addresses; they must be replaced with Vercel's apex record
  (A `76.76.21.21` or whatever the Vercel dashboard currently states), with
  `www` as CNAME `cname.vercel-dns.com`; plus re-verification commands
  (`curl -sI https://culturebid.lol`, Cloudflare DoH lookup of the apex).
- **AC-5.2** No new broken link behavior: clickable cross-product links point
  at `https://www.culturebid.lol` until the apex is verified reachable;
  declarative URLs (canonical/OG/sitemap) keep the apex origin. No canonical
  or link is created for a path known to be unreachable.
- **AC-5.3** Post-DNS-fix verification step (both apex and www return 200) is
  recorded as an explicit open task with the exact commands.

### WS6 — SEO

- **AC-6.1** `robots.txt` implementation unchanged (still valid, host-aware,
  Sitemap line points at this host's sitemap).
- **AC-6.2** Sitemaps are host-aware: `/sitemap.xml` served on host X lists
  only X's public URLs (home + its four legal pages); four different sitemap
  bodies; a product host's sitemap does not inventory another product's
  origins. (Unit test on `sitemapXml(productKey)` + live curl per host.)
- **AC-6.3** Deliberate indexing rules: home and legal pages are indexable;
  unknown routes emit `meta robots noindex,follow`.
- **AC-6.4** Branded 404: any unknown path returns **HTTP 404**, renders the
  domain-branded not-found page (product name + home link), contains
  `noindex,follow`, and carries **no canonical** for the missing path.
  Regression coverage: unit tests for the status-aware head injection plus a
  live probe recorded in Completion Notes.
- **AC-6.5** Unknown-route JSON requests keep the standard
  `{code,message,requestId}` envelope via the request-id middleware.

### WS7 — Deployment compatibility (stale server functions)

- **AC-7.1** A stale browser bundle calling an unknown server function id
  (e.g. `POST /_serverFn/<removed-id>` with Start client headers) receives a
  graceful **404 JSON** (`code: "stale_client_bundle"` with a refresh hint)
  instead of a generic unhandled 500; the log line is a warn, not an
  unhandled stack trace.
- **AC-7.2** Genuine server-function failures still surface: a known function
  that throws returns its serialized 5xx (the guard must not swallow or
  rewrite handler errors).
- **AC-7.3** Regression coverage for the guard decision: unit tests covering
  stale-id rejection, genuine-error pass-through, and non-serverFn pass-through.

### WS8 — Security headers baseline

- **AC-8.1** Every deployed (prod + preview) response carries:
  `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` denying camera, microphone, geolocation,
  interest-cohort, and a **non-permissive Content-Security-Policy**:
  `default-src 'self'`, `script-src 'self'` with per-request **nonces** on all
  inline scripts (no `unsafe-inline` for scripts), `style-src 'self'
  'unsafe-inline'`, `img-src 'self' data:`, `font-src 'self' data:`,
  `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `frame-ancestors 'none'`.
- **AC-8.2** HSTS is preserved (Vercel sets it on production domains; the app
  must not emit a conflicting second HSTS header).
- **AC-8.3** Zero CSP violations in the browser console on load of all four
  home pages (Playwright console capture) and the waitlist round-trip works
  under the CSP.
- **AC-8.4** The local Vite dev server is documented as intentionally without
  CSP (HMR requires inline scripts it cannot nonce); all other headers
  acceptable there.

### WS9 — Lower-priority cleanup

- **AC-9.1** PGLite is excluded from the Vercel server build output: after
  `vite build` under a Vercel-flavoured environment, no pglite chunk/wasm is
  present in `.vercel/output` and no pglite import remains reachable; local
  `vite build` + `copy-pglite.mjs` + `vite preview` still boot a hermetic
  PGLite preview.
- **AC-9.2** Cloud misconfig fails loudly: a cloud build/runtime without
  `DATABASE_URL` throws a named, actionable error instead of an opaque
  missing-module crash.
- **AC-9.3** Dormant Vercel env vars are verified unreferenced by the current
  codebase (grep + `vercel env ls`) and then removed where safe
  (`VITE_AUTH_ENABLED`, `CASHFREE_ENV`, `NEXT_PUBLIC_*`, `SUPABASE_*`), or
  documented as kept with reason.
- **AC-9.4** `docs/ops` records the operational treatment of the four legacy
  pending Cashfree orders: they settle only via verified webhook; the runbook
  is (1) check each order's status at the provider, (2) if paid — replay the
  signed webhook so settlement + audit run through the normal path, (3) if
  unpaid/abandoned — close/expire at the provider; no manual settlement,
  refund, or row deletion.

### WS10 — Verification & release

- **AC-10.1** `npm run lint`, `npm run typecheck`, `npm test` (all mjs + ts
  tests), `npm run build` all pass.
- **AC-10.2** Built-preview smoke (dev `:8080` and built `:8081`) passes;
  visual inspection at desktop (1280) and mobile (390) of all four product
  homes + a legal page + the 404, using a real browser (screenshots reviewed,
  not only HTML assertions).
- **AC-10.3** Vercel **preview** deployment passes the host checks that DNS
  allows: foundersbid.lol/bidthrone.lol/bidception.lol apex + all four www
  hosts return the new surfaces; culturebid.lol apex remains the documented
  external DNS blocker (www works).
- **AC-10.4** Release: all intended changes committed; pushed to
  `origin/main`; `origin/main` SHA == local release SHA; production deployed
  from that clean SHA; production deployment not dirty; then verified in
  production: four domains (+ www) serve the new surfaces, legal copy clean,
  404 branded with noindex + no canonical, per-host sitemaps, security
  headers, waitlist endpoint validates (error paths) and the schema exists
  (gated SQL check), runtime logs contain no unhandled errors after traffic.
- **AC-10.5** `docs/STATE.md` updated; this doc's checklist complete;
  **Phase 01 not started**.

## Out of scope (recorded, not done here)

- Vercel ↔ GitHub Git-integration auto-deploy: `vercel git connect` fails
  without the Vercel GitHub App installed for the account (browser-side,
  user action). Documented as an external follow-up; until then releases are
  CLI deploys from the clean pushed SHA with the SHA + dirty-state recorded
  per AC-0.3/AC-10.4.
- culturebid.lol apex DNS record change at the registrar (AC-5.3).
- Final marketplace legal terms (specified separately before Phase 01 opens
  transactions).

## Completion checklist

- [ ] WS0 … AC-0.1..0.4
- [ ] WS1 … AC-1.1..1.6
- [ ] WS2 … AC-2.1..2.8
- [ ] WS3 … AC-3.1..3.5
- [ ] WS4 … AC-4.1..4.2
- [ ] WS5 … AC-5.1..5.3
- [ ] WS6 … AC-6.1..6.5
- [ ] WS7 … AC-7.1..7.3
- [ ] WS8 … AC-8.1..8.4
- [ ] WS9 … AC-9.1..9.4
- [ ] WS10 … AC-10.1..10.5
