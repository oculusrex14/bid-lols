# DEPLOYMENT.md — Autonomous Deployment Sequence

**Status:** Runbook for deploying the Bid Network. Defines the sequence an autonomous agent may run end-to-end, what blocks it, and what "verified" means.

## Topology (verified)

- **Platform:** Vercel project `bidthrone` (`prj_sJF1T6PBZoNkFnXRD9jvjqnr5PUt`), Nitro `vercel` preset, `serverDir: ./server`. No `vercel.json` — platform behavior is default; if a setting must change, create `vercel.json` deliberately.
- **Database:** Supabase pooler Postgres via `DATABASE_URL` (Vercel env; `.env.local` locally, never committed).
- **Build chain today:** `with-app-env vite build` → `copy-pglite` → `db:migrate` — i.e. **the build mutates prod DDL**. Phase 00 must replace this with: pure build + separately gated migration step (see `DATABASE_MIGRATIONS.md`).
- **Known debt:** `.vercel/output` (69 files, ~19 MB) is tracked despite `.gitignore` (committed before the rule); 82 `screenshots/` tooling outputs are tracked with no gitignore coverage (the verdict JSONs double as smoke baselines). Untrack both before further deploys so stale output can't ship.

## Expected domains

- `bidthrone.lol` (+ `www.`) — umbrella / portal
- `foundersbid.lol` (+ `www.`)
- `culturebid.lol` (+ `www.`)
- `bidception.lol` (+ `www.`)

All four are in `vite.config.ts` `allowedHosts`; brand-domain 302s are handled by the `brand-host` middleware (dev: Vite plugin). CNAME/Vercel-domain state is **out of repo** — verify on the Vercel project (audit VERIFY item) before relying on a domain.

## Autonomous-safe deployment sequence

Execute in order; any BLOCKING failure (below) stops the run and triggers rollback rules.

1. **Verify clean/understood diff.** `git status` + `git diff`: every changed path maps to the current task; no application-code change unless the task says so; no env files, secrets, local DBs, `.vercel/` output, or temp files in the diff.
2. **lint / typecheck / test.** `npm run lint` (eslint), `npm run typecheck`, `npm run test` — all green.
3. **Production build locally.** `npm run build` — must be pure: no DB connection, no DDL, no PGLite bundling (post-Phase-00 target; pre-decoupling, the build step's `db:migrate` is a BLOCKING risk and must be run manually, separately, per `DATABASE_MIGRATIONS.md`).
4. **Verify migrations.** Apply pending `migrations/*.sql` against prod via the **dedicated, gated step** (`DATABASE_URL=<prod> node scripts/migrate.mjs`); confirm the `_migrations` ledger matches expectations before deploying. No pending migrations allowed at deploy time.
5. **Preview deploy.** `vercel` (non-prod) with valid deployment credentials (token/OIDC). Missing auth = BLOCK (never manufacture credentials).
6. **Smoke test preview.** `scripts/browser-smoke.mjs` with `BROWSER_SMOKE_ROOT` pointed at the preview; verdict must match baseline.
7. **Verify critical APIs / server functions.** On the preview: server-function round-trips exercised by the smoke test; `POST /api/webhooks/cashfree` with a bad/missing signature must get **401/403** (fail-closed — an accepted unsigned webhook is BLOCKING), and a validly-signed sandbox event returns a structured, correct response; `/api/favicon` and all four coming-next pages serve the correct host surface. (Order creation no longer exists after Phase 00 — the webhook is the only money path.)
8. **Production deploy.** `vercel --prod` (or the authorized deployment mechanism).
9. **Verify all custom domains.** HEAD/GET `https://bidthrone.lol`, `foundersbid.lol`, `culturebid.lol`, `bidception.lol` (+ `www.` where CNAMEs exist): 200, correct per-host coming-next surface (domain-specific `<title>`), host-aware canonical/OG; Vercel logs show the Postgres connection, not PGLite fallback.
10. **Inspect runtime errors/logs.** Vercel function logs for the new deploy: no unhandled server errors, no 5xx on the routes visited in step 9.
11. **Rollback automatically on critical production verification failure.** Re-deploy the last known-good deployment. If a failing migration already ran: forward-fix per `DATABASE_MIGRATIONS.md` (new file, re-apply) — never manual destructive DDL.
12. **Update `docs/STATE.md`** (and the active phase checklist) with what shipped, when, and the verification evidence.

## BLOCKING deployment failures (hard stops)

- `typecheck` / `test` / `lint` failures.
- Build failure, or the build performing DB mutations / bundling PGLite for prod.
- Pending migrations not applied via the gated step, or ledger mismatch.
- Webhook accepts an unsigned/invalid request (fail-open behavior present in prod).
- `CASHFREE_WEBHOOK_SECRET` or `CASHFREE_MODE=production` or `DATABASE_URL` missing/invalid on the target deployment.
- Smoke verdict mismatch against baseline.
- Any expected domain returning 5xx, failing host routing, or rendering the wrong product surface.
- Secrets or `.env*` content appearing in any diff, log, or deployed asset.
- Unresolvable provider verification in prod mode (cannot confirm a test order end-to-end).

## Non-negotiables

- Never bypass missing authentication (deploy creds, provider creds): stop and report.
- Never manufacture credentials or fake provider responses.
- Never weaken security (open webhooks, disabled checks, swallowed errors) to make a deploy pass.
- Never expose secrets: no values in diffs, logs, screenshots, or committed files.
- Preview → production requires no human confirmation **when the active execution prompt explicitly authorizes production deployment**; otherwise the sequence stops at step 6–7 and asks.
