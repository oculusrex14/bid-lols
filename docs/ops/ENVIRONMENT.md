# ENVIRONMENT.md — Environment Variables

**Status:** Runbook for environment configuration. Classifies every variable the app reads or ships, by purpose. No secret values are recorded here — values live in `.env.local` (local only, gitignored) and in Vercel project environment variables (production).

## How environment reaches the app

- **`with-app-env.mjs`** wraps `dev`, `build`, and `preview`: it merges `.grok/app-env.json` into `process.env` before starting Vite. Only `VITE_`-prefixed string keys from that file are honored; a real `process.env` entry always wins. The deployed build runs with Vercel's project env instead.
- **Build-time flags** (`VITE_*`) are inlined into the client bundle. Only non-secret flags may carry the `VITE_` prefix — anything else ships to browsers.
- **Server-only variables** are read via `process.env` at runtime (Vercel env in production; `.env.local` locally).

## Required in production

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Supabase pooler Postgres URL. Must be set: a missing/empty value must fail loudly (Phase 00 removes the PGLite silent fallback — see `01_ARCHITECTURE`). |
| `CASHFREE_MODE` | `"production"` → `api.cashfree.com`; anything else → sandbox. Production must set it explicitly. |
| `CASHFREE_CLIENT_ID` | Cashfree REST credentials (canonical name; `CASHFREE_APP_ID` is an alias the code also accepts). |
| `CASHFREE_CLIENT_SECRET` | Cashfree REST credentials (canonical name; `CASHFREE_SECRET_KEY` is an alias the code also accepts). |
| `CASHFREE_WEBHOOK_SECRET` | Dedicated HMAC-SHA256 key for webhook signatures. Must exist in Vercel (audit VERIFY item) and must NOT fall back to the client secret — the current fallback plus the "accept when unconfigured" behavior is a Phase 00 fix (see `05_SECURITY`). |
| `CASHFREE_NOTIFY_URL` | Webhook endpoint registered with Cashfree; hard-wired to the deployed origin — re-point in both Cashfree and env on any domain change. |

## Required in development

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Optional in dev: when absent, the app falls back to in-memory PGLite and self-migrates at startup (the local zero-config loop). |
| `VITE_AUTH_ENABLED` | Build flag (via `.grok/app-env.json` + `with-app-env`): auth UI/flows on/off. Currently `false`; prod value unverified (audit VERIFY item). Must be explicit wherever auth behavior matters. **Removed in Phase 00** with the auth scaffold (`phases/PHASE_00_FOUNDATION.md`). |

## Optional

| Variable | Purpose |
|---|---|
| `INR_PER_USD` | Fallback FX rate when `open.er-api.com` is unreachable (default 85). A fallback changes what customers are charged — treat as a deploy-sensitive value, log when active. |
| `FX_MARKUP_PERCENT` | Merchant markup on the live rate (default 0, capped at 25). |
| `BROWSER_SMOKE_ROOT` / `BROWSER_SMOKE_TIMEOUT_MS` / `BROWSER_ALLOW_EXTERNAL_HOST` | Playwright smoke gate configuration (`scripts/browser-smoke.mjs`). |
| `PREVIEW_THUMBNAIL_TIMEOUT_MS` | Preview thumbnail fetch timeout. |
| `VERCEL_OIDC_TOKEN` | Deployment-tool credential (Vercel OIDC), not read by app code. Keep local/CI-only; verify it is actually used before retaining it. |

## Legacy / remove

| Variable | Status |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Dead. Next.js-era name a Vite app never receives; `appOrigin()` falls back to a hardcoded `https://bidthrone.lol`. REFACTOR away (audit: REFACTOR). |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Not referenced by any current code; Supabase CLI residue (only `supabase/config.toml` tracked). Legacy — drop from env once confirmed unused. |
| `CASHFREE_ENV` | Present in `.env.local`, not read by code (canonical flag is `CASHFREE_MODE`). Redundant — remove. |
| `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` | Alias forms; keep one canonical pair, drop the aliases. |
| `VITE_PUBLIC_HOSTNAME` | Read only by the Grok PWA chrome slated for removal (audit: VERIFY/REMOVE); remove with it. |
| `VITE_STUN_URLS` | Read only by the dead `src/lib/multiplayer/p2p.ts`; remove with that module. |
| `GROK_AUTH_ISSUER` | Dormant Better Auth federation target; remove with the scaffold unless the auth decision keeps it. |

## Rules

- `.env.local` holds prod credentials locally and is **never committed** (gitignored via `.env.*`; verified untracked, and no `.env.local` value appears in any tracked file).
- No secret value ever appears in source, committed files, logs, or `VITE_`-prefixed vars.
- Production must verify: `CASHFREE_WEBHOOK_SECRET` set, `CASHFREE_MODE=production` set, `DATABASE_URL` valid — a deploy missing any of these must fail loudly, not silently degrade.
