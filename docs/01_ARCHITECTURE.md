# 01_ARCHITECTURE.md — Target Shared Architecture

**Status:** Target architecture for the Bid Network pivot. Based on repository inspection (August 2026); legacy-state findings in `docs/LEGACY_MIGRATION.md`. The Phase 00 foundation deltas are applied (2026-08-26, commit `791fdbc`); remaining "Phase 00" markers below are historical.

## Principles

- One shared application/codebase unless the existing architecture strongly justifies otherwise.
- Shared users/accounts across all four domains.
- Shared reputation foundation.
- Shared payments foundation.
- Shared admin.
- Shared analytics.
- Host/domain-specific product surfaces.
- Business logic separated from presentation/brand skin.
- Server-side authorization.
- Transactional database operations for monetary/state-changing workflows.
- Future features extend existing primitives rather than duplicate them.

## Runtime

Retained, based on inspection:

- **TanStack Start** (React 19) on **Vite 8**, SSR via **Nitro 3** (`vercel` preset, `serverDir: ./server`). File-based routes in `src/routes`; server functions via `createServerFn` + zod; TanStack Query for client data. This is the target runtime — no framework rewrite.
- Tailwind v4 + sonner + lucide (Radix and the `src/components/ui` kit removed in Phase 00 with the legacy forms; reintroduce primitives deliberately when a phase needs them — see `03_DESIGN_SYSTEM`).
- TypeScript strict (`tsconfig.json`, `strict: true`), `@/*` path alias, ESM, `node --test` harness in `scripts/`.
- No ORM: one parameterized SQL surface in `src/lib/db.server.ts` (server-only; Postgres `pg` ⇄ PGLite dev/preview), with `resolveDbConfig` gating the backend (production requires `DATABASE_URL`; all other runtimes are hermetic PGLite). No ORM dependency remains (Kysely removed in Phase 00).
- Quality gates retained: `typecheck`, `browser-smoke.mjs` (Playwright smoke with verdict/baseline), `node --test` script tests, eslint + prettier.

Phase 00 (applied): PGLite removed from the prod path (`copy-pglite` now stages assets for the local preview loop only); missing/invalid `DATABASE_URL` fails loudly in Vercel production; 35 unused deps dropped; hype layer, pay-to-rank board engine, Crown, and `SPEC.md`/`/spec` removed from the product.

## Domain Routing

Intended behavior — host-aware rendering, one app:

| Host | Surface |
|---|---|
| `bidthrone.lol` (+ `www.`) | Umbrella: reputation & discovery (Phase 04); portal/hub until then |
| `foundersbid.lol` (+ `www.`) | FoundersBid product surface |
| `culturebid.lol` (+ `www.`) | CultureBid product surface |
| `bidception.lol` (+ `www.`) | Bidception surface (Phase 03; parked placeholder until then) |

- `www.` variants normalize to the apex host (existing `normalizeHost` already strips `www.`) — either serve the same host-aware app or 301 www → apex; no other redirects.
- The app reads the request host (preferring `x-forwarded-host`) to resolve the active product context; the same route tree serves every domain, with per-host head (title/canonical/OG) and per-product content.
- Phase 00 replaced the legacy cross-domain 302 mapping (`brand-host`, removed) with **host-aware serving**: one app, the request host resolves the active product (`scripts/host-seo-shared.mjs` single source of truth; Nitro middleware `server/middleware/seo-host.ts` for prod/preview, dev twin `scripts/host-seo-plugin.mjs`). Per-domain title/description/canonical/OG are injected into the SSR HTML by that middleware; `/robots.txt` and `/sitemap.xml` are host-aware; legacy `/$site` board paths 308 → same-host `/`; unknown hosts get the bidthrone umbrella default (keeps Vercel preview URLs working). Cross-product links are absolute URLs on each product's own domain. (Vite dev intentionally does not transform the HTML head — extra head nodes break React 19 hydration in the dev SSR stream; dev keeps the root's static umbrella head and a client-side sync in `ProductShell`.)

## Application Layers

- **Routes/UI** (`src/routes`): thin pages, SSR data fetching, host-aware `<head>` (title, description, canonical, OG). No business logic; no money math.
- **Shared components** (`src/components`, `ui/`): cross-product chrome (shell, footer, toasts, forms) and design-system primitives, parameterized by a site/product config object. Brand skin lives here only.
- **Domain/product modules** (`src/domains/<product>/`): one module per product (foundersbid, culturebid, bidception, bidthrone) owning its rules and flows (bounty/project modes, categories/judging, captain/child bounties, reputation scoring). Modules call shared services; they never import each other.
- **Server functions** (`createServerFn` + zod): the only UI↔service bridge. Input validated at the boundary; authorization enforced inside.
- **Services** (`src/lib/services/`): business operations — bounty lifecycle, payout accounting, reputation events, FX. No React; consumed by server functions, webhooks, and jobs alike.
- **Database/repositories** (`src/lib/db.ts` + `src/lib/repositories/`): one SQL surface (`getSql()`); per-entity repositories encapsulate all queries; parameterized only; integer minor currency units.
- **Payment provider adapter** (`src/lib/payments/`): provider interface with a Cashfree implementation behind it (see Payments).
- **Authorization** (`src/lib/authz.ts`): server-side capability checks (sponsor / provider / participant / admin) against the shared identity; single `require*` helpers used everywhere, including webhooks and admin routes.
- **Analytics** (`src/lib/analytics.ts`): first-party event ingestion only (see Analytics).
- **Admin**: shared admin surface (order inspection, money actions, reputation overrides) behind an admin role — part of this app, built when Phase 01 needs it.
- **Background/reconciliation jobs**: not needed yet. If ever required (e.g. webhook replay/reconciliation), implement as Nitro tasks calling the same services — idempotent and auditable; no separate worker infrastructure.

## Shared Identity

Architecture boundaries only:

- One shared account system: same login and same `user_id` across all four domains; reputation follows the user.
- An `IdentityProvider` boundary (session create/verify, user lookup) consumed through server functions; `users` + sessions in the shared Postgres; a stable `user_id` that all domain tables reference.
- No organization/team/sub-account structures before required. Bidception's "captains/teams" is an extension on top of flat users when that phase lands.
- Phase 00 decision (recorded in `docs/phases/PHASE_00_FOUNDATION.md`, executed): the dormant Better Auth scaffold (`src/lib/auth/*`) was removed — it was coupled to the platform's Grok auth broker and no route consumed a session. The same-site isolation check was retained as the reusable primitive `src/lib/security/isolation.ts`. `migrations/0009_foundation.sql` creates the identity foundation (`users`/`sessions`/`profiles`/`audit_events`/`payments`); the auth UI/provider choice is Phase 01.

## Payments

- A provider-agnostic boundary: `payments` service + provider adapter. The existing Cashfree rail (session-first PG order, server-side paid-polling, HMAC webhook in `src/routes/api/webhooks/cashfree.ts`, INR conversion in `fx.ts`) is the reference implementation to generalize, not to fork.
- The adapter claims only what the provider actually supports. Cashfree today is **collect-only** (PG order + webhook); there is no escrow, hold, or payout/withdrawal API. The payout direction for winning bounties is an open product decision (VERIFY in the audit) — the architecture keeps money actions idempotent, transactional, and ledgered so a second rail can be added later without a rewrite.
- Invariants: payment proven only by server-side provider verification (redirects never count); webhooks fail closed (missing secret or unverifiable signature → reject; the legacy "accept when unconfigured" behavior was removed in Phase 00); integer minor currency units; client-calculated amounts are never trusted; every monetary action writes an auditable ledger row.

## Database

- **PostgreSQL is the authoritative production datastore** (existing `pg` pooler via `DATABASE_URL`). PGLite is a local dev/test aid only; production must fail loudly on a missing/invalid `DATABASE_URL` (in force since Phase 00 — `resolveDbConfig` in `src/lib/db.server.ts`).
- Schema changes via migration files in `migrations/`, applied by a gated release step (not the app build), idempotent, tracked in the `_migrations` ledger.
- Conventions: integer minor currency units (cents/paise), referential integrity via foreign keys, no manual DDL or destructive mutation against production.
- Legacy `listings`/`orders` (including real paid orders) remain readable and auditable; the pivot is additive, never a drop.

## File Storage

- No existing upload infrastructure — only static assets under `public/`.
- Implementation provider is **open** (Supabase Storage, S3-compatible, or Vercel) until a phase requires user uploads (CultureBid submissions, FoundersBid deliverables).
- Requirement for when it lands: a `StorageAdapter` boundary so the provider is swappable, and no user uploads served from the static origin.

## Analytics

First-party only, real values only — the hype/fake-traffic layer is out, permanently:

- **Page views** — per-route counts, session-deduplicated.
- **Sessions/visits** — one visit per session; the legacy double-counting (`trackView` incrementing visits in addition to `trackClick`) must be resolved before counters are reused (VERIFY in the audit).
- **Outbound clicks** — real external link clicks.
- **Marketplace events** — structured domain events (bounty created, entry submitted, proposal made, winner selected, milestone completed); no fabricated volume.
- **Payment events** — order lifecycle rows (created / paid / settled / refunded) from the payment ledger; the audit source of truth for money.

All counters stored as integers in the shared Postgres and surfaced through the shared admin — never multiplied or painted in the UI.

## Observability

Minimum bar:

- **Structured server errors** — one Nitro error handler emitting a machine-readable shape (code, message, request id); the existing `error-component.tsx` covers the user-facing side.
- **Request correlation** — a `x-request-id` header echoed by the error handler and present in logs where practical.
- **Payment/audit logs** — the `orders` ledger plus an append-only audit event for every monetary action (actor, action, amount, result, timestamp).
- **Deploy/runtime monitoring** — Vercel function logs plus a lightweight uptime/health check on `bidthrone.lol` and the three brand domains.
- **Privacy-conscious analytics** — the first-party counters above; no third-party trackers, no PII in analytics payloads.

## SEO

- **robots.txt** — a valid file per domain (none exists today; the brand-host passthrough list already anticipates `/robots.txt`).
- **Sitemap** — server-generated, per-domain, covering product pages and live bounties/listings.
- **Canonical URLs** — host-aware `<link rel="canonical">` on the apex domain.
- **Per-domain metadata** — title/description/OG per host, extending the existing per-site `head()` pattern in `src/routes/$site.tsx`.
- **OG metadata** — existing `og.jpg` plus per-route OG tags; verify the grok-pwa OG-injection behavior before deciding to keep it.
- **Structured data** — JSON-LD later, when a phase has real entities (e.g. bounty/offer markup); not a Phase 00 item.

## PWA

- **Removed in Phase 00:** the legacy App Builder/Grok PWA chrome — `public/__grok/**`, the `grok-pwa` Nitro middleware and Vite plugin, the `?install=1` install-page tutorial, the dynamic `/__grok/manifest.webmanifest`, and the manifest/apple-touch-icon head links. It was generated platform scaffolding, not a product requirement.
- A PWA (installable/manifest) comes back only if a phase explicitly requires it; nothing depends on it today.

## Deployment

- **Vercel** (Nitro `vercel` preset) + **Postgres** (Neon; `DATABASE_URL`).
- Build chain (Phase 00, applied): `npm run build` = `vite build` only — no DB connection, no DDL, no PGLite assets in the output (the inert PGLite server JS stays in the function's `_libs` and is unreachable in production; its wasm assets are staged into the **local** preview loop only, by `node scripts/copy-pglite.mjs`).
- Migrations run as a **dedicated, gated release step** (`DATABASE_URL=… node scripts/migrate.mjs`, optionally preceded by `--dry-run`), keeping the idempotent-file + `_migrations` ledger pattern — never from a build.
- `DATABASE_URL` required in Vercel production: missing/invalid → the runtime fails to start with an explicit error naming the variable (no silent PGLite fallback). All other runtimes are hermetic PGLite, even with a local `DATABASE_URL` present (`.env.local` holds prod credentials); `USE_REAL_DB=1` opts a local runtime into the real database deliberately.
- Keep: `.env.local` local-only and never committed; the `allowedHosts` allowlist (dev Host-header testing of the four domains). The `with-app-env` wrapper and all `VITE_*` flags were removed in Phase 00 (nothing client-inlined remains).

## Future Extensibility

Extension points only — nothing here is designed to completion:

- **FoundersBid** — the first real domain module: a bounty/project lifecycle primitive (create → fund → enter/propose → select → pay → settle) built on the shared services; payout structures (winner-take-all, podium, finalist pool) are configuration on the bounty, not new money primitives.
- **CultureBid** — reuses the same lifecycle primitive with creative categories plus submission/judging flows; no new money or identity primitives.
- **Bidception** — a parent/child fund-flow extension over the payment ledger (advanced accounting). Deliberately deferred to its phase; the ledger and idempotency rules are the groundwork, nothing more.
- **Bidthrone** — an append-only "completed work / outcome" event feed written by every domain; leaderboards and ranks are read-models over it. There is no pay-to-rank input into reputation, by design.
- A new domain = one host entry + one domain module reusing identity, payments, analytics, and the design system; never a forked app.

## Non-Goals

Architecturally, we are **not** building in Phase 00:

- Nested/team accounting or captain mechanics (Bidception).
- Payout, withdrawal, or escrow implementation (collect-only until the product decides).
- Reputation scoring or leaderboards (the Bidthrone surface is Phase 04).
- Startup Graveyard.
- File-storage provider selection or upload flows.
- Organization/team/sub-account structures.
- An admin dashboard beyond operational access to the existing data.
- Third-party analytics or a PWA.
- Multi-region or multi-database sharding.
- Any rewrite of the TanStack Start / Vite / Nitro runtime itself.
