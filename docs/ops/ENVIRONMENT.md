# ENVIRONMENT.md — Environment Variables

**Status:** Runbook for environment configuration. Classifies every variable the app reads or ships, by purpose. No secret values are recorded here — values live in `.env.local` (local only, gitignored) and in Vercel project environment variables (production).

## How environment reaches the app

- **No build flags.** Phase 00 removed the last `VITE_*` flags (auth) and the `.grok/app-env.json` merge wrapper (`with-app-env.mjs`). `npm run dev|build|preview` run Vite directly; there is nothing client-inlined that can diverge between environments.
- **Server-only variables** are read via `process.env` at runtime (Vercel env in production/preview; `.env.local` locally).
- **Database source** is decided by `resolveDbConfig` in `src/lib/db.server.ts`:
  - `VERCEL_ENV=production` → `DATABASE_URL` is **required** (missing/blank = startup error naming the variable).
  - **Local** runtimes (dev, local `vite preview`) → hermetic **PGLite**, even when a `DATABASE_URL` is present locally. This is deliberate: `.env.local` holds production credentials and Vite surfaces them to the dev SSR process, so local work must not connect to them by accident.
  - **Vercel preview** → uses a project-scoped `DATABASE_URL` when present (the Development scope carries one; deliberate platform configuration), otherwise PGLite.
  - Opt into a real database from a local runtime with `USE_REAL_DB=1` + `DATABASE_URL` (intentional integration work only; documented in the phase completion notes when used).

## Required in production (Vercel)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon). Hard requirement — the app fails to start without it (`resolveDbConfig`). |
| `CASHFREE_MODE` | `"production"` → `api.cashfree.com`; anything else → sandbox. Production must set it explicitly. |
| `CASHFREE_CLIENT_ID` | Cashfree REST credentials (canonical name; `CASHFREE_APP_ID` alias still accepted by the client). |
| `CASHFREE_CLIENT_SECRET` | Cashfree REST credentials (canonical name; `CASHFREE_SECRET_KEY` alias still accepted by the client). |
| `CASHFREE_WEBHOOK_SECRET` | Dedicated HMAC-SHA256 key for webhook signatures. **Dedicated only** — never falls back to the client secret; without it the webhook rejects everything (fail-closed). |
| `CASHFREE_NOTIFY_URL` | Webhook endpoint registered with Cashfree — `https://bidthrone.lol/api/webhooks/cashfree`; re-point in both Cashfree and env on any domain change. |

## Development

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Present in `.env.local` but **ignored by dev/preview runtimes** (hermetic PGLite) unless `USE_REAL_DB=1`. |
| `USE_REAL_DB` | `"1"` + `DATABASE_URL` opts a local runtime into the real database. |
| `CASHFREE_MODE` | Absent locally → sandbox (`api.cashfree.com` only when explicitly `production`). |

## Optional

| Variable | Purpose |
|---|---|
| `INR_PER_USD` | Fallback FX rate when `open.er-api.com` is unreachable (default 85). A fallback changes what customers are charged — the fallback path logs a visible warning and records `fxSource: "fallback"` on any order it prices. |
| `FX_MARKUP_PERCENT` | Merchant markup on the live rate (default 0, capped at 25). |
| `BROWSER_SMOKE_ROOT` / `BROWSER_SMOKE_TIMEOUT_MS` / `BROWSER_ALLOW_EXTERNAL_HOST` | Playwright smoke gate configuration (`scripts/browser-smoke.mjs`). |
| `PREVIEW_THUMBNAIL_TIMEOUT_MS` | Preview thumbnail fetch timeout. |
| `VERCEL_OIDC_TOKEN` | Deployment-tool credential (Vercel OIDC), not read by app code. Keep local/CI-only. |

## Removed in Phase 00

| Variable | Fate |
|---|---|
| `VITE_AUTH_ENABLED` | Removed with the auth scaffold. |
| `NEXT_PUBLIC_APP_URL` | Dead since removal of `appOrigin()` (legacy board code). |
| `CASHFREE_ENV` | Was redundant (canonical flag is `CASHFREE_MODE`); dropped. |
| `VITE_PUBLIC_HOSTNAME`, `VITE_STUN_URLS` | Were read only by removed Grok PWA chrome / dead p2p module. |
| `GROK_AUTH_ISSUER` | Removed with the Better Auth scaffold. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase CLI residue; no code references — `supabase/` removed. |

## Rules

- `.env.local` holds prod credentials locally and is **never committed** (gitignored via `.env*`).
- No secret value ever appears in source, committed files, or logs.
- Production must verify (existence only, values never printed): `CASHFREE_WEBHOOK_SECRET` set, `CASHFREE_MODE=production` set, `DATABASE_URL` valid — a deploy missing any of these must fail loudly, not silently degrade.
