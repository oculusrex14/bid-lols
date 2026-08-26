# Phase 00 — Foundation

**Status:** READY_FOR_IMPLEMENTATION. This document is the active phase spec and overrides all legacy code and stale docs (see `docs/archive/` once W11 lands).

## Objective

Convert the legacy pay-to-rank application into a clean, production-ready foundation for the Bid Network — simpler and safer than today — **without** implementing the bounty marketplace.

## Starting State

Verified facts (from repo inspection + live checks, 2026-08-26):

- **Live product:** pay-to-rank boards (`/$site` = founders | culture | bidception) + portal `/` + The Crown/Oracle Pass + URL-swap + hype-scaled counters; prod Cashfree (real paid orders in `orders`/`listings`). Last deploy per `docs/shipped-report.md`: commit `fdc55e0` (2026-08-26).
- **Live domains (curl from dev env):** `bidthrone.lol` → 200; `foundersbid.lol` → 302 → `/founders`; `bidception.lol` → 302 → `/bidception`; `culturebid.lol` apex **unreachable** (resolves to private IP `10.10.0.1`, connection times out); `www.culturebid.lol` → 302. Last verified commit: `eea1223`.
- **Unsafe mechanics:** build chain `vite build → copy-pglite → db:migrate` mutates prod DDL during any build; PGLite WASM ships in the prod bundle; missing `DATABASE_URL` silently falls back to in-memory PGLite.
- **Open webhook:** `verifyCashfreeWebhook` returns `true` when no secret is set (fails open), falls back to the client secret, and has no replay/expiry check. Settlement (`confirmPayment`) is reachable from the checkout redirect re-poll and is not concurrency-safe.
- **Fake analytics:** `site_stats` stores real integers but painted numbers are multiplied by `hypeMultiplier` (1.2–6×, `hype.ts`); `trackView` double-counts `visits`/`visits_today` on top of `trackClick`.
- **No auth in prod:** `VITE_AUTH_ENABLED=false`; dormant Better Auth scaffold in `src/lib/auth/*` coupled to the Grok auth broker; ownership via 192-bit `manage_token`.
- **Repo debt:** `.vercel/output` (69 files) tracked despite `.gitignore`; 82 `screenshots/` tooling outputs tracked with no gitignore coverage; 9 unused deps; Grok/App Builder chrome (`public/__grok/**`, `grok-pwa` middleware, `PreviewHostBridge`, `MODE_BOOT_SCRIPT` in `__root.tsx`); dead `src/lib/multiplayer/p2p.ts`; tracked `attachments/image.png`; `.gitignore` duplicates (`.env`, `.env.*`, `.env*`); stale `SPEC.md` + in-app `/spec` route.
- **Migrations:** `0002`–`0008` applied in prod; `migrations/auth/0001_auth.sql` never applied; basename-keyed `_migrations` ledger; PGLite self-migrates in dev.

## Desired End State

- All four domains serve clean, host-aware "coming next" foundation pages — no fake activity, no pay-to-rank UI, no Crown, no hype.
- Webhook fails closed; settlement is atomic and reachable only from the verified webhook; prod fails loudly on a missing/invalid `DATABASE_URL`.
- Build is pure (no DB, no PGLite); migrations run only via a dedicated gated step.
- Analytics counters are truthful: real `views`/`visits`/`clicks`, no scaling, no double-count.
- Identity foundation (`users`/`sessions`/`profiles`/`audit_events`/`payments`) exists via one additive migration; no marketplace tables.
- Repo debt cleared; old product docs archived; test suite covers the Phase 00 regressions; smoke gate green on the new surface.

## Workstreams

- **W1 Legacy product removal** — pay-to-rank engine, URL swap, Crown/Oracle Pass, hype layer, bid pool displays, legacy promotional mechanics (details in *Legacy Removal*).
- **W2 Analytics correction** — truthful `view`/`visit`/`outbound click` semantics, no scaling, no double-count.
- **W3 Security fixes** — webhook fail-closed, no settlement from redirects, server-authoritative monetary state, authorization-boundary inspection.
- **W4 Repository cleanup** — untrack `.vercel/output` + generated `screenshots/` artifacts, remove Grok/App Builder runtime artifacts, dead deps, dead auth scaffolding (verified unused), obsolete specs, `.gitignore` dedupe.
- **W5 Build/deployment safety** — decouple `db:migrate` + `copy-pglite` from `npm run build`; prod fails loudly on missing/invalid `DATABASE_URL`.
- **W6 SEO baseline** — valid `/robots.txt` + `/sitemap.xml`, canonical, per-domain title/description/OG, favicon.
- **W7 Domain foundation** — all four domains operational with clean product-specific "coming next" pages.
- **W8 Shared layout/design foundation** — reusable tokens/components, no overbuilding.
- **W9 Error handling/observability** — structured error envelope, request ids, production 500 investigation.
- **W10 Tests** — minimum high-value coverage for the Phase 00 regressions.
- **W11 Documentation cleanup** — archive `SPEC.md` + legacy process docs; nothing old stays authoritative.

## Functional Requirements

- **FR-1** Each of the four apex domains (+ `www.` where CNAMEs exist) returns 200 at `/` with its product-specific coming-next page: product name, one honest sentence, contact link; **no** counters, "live" claims, pay-to-rank language, or demo data.
- **FR-2** Host-aware head on every page: unique `<title>` and `<meta name="description">` per domain, `rel=canonical` on the apex URL, `og:title`/`og:description`/`og:url` matching that domain.
- **FR-3** `allowedHosts` + `normalizeHost` retained; `www.` normalizes to apex; any other unknown host gets the 200 bidthrone umbrella default surface (keeps Vercel preview URLs and local dev working; a 404 would make the preview gate unusable). The legacy cross-domain 302 brand-host mapping is removed (legacy `/$site` paths 308 → `/` on the same host).
- **FR-4** Webhook fails closed: missing `CASHFREE_WEBHOOK_SECRET`, missing/invalid signature, or timestamp outside ±15 min → 401, logged, never settled. Valid verified events settle idempotently and atomically. No client-side path can settle an order.
- **FR-5** Vercel **production** without a valid `DATABASE_URL` fails to start with an explicit error naming the variable (no PGLite fallback); all other runtimes (local dev, local `vite preview`, Vercel preview) use the hermetic PGLite self-migrating loop — even when a `DATABASE_URL` exists locally (`.env.local` holds prod credentials and Vite surfaces it to the dev SSR process), so local work can never mutate real data by accident. Opt into a real local database explicitly with `USE_REAL_DB=1` + `DATABASE_URL` (ops/ENVIRONMENT.md).
- **FR-6** `npm run build` runs `vite build` only: no DB connection, no DDL, no PGLite in the output bundle.
- **FR-7** Migrations run exclusively via `npm run db:migrate` (→ `scripts/migrate.mjs`), a dedicated gated release step; never from a build or preview.
- **FR-8** Analytics: `views` = deduplicated page impressions; `visits` = one increment per browser session (first impression only); `clicks` = one per outbound "Visit" link click; painted numbers equal stored integers.
- **FR-9** `/robots.txt` and `/sitemap.xml` exist on all four domains and are valid (see *SEO Requirements*).
- **FR-10** Server errors return a machine-readable envelope `{ code, message, requestId }` with `x-request-id`; no stack traces, SQL, env values, or provider payloads in responses.

## Routes

| Current | Phase 00 |
|---|---|
| `/` (portal, 3 board cards) | **Replace** — host-aware coming-next (bidthrone umbrella lists the three product domains as absolute links) |
| `/$site` (board index) | **Replace** — same host-aware coming-next page, product-specific copy/head |
| `/$site/bid`, `/$site/checkout.$orderId`, `/$site/manage.$token`, `/$site/listing.$id`, `/$site/activity`, `/$site/crown` | **Remove** (404; legacy `/$site/*` paths 308 → `/` on the same host) |
| `/spec` | **Remove** (SPEC.md archived in W11) |
| `/$site/contact`, `/$site/privacy`, `/$site/terms`, `/$site/refund` | **Keep** at top level on every host, content unchanged in Phase 00 (copy review = follow-up, non-blocking) |
| `/api/webhooks/cashfree` | **Keep**, hardened per FR-4 |
| `/api/favicon` | **Keep** |
| `/robots.txt`, `/sitemap.xml` | **Add** (host-aware server routes) |

## Data Changes

- One new additive migration: **`migrations/0009_foundation.sql`** creating `users`, `sessions`, `profiles`, `audit_events`, `payments` exactly per `docs/02_DATA_MODEL.md` (prefixes `usr_`/`prf_`/`aev_`/`pmt_`; integer minor units + `currency char(3) default 'INR'`; check-constrained statuses; FKs on new relationships).
- **No destructive DDL.** `listings`, `orders`, `activity`, `site_stats`, `crown_*` are untouched; `hype_factor`/`hype_locked` stop being read/written in code but keep their columns (physical drop deferred, per `02_DATA_MODEL`).
- `migrations/auth/0001_auth.sql` is **not** applied: the Grok-coupled Better Auth scaffold is removed (W10-verify), and `0009`'s `users`/`sessions` are the identity foundation (resolves the DECIDE item in `02_DATA_MODEL`). The auth migration file is archived with the scaffold.
- Pre-migration snapshot (recorded in completion notes, never committed): row counts of `listings`, `orders`, `activity`, `crown_*`, and the `_migrations` ledger state (expect `0002`–`0008`).

## Legacy Removal

Remove/deactivate (W1 + W4):

1. **Pay-to-rank UX & mechanics:** `board-fns.ts` bid/quote/swap/confirm paths, routes `/bid`, `/manage/$token`, `/listing/$id`, `/activity`, `/checkout/$orderId`, and components `leaderboard`, `claim-box`, `swap-preview`, `stats-bar`, `leftover-budget`, `founder-socials`, `founders-masthead`, `culture-values`.
2. **URL-swap product:** tiered-fee swap quoting, `swap_count`, manage-page swap flow.
3. **Crown / Oracle Pass:** `crown.ts`, `crown-math.ts`, `crown-identity.ts`, `/$site/crown` route, CrownCard + nav link, `oracle` order kind.
4. **Hype layer:** `hype.ts`, `hype-counts.tsx`, `publicHype`, all `hype_factor`/`hype_locked` reads/writes and the ≥8,000-visit latch.
5. **Triple-domain 302 mapping + portal:** `scripts/brand-host.mjs` + `server/middleware/brand-host.ts` redirect behavior (keep only `allowedHosts` + host normalization), portal `index.tsx`.
6. **Grok/App Builder chrome:** `public/__grok/**`, `server/middleware/grok-pwa.ts`, `scripts/grok-pwa-*`, `PreviewHostBridge`, `MODE_BOOT_SCRIPT` (the only `dangerouslySetInnerHTML` in `__root.tsx`), `startup.sh` + `.grok/**` **only if verified unused by the Vercel build** (no `vercel.json`; build runs from `package.json` — verify, then remove).
7. **Dead code:** `src/lib/multiplayer/p2p.ts` (+ `VITE_STUN_URLS`), `attachments/image.png`, `supabase/` (verify no local-CLI use; dev loop is PGLite).
8. **Dead deps (9):** recharts, @tanstack/react-table, react-hook-form, @hookform/resolvers, cmdk, vaul, date-fns, react-day-picker, zustand.
9. **Obsolete specs:** `/spec` route removed; `SPEC.md` + legacy process docs archived in W11.

**In-flight legacy orders:** no new orders can be created (creation routes removed); the only settlement path is the verified webhook. Pending legacy orders either settle via webhook or stay pending; manual disposition (refund/close) is a post-Phase 00 ops follow-up, recorded in `docs/STATE.md`.

## Security Requirements

From `docs/05_SECURITY.md`, executed in Phase 00:

- **S-1 Webhook fail-closed (BLOCKING if absent post-deploy):** `verifyCashfreeWebhook` — no secret ⇒ 401; no `timingSafeEqual` match ⇒ 401; dedicated `CASHFREE_WEBHOOK_SECRET` only (client-secret fallback removed); `timestamp` freshness ±15 min (stale ⇒ 401); idempotent on provider order/event id.
- **S-2 No settlement from unverified redirects:** remove `/$site/checkout.$orderId` and the client re-poll; settlement is invoked only from the webhook.
- **S-3 Atomic settlement:** single transaction, claim-guard `update orders set … where id=$1 and status='pending'`, proceed only on exactly one changed row (kills the double-settle race).
- **S-4 Server-authoritative money:** amounts come from the `orders` row / server computation; settlement re-queries the provider before any transition; client-carried `gatewayLive`/amount fields are dropped from all decisions.
- **S-5 Authorization boundaries inspected:** after W1, the only authenticated surfaces are the signature-verified webhook and (future) admin; verify no server function or route consumes a session (grep + review) and record the result.
- **S-6 Auth scaffolding:** verified unused ⇒ remove `src/lib/auth/*`; retain the same-origin/`Site: none` isolation check as a small reusable lib (CSRF baseline for Phase 01 cookie sessions).
- **S-7 FX fallback visible:** when the live rate fetch fails, log + record the fallback rate and source on the order (audit-able).
- **S-8 Secrets hygiene:** no secret values in any diff, log, or asset; `CASHFREE_WEBHOOK_SECRET` verified set on Vercel before deploy (existence only, value never printed).

## Analytics Requirements

- Semantics fixed and enforced by tests (FR-8): page view (session-deduplicated), session/visit (once per session), outbound click (per external link click).
- No multiplication/scaling anywhere in display or storage paths; no hidden traffic multipliers (AGENTS §5).
- Double-count removed: `trackView` stops incrementing `visits`/`visits_today`; `trackClick` stops incrementing `visits`.
- `site_stats` daily roll (`visits_day`) kept; real integers rendered directly.

## SEO Requirements

- **`/robots.txt`** — host-aware server route; valid content: `User-agent: *`, `Allow: /`, `Sitemap: https://<this-domain-apex>/sitemap.xml`.
- **`/sitemap.xml`** — host-aware server route; valid XML listing the four apex homepages (one sitemap, served identically on all four domains, canonical apex URLs only).
- **Canonical:** `<link rel="canonical">` to the apex-host URL on every page (www stripped).
- **Per-domain head:** unique title + description + OG (`og:title`, `og:description`, `og:url`, `og:image` from existing `public/og.jpg`) per domain via the shared domain config.
- **Favicon:** keep `public/favicon.svg` + `/api/favicon`; **manifest:** the Grok PWA manifest is removed with the PWA chrome — no manifest in Phase 00 (a PWA returns only if a later phase requires it).

## Deployment Requirements

Per `docs/ops/DEPLOYMENT.md` and `docs/ops/DATABASE_MIGRATIONS.md`:

- Build decoupled first (FR-6/FR-7): `npm run build` = `vite build` only; `db:migrate` kept as a separate script and run as the **gated release step** before activation.
- Pre-deploy: untrack `.vercel/output`; handle `screenshots/` (untrack generated artifacts; keep only the baseline verdict files the smoke gate actually consumes, at a tracked path); dedupe `.gitignore`.
- `DATABASE_URL` set-and-valid is a hard precondition; `CASHFREE_WEBHOOK_SECRET` + `CASHFREE_MODE=production` verified present (BLOCKING checks in the runbook).
- Full 12-step autonomous sequence: clean diff → lint/typecheck/test → pure local build → gated migration → preview deploy → smoke → critical API/webhook fail-closed probe → prod deploy → verify all four domains → log inspection → auto-rollback on critical failure → `docs/STATE.md` update.

## Explicitly Out of Scope

- Bounty creation
- Bounty submissions
- Proposal marketplace
- Payouts to bounty winners
- CultureBid marketplace
- Nested bounties
- Bidthrone performance reputation
- Graveyard
- Trend Guillotine
- Sovereign Stream
- Gamified paid auctions
- (Additionally: user-facing auth UI/login flows — Phase 01; file-storage provider — when uploads land; legacy data export to cold storage; DNS/CNAME changes — out of repo.)

## Acceptance Criteria

All testable; none vague.

- **AC-1 Legacy surface gone:** the route files for `bid`, `checkout.$orderId`, `manage.$token`, `listing.$id`, `activity`, `crown`, `spec` do not exist; `grep -rniE 'hype|crown|oracle|swap_count|manage_token' src server --include='*.ts*'` returns no hits outside the single documented legacy-settlement module `src/lib/settlement.server.ts` (which carries the in-flight legacy orders' effects, incl. `crown_passes`/`manage_token`/`swap_count` table access) and the test files asserting the legacy schema; in dev, those URLs return 404 (legacy `/$site/*` paths return 308 → `/`).
- **AC-2 Settlement only via webhook:** `grep` shows no route/client module calling the settlement function; checkout route absent (code review + grep).
- **AC-3 Legacy data intact:** post-deploy prod row counts of `listings`, `orders`, `activity`, `crown_*` equal the pre-deploy snapshot (recorded in completion notes); `grep -ciE 'drop table|drop column|truncate|delete from' migrations/0009_foundation.sql` = 0 (additive DDL such as `ADD COLUMN` and the data-safe `DROP CONSTRAINT IF EXISTS … ADD CONSTRAINT` check-widening are permitted and documented in the file).
- **AC-4 Webhook fail-closed tests pass:** (a) env without `CASHFREE_WEBHOOK_SECRET` → 401; (b) invalid signature → 401; (c) valid signature + unknown order → 4xx, no settlement; (d) valid signature + known pending order → 200 and settled; (e) timestamp older than ±15 min → 401; (f) duplicate event → 200, no second settlement.
- **AC-5 Atomic settlement test passes:** two concurrent settlement attempts on one pending order apply the effect exactly once (second attempt's claim-guard returns 0 rows).
- **AC-6 Server-authoritative money:** with the provider stub reporting not-PAID, no settlement occurs regardless of request payload; no code path reads client-carried payment state (code review + test).
- **AC-7 FX fallback recorded:** stubbed rate-fetch failure ⇒ order payload + audit note contain the fallback rate and `fxSource` (test).
- **AC-8 Repo hygiene:** `git ls-files .vercel` → 0; tracked `screenshots/` contains only the documented smoke baselines; `.gitignore` has no duplicate env patterns and covers generated outputs; the 11 audited dead deps (`recharts`, `@tanstack/react-table`, `react-hook-form`, `@hookform/resolvers`, `cmdk`, `vaul`, `date-fns`, `react-day-picker`, `zustand`, `better-auth`, `kysely`) absent from `package.json`, plus every remaining package with zero users after legacy removal (the full removal list is recorded in completion notes), with `typecheck` green; `attachments/` removed; `supabase/` removed (verified unused — no code references; the dev loop is PGLite).
- **AC-9 Grok chrome gone:** `public/__grok` absent; no `grok-pwa` middleware/scripts, `PreviewHostBridge`, `p2p.ts`, `VITE_PUBLIC_HOSTNAME`, `VITE_STUN_URLS`, `GROK_AUTH_ISSUER`, `VITE_AUTH_ENABLED` references in `src`/`server`/`scripts`; the only `dangerouslySetInnerHTML` in `src` is the static light/dark boot script in `__root.tsx` (documented in 05_SECURITY as the no-flash theme persistence; no external/user data is ever interpolated into it) — `grep -rn 'dangerouslySetInnerHTML' src | grep -v MODE_BOOT_SCRIPT` = 0.
- **AC-10 Auth scaffolding resolved:** `src/lib/auth/*` removed (after grep-verification that no route/server function consumed a session); the isolation-check helper retained in a shared lib; `migrations/auth/0001_auth.sql` archived and not applied.
- **AC-11 Pure build:** `npm run build` with `DATABASE_URL` unset completes with zero DB connections and no PGLite data/wasm assets in the output and no PGLite in the client bundle; the only PGLite presence is the inert server-side JS in the function's `_libs` (unreachable in production — `resolveDbConfig` throws before any PGLite import; its wasm assets are staged into the **local** preview loop only, by the documented `copy-pglite` step, never by the build); `package.json` `build` script is `vite build` and contains no `db:migrate`/`copy-pglite` step.
- **AC-12 Prod fails loudly:** running the production build output without a valid `DATABASE_URL` fails startup with an explicit error naming the missing variable; dev/preview still boots the PGLite loop without `DATABASE_URL`.
- **AC-13 SEO valid:** on all four apex domains — `/robots.txt` 200 containing `User-agent: *` and the correct `Sitemap:` URL for that domain; `/sitemap.xml` 200, parses as XML, lists the four apex homepages (each 200); homepages carry domain-specific `<title>`, `<meta name="description">`, apex `rel=canonical`, and `og:title`/`og:description`/`og:url`.
- **AC-14 Domains live:** all four apex domains return 200 at `/` with their distinct coming-next `<title>`; `www.` variants normalize; an unknown host (Vercel preview URL, local dev, unattached host) returns 200 with the bidthrone umbrella default surface — never a 404, so previews stay usable; `culturebid.lol` apex connectivity verified working from prod (dev-env DNS anomaly noted and cleared, or documented as environment-only).
- **AC-15 Analytics tests pass:** (a) second page impression in one session increments `views` only; (b) an outbound click increments the independent `site_stats.clicks` counter and never `visits`/`views` (the Phase 00 UI has no outbound links; the server primitive exists and is PGLite-tested so Phase 01 wires it without a semantic change); (c) no multiplier in the display import graph (`grep -rn 'hype' src --include='*.ts*'` = 0 outside test names/comments); (d) scripted session against PGLite yields exact `views`/`visits`/`clicks` deltas.
- **AC-16 Honest surface:** coming-next pages contain no counters, "live"/"people here" claims, pay-to-rank copy, or placeholder data (content diff against FR-1 + design-system empty-state rules).
- **AC-17 Design foundation:** one `ProductShell` + the per-domain product config object (`scripts/host-seo-shared.mjs`, typed via `src/lib/host.ts`) drives all four surfaces (code review); the shared `Button` primitive (if reintroduced) has a loading state — Phase 00 surfaces use plain links, no interactive buttons beyond the theme toggle; no raw hex color literals in component files outside `styles.css` (grep).
- **AC-18 Observability:** triggered error paths (bad server-function input, unknown route, webhook 401) each return `{ code, message, requestId }` JSON with `x-request-id` and no stack/SQL/env in the body; server logs carry the request id; Vercel log inspection for app-level 500s since the last deploy yields fixed+regressed bugs or a recorded "none found" with the log window.
- **AC-19 Tests green:** new test files exist (webhook, settlement guard, analytics semantics, host routing, FX fallback); `npm run typecheck`, `npm run test`, `npm run lint` all green; browser smoke regenerated on the new surface and green on dev :8080 and preview :8081.
- **AC-20 Docs archived:** `SPEC.md` and `docs/{research-brief,ideas,idea-ranking,shipped-report}.md` live in `docs/archive/` with a deprecation banner naming `docs/00_PRODUCT.md` as the successor; no tracked file cites `SPEC.md` as authoritative; `AGENTS.md` doc map lists `archive/`; `docs/STATE.md` matches the new template.
- **AC-21 Migration gated:** `0009_foundation.sql` applied only via the gated step; prod pre-flight ledger recorded (expect `0002`–`0008`) and post-run ledger shows `0009`.
- **AC-22 Env verified:** post-deploy Vercel env has `CASHFREE_WEBHOOK_SECRET`, `CASHFREE_MODE=production`, and a valid `DATABASE_URL` (existence verified, values never printed, recorded in completion notes).

## Verification Matrix

| AC | Method |
|---|---|
| AC-1, AC-2, AC-6, AC-9, AC-10, AC-17 | `grep` over `src`/`server`/`scripts` + code review |
| AC-3, AC-21 | SQL row-count snapshot pre/post + `grep` on the migration file + `_migrations` ledger read |
| AC-4, AC-5, AC-6, AC-7, AC-15 | `node --test` unit/integration tests (webhook harness, concurrency test, PGLite-backed counter test, stubbed provider/fetch) |
| AC-8, AC-11, AC-12 | `git ls-files`, `package.json` inspection, build run with `DATABASE_URL` unset + output scan, prod-output startup probe |
| AC-13, AC-14, AC-16 | Live/preview `curl` against all four domains (status, headers, body assertions) + XML parse of sitemap + content diff |
| AC-18 | Error-trigger tests + Vercel function-log inspection (time-bounded) |
| AC-19 | `npm run typecheck` / `test` / `lint` + `scripts/browser-smoke.mjs` verdicts |
| AC-20 | `git ls-files docs/` + banner check + doc cross-reference grep |
| AC-22 | Vercel env inspection (existence only) recorded in completion notes |

## Migration Plan

1. **Snapshot (pre-work):** record prod row counts (`listings`, `orders`, `activity`, `crown_*`) and `_migrations` state in completion notes. No dumps committed.
2. **Decouple build (W5) first** — before any Phase 00 deploy — so no build can mutate prod. Verify with AC-11.
3. **Author `0009_foundation.sql`** per `02_DATA_MODEL` (additive only). Verify locally: PGLite dev boot + `typecheck` + `test`; then against a scratch Postgres holding a prod-dump copy.
4. **Gated apply:** `DATABASE_URL=<prod> node scripts/migrate.mjs`; confirm ledger now `0002`–`0009`.
5. **Deploy** per `ops/DEPLOYMENT.md` (preview → smoke → webhook probe → prod → four-domain verification → logs).
6. **Post-deploy checks:** AC-3 row counts, AC-13/AC-14 domain checks, AC-18 log window.

## Rollback Considerations

- **Code:** focused commits per workstream; rollback = revert + redeploy. New tables left in place are harmless (additive, unreferenced by rolled-back code).
- **Migration:** `0009` is additive-only; forward-fix, no down-migration; a broken file is repaired under a new name (ledger keys by basename).
- **Webhook fail-closed:** pre-deploy verification of `CASHFREE_WEBHOOK_SECRET` is BLOCKING. If verified signed events are rejected after deploy (secret mismatch), roll back the deploy and fix the secret — **never** re-open the fail-open path.
- **Domains:** no DNS/CNAME changes in Phase 00; nothing to roll back there. `culturebid.lol` apex reachability re-verified after deploy (dev-env DNS anomaly may be environment-only).
- **Legacy orders:** pending orders stay pending after rollback (settlement path identical); no new orders can be created in either direction.
- **Smoke baselines:** regenerated for the new surface; prior artifacts remain in git history.

## Completion Checklist

- [ ] W1–W11 executed; every workstream's items checked off in this file
- [ ] AC-1 … AC-22 all pass (evidence in completion notes / PR)
- [ ] `npm run typecheck`, `npm run test`, `npm run lint`, pure `npm run build` green
- [ ] Browser smoke green on dev + preview with regenerated baselines
- [ ] Gated migration `0009` applied; ledger verified; row counts unchanged
- [ ] Four domains verified live with coming-next surfaces; webhook probe fail-closed in prod
- [ ] No secrets in any diff/log; no `.vercel`/env/generated output tracked
- [ ] `docs/STATE.md` updated (phase COMPLETE, next phase pointer); legacy docs archived
- [ ] Status line of this file set to `COMPLETE` with completion date
