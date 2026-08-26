# Legacy Repository Audit

Audit of the bidthrone monorepo (three pay-to-rank boards + The Crown) ahead of the bounty-network pivot. Audit only — no code, schema, or deploy changes. Tags: KEEP / REFACTOR / REMOVE / VERIFY.

## Current Stack

TanStack Start (React 19) on Vite 8 + Nitro 3 beta (vercel preset); file-based routes, `createServerFn` + zod server functions, TanStack Query; Tailwind v4, Radix, lucide, sonner. Postgres (Supabase pooler URL in `DATABASE_URL`) via `pg`; in-memory PGLite (WASM) fallback when unset. One SQL surface in `src/lib/db.ts`, no ORM. Payments: raw `fetch` to Cashfree REST (no SDK); FX from open.er-api.com. Tests: `node --test` (build/migrate/brand/smoke scripts only); no app-level unit tests — the product gate is a custom Playwright smoke (`scripts/browser-smoke.mjs`, dev :8080 / preview :8081, `--baseline`). **REMOVE:** unused deps imported nowhere — recharts, @tanstack/react-table, react-hook-form, @hookform/resolvers, cmdk, vaul, date-fns, react-day-picker, zustand.

## Current Domain Architecture

One app: portal `bidthrone.lol/` + boards at `/$site` (`founders` | `culture` | `bidception`; unknown → `/`). Brand domains (`foundersbid.lol`, `culturebid.lol`, `bidception.lol`) 302-redirect to the paths via shared `scripts/brand-host.mjs` (Nitro middleware in prod, Vite plugin in dev; unit-tested). `appOrigin()` reads a dead `NEXT_PUBLIC_APP_URL` env (Next.js-era name a Vite app never gets) and falls back to hardcoded `https://bidthrone.lol` → REFACTOR. The triple-domain mapping is legacy URL-swap infrastructure: REMOVE/REPLACE for the pivot.

## Current Database Architecture

Dual backend: prod Postgres ⇄ PGLite (`src/lib/db.ts`). Schema = `migrations/0002–0008_*.sql`; `migrations/auth/0001_auth.sql` is opt-in and **never applied** (non-recursive glob). `_migrations` ledger on both backends; PGLite self-migrates at dev startup. Tables: `listings` (pay-to-rank; `url_key` unique per board; secret `manage_token` ownership), `orders` (kinds `bid`/`swap`/`oracle`), `activity`, `site_stats` (real counts + `hype_factor`), `crown_predictions`/`crown_scores`/`crown_passes` (0008). No `user_id` anywhere — auth OFF; ownership = secret manage URL, Crown = `crn_` localStorage device token. Dev PGLite is in-memory and wiped on restart.

## Current Payment Architecture

Single Cashfree rail, server-side only (`cashfree.ts`). **Session-first**: gateway order created before any local row (no orphans on refusal). Whole-USD amounts charged in INR via live FX (`INR_PER_USD`, `FX_MARKUP_PERCENT` overrides). Kinds: `bid` ($5 min; re-bid pays the difference), `swap` (tiered 10–25% of current bid, top-50 escalator 35%/50%, clamped $10–$2,500, 3-swap cap), `oracle` ($5/7-day pass = 500¢). Webhook `POST /api/webhooks/cashfree`: HMAC-SHA256 base64 over `timestamp+rawBody`; secret = `CASHFREE_WEBHOOK_SECRET`, **falling back to `CASHFREE_CLIENT_SECRET` and returning `true` (accept) when none is set** → VERIFY a real secret on Vercel. Paid events → `confirmPayment`; others → 200 `{ignored}`; missing order → 400; unsettled → 409. **Status verification**: `confirmPayment` polls `GET /pg/orders/{id}` up to 4× (350ms×n) before granting; checkout re-polls client-side. No refund/void/payout APIs; "no refunds" enforced by absence.

## Current Authentication Architecture

OFF by design (`VITE_AUTH_ENABLED=false` in `.grok/app-env.json`; also set in Vercel env, value unverified — VERIFY). No route or server function consumes a session. A full **Better Auth scaffold is pre-wired but dormant**: `src/lib/auth/*` (11 files), dev-only `/auth/popup` middleware, unapplied `migrations/auth/0001_auth.sql`, `check:auth` invariant in the smoke gate. Federation targets the platform's "Grok auth broker" (`GROK_AUTH_ISSUER`). REMOVE unless the pivot needs accounts on that broker.

## Current Analytics Architecture

No third-party analytics. Homegrown: `trackView` (page views, sessionStorage-deduped per session; portal batches all 3 sites in one call) and `trackClick` (outbound "Visit" → `listings.clicks` + site visits). **Fake/scaled traffic display**: `site_stats` stores real integers, but painted "visits today / total views" are multiplied by `hypeMultiplier` — random per-board 1.2–6×, decaying to 1× over 21 days, latched at ≥8,000 real daily visits (`hype.ts`, `publicHype`, `HypeCounts`). SPEC §1: "Never disclosed." **REMOVE** — fabricated display data. **Semantic inconsistency**: SPEC defines *visit* = outbound click only, yet `trackView` also increments `visits`/`visits_today` on every page view, on top of `trackClick` — double-counted. VERIFY intent before reusing counters.

## Current Deployment Architecture

Vercel project `bidthrone`; Nitro vercel preset, `serverDir: ./server` (auto-registers brand-host + grok-pwa middleware); no `vercel.json`. Build chain: `vite build` → `copy-pglite` (PGLite WASM ships **inside the prod bundle**) → `db:migrate`. **Migrations still execute during the Vercel build**: `scripts/migrate.mjs` runs with the production `DATABASE_URL` in the build step and applied `0008_crown.sql` to prod on the last deploy. See Deployment Risks (Phase 00). `.env.local` (gitignored) holds prod credentials locally; Vercel env mirrors it. `supabase/` is CLI residue (only `config.toml` tracked).

## Current Product Features

Portal `/`: three board cards (top-3, pool, hype counts). Each `/$site`: 100-row leaderboard, Claim-#1 box (live price + stepper), stats bar, Crown card, activity tape, listing detail, rules, legal pages. Bidding: $5 floor in whole dollars; tie-break `last_bid_at`. **URL swaps**: tiered-fee destination-URL change on the manage page, re-checked at payment. The three boards are copy+theme variants of one engine (`src/lib/sites.ts`). **The Crown / Oracle Pass** (newest, 0008): daily UTC round predicting which listing holds #1 at midnight. Free = 1 pick/round/device; Oracle Pass ($5/7d, `oracle` order kind) = 5 picks, 5× points, crowd-odds bars, ORACLE badge, tiered top-10; lazy settlement on first post-midnight read.

## Legacy Features To Remove

- **Pay-to-rank engine**: `board-fns.ts` (bid/quote/swap/manage/confirm/track), routes `/bid`, `/manage/$token`, `/listing/$id`, `/activity`, `/rules` + legal; components `leaderboard`, `claim-box`, `swap-preview`, `stats-bar`, `leftover-budget`, `founder-socials`, `founders-masthead`, `culture-values`.
- **Hype/fake-traffic layer + URL-swap tiered-fee system**: `hype.ts`, `hype-counts.tsx`, `publicHype`, `hype_factor`, the manage-page swap flow — fabricated counts and legacy fee mechanics; do not carry forward.
- **The Crown / Oracle Pass — REMOVE (legacy product functionality)**: `crown.ts`, `crown-math.ts`, `crown-identity.ts`, `/$site/crown`, CrownCard + nav link, `oracle` order kind. Do NOT use as the reference for the new product's paid tier; selected implementation patterns (payment flow, server functions, UI, DB) may be inspected and reused only where independently appropriate. The additive `crown_*` tables may simply remain in prod.
- **Triple-domain mapping + portal**: brand-host middleware/plugin, `SITES` copy config, portal `index.tsx`, board chrome.
- **Stale specs**: `SPEC.md` still says "demo-quality, Cashfree sandbox in preview" although prod runs production Cashfree; in-app `/spec` is a third partial spec; `AGENTS.md` is the old mission contract; `docs/{research-brief,ideas,idea-ranking,shipped-report}.md` are legacy process docs. One living spec replaces all of it.
- **Old auth scaffolding** (see Authentication) and **unused Grok/App Builder runtime artifacts**: `src/lib/multiplayer/p2p.ts` (570-line WebRTC mesh calling a nonexistent `/api/rtc`, imported nowhere) and `attachments/image.png` (tracked, referenced nowhere).

## Infrastructure Worth Preserving

- `src/lib/db.ts` dual backend (Postgres ⇄ PGLite) + `scripts/migration-plan.mjs` / `migrate.mjs` + `_migrations` ledger — the best reusable piece.
- Cashfree rail: `cashfree.ts` (session-first orders, INR conversion, paid-polling), webhook route, order-ledger semantics — pending payout-direction review for bounties.
- `fx.ts` (live INR + env overrides + markup cap); server-function + zod + Query pattern; `ui/` primitives; sonner toasts; light/dark mode.
- Quality gates: `browser-smoke.mjs` + verdict/baseline, `with-app-env`, `brand-host` tests, `node --test` harness; PGLite local-dev loop.
- **Grok / App Builder platform chrome — VERIFY each item, not auto-KEEP**: `public/__grok/**`, `server/middleware/grok-pwa.ts` + `scripts/grok-pwa-*` (PWA manifest, `?install=1`, OG injection), `PreviewHostBridge`, `.grok/**`, `startup.sh`. Confirm against the retained deployment environment what is actually required; the target architecture removes unnecessary App Builder/Grok runtime dependencies where safely possible. Do not remove during this audit task.

## Technical Debt

- **Generated `.vercel/output` committed to git**: 69 files, ~19 MB, tracked despite `.gitignore` (committed before the rule); `git rm --cached .vercel`. Separately, 82 smoke screenshots/verdicts under `screenshots/` are tracked tooling output with no `.gitignore` coverage (the verdict JSONs double as smoke baselines) — untrack generated artifacts, keep only the baselines the gate consumes, and add `screenshots/` to `.gitignore`.
- PGLite WASM shipped in the prod bundle (`copy-pglite`) — dead weight plus the silent-fallback trap.
- Nitro pinned to a beta build; `NEXT_PUBLIC_APP_URL` dead env name; `supabase/` CLI residue; unused deps; lazy Crown settlement (no cron); no app-level unit tests; three competing spec documents.

## Security Risks

- **Webhook is open when unconfigured**: `verifyCashfreeWebhook` returns true with no secret, otherwise falls back to the client secret; no replay/expiry check. VERIFY `CASHFREE_WEBHOOK_SECRET` on Vercel; fail closed in the new product.
- **Local prod credentials**: prod DB + Cashfree credentials live in local `.env.local`. Verified: gitignored and untracked, and no `.env.local` value appears in any tracked file (only non-secret flags such as `VITE_AUTH_ENABLED`/`CASHFREE_MODE` appear in tracked files). A dev server started without `DATABASE_URL=` reads/writes production Postgres (happened once — a probe table, later dropped). Pivot rule: never commit `.env.local`.
- Fabricated public counters (hype scaling) = misleading traffic claims; a trust/legal exposure not to carry forward.
- No rate limiting on bids, picks, or `confirmPayment`; ownership rests on unguessable tokens only (192-bit random — acceptable).
- Silent FX fallback rate changes what customers are charged when open.er-api.com fails.

## Deployment Risks

- **PGLite silent fallback (PRIORITY — Phase 00)**: an empty/missing `DATABASE_URL` makes the app silently run on in-memory PGLite — no error, empty boards. **Target: production must fail loudly on a missing/invalid `DATABASE_URL`; PGLite stays a local dev/test aid only.**
- **Build-time migrations against production (PRIORITY — Phase 00 deployment-safety issue)**: `npm run build` runs `migrate.mjs` against the prod `DATABASE_URL`, so the build mutates prod DDL. **Target: separate the ordinary app build from potentially-mutating prod migrations** (dedicated, gated release step), keeping the idempotent-file pattern.
- Stale committed `.vercel/output` can ship if a build is skipped.
- Brand-domain CNAMEs + `allowedHosts` assume the three legacy domains stay mapped; retiring them needs Vercel-domain/DNS changes outside the repo.
- `CASHFREE_NOTIFY_URL` hardwires the webhook to the current origin; a domain pivot must re-point it in Cashfree and env.

## Migration Risks

- The prod DB holds **real paid orders and possibly paid listings** (~4 bid orders after the 0006 wipe; VERIFY row counts) — the pivot must be additive or export-first; never drop `listings`/`orders`.
- Payment direction: today is collect-only (Cashfree PG orders + webhook). A bounty network likely needs payouts/withdrawals — a different Cashfree surface. VERIFY product fit.
- Identity: the pivot will likely need accounts; the dormant Better Auth stack is coupled to the platform's Grok auth broker and is probably worthless outside it. Decide REMOVE vs REUSE early.
- The PGLite dev loop depends on the `migrations/*.sql` glob + vite bootstrap plugin; keep both or lose the zero-config local DB.
- Platform scaffolding (`.grok/**`, `grok-pwa-*`, `PreviewHostBridge`, `startup.sh`) is VERIFY, not auto-keep: confirm what the retained deployment environment actually needs; unnecessary App Builder/Grok runtime dependencies are removed where safely possible (not in this audit task).

## Unknowns Requiring Runtime Verification

1. Production `VITE_AUTH_ENABLED` value (set, never printed) — is `/api/auth/*` live in prod?
2. `CASHFREE_WEBHOOK_SECRET` actually set on Vercel (the webhook is open otherwise).
3. Vercel project domain list + CNAMEs for the three brand domains.
4. End-to-end Cashfree **sandbox** completion — only the gateway boundary was exercised (no sandbox credentials here).
5. Prod `_migrations` ledger state (expect 0002–0008) before the pivot's first migration; PGLite WASM in the deployed Nitro function vs serverless size limits.
6. `open.er-api.com` reachability from Vercel; prod `INR_PER_USD`/`FX_MARKUP_PERCENT`; whether the double-incremented `visits` counter was a bug; live `hype_factor`/`hype_locked` values and row counts (`listings`, `orders`, `activity`, `crown_*`) to size data preservation.
