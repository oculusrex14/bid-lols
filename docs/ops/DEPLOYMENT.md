# DEPLOYMENT.md — Autonomous Deployment Sequence

**Status:** Runbook for deploying the Bid Network. Defines the sequence an autonomous agent may run end-to-end, what blocks it, and what "verified" means.

## Topology (verified)

- **Platform:** Vercel project `bidthrone` (`prj_sJF1T6PBZoNkFnXRD9jvjqnr5PUt`), Nitro `vercel` preset, `serverDir: ./server`. No `vercel.json` — platform behavior is default; if a setting must change, create `vercel.json` deliberately.
- **Database:** Postgres (Neon) via `DATABASE_URL` (Vercel env; `.env.local` locally, never committed). Production requires it — the runtime fails to start without it (`resolveDbConfig`).
- **Build chain (Phase 00):** `npm run build` = `vite build` only — no DB connection, no DDL, no PGLite assets. Migrations run exclusively through the gated step below. `node scripts/copy-pglite.mjs` stages PGLite wasm **into the local preview loop only** (`.vercel/output` after a local build) — it is not part of `build`, and deployed runtimes never execute PGLite (production: Neon; preview: see env scoping in `ENVIRONMENT.md`).
- **Host routing:** each of the four domains serves its own product surface from the same app (Host header → product). No cross-domain 302 mapping; legacy board paths 308 → same-host `/` (`server/middleware/seo-host.ts` + dev twin in `scripts/host-seo-plugin.mjs`, shared logic in `scripts/host-seo-shared.mjs`).

## Expected domains

- `bidthrone.lol` (+ `www.`) — reputation & discovery umbrella
- `foundersbid.lol` (+ `www.`) — startup execution
- `culturebid.lol` (+ `www.`) — creative bounties
- `bidception.lol` (+ `www.`) — nested & team bounties

All four are in `vite.config.ts` `allowedHosts` (dev Host-header testing). Each domain serves its own product surface from the same app; unknown hosts get the bidthrone umbrella default. CNAME/Vercel-domain state is **out of repo** — verify on the Vercel project before relying on a domain.

## Autonomous-safe deployment sequence

Execute in order; any BLOCKING failure (below) stops the run and triggers rollback rules.

1. **Verify clean/understood diff.** `git status` + `git diff`: every changed path maps to the current task; no application-code change unless the task says so; no env files, secrets, local DBs, `.vercel/` output, or temp files in the diff.
2. **lint / typecheck / test.** `npm run lint` (eslint), `npm run typecheck`, `npm run test` — all green.
3. **Production build locally.** `npm run build` — pure `vite build`: no DB connection, no DDL, no PGLite assets. Local preview loop: `npm run build && node scripts/copy-pglite.mjs && npm run preview` (port 8081; PGLite hermetic).
4. **Verify migrations (gated step).** Pre-deploy ledger check (`DATABASE_URL=<prod> node scripts/migrate.mjs --dry-run` — lists pending, applies nothing), then apply (`DATABASE_URL=<prod> node scripts/migrate.mjs`), then confirm the `_migrations` ledger matches expectations (Phase 00: pre = 0002–0008, post = +0009) and the row-count snapshot is unchanged. No pending migrations allowed at deploy time.
5. **Preview deploy.** `vercel` (non-prod) with valid deployment credentials (token/OIDC). Missing auth = BLOCK (never manufacture credentials).
6. **Smoke test.** `scripts/browser-smoke.mjs` (with `BROWSER_SMOKE_ROOT="$PWD/screenshots"`) on dev :8080 and the local built preview :8081 (baselines `screenshots/app-builder-preview.json` / `app-builder-built.json`, regenerated with the new surface); verdicts must be green (exit 0, status 200, no console/page errors).
7. **Verify critical APIs / server functions.** On the local preview and on the Vercel preview: `POST /api/webhooks/cashfree` with a bad/missing signature must get **401** with the `{ code, message, requestId }` envelope (fail-closed — an accepted unsigned webhook is BLOCKING); `/robots.txt` and `/sitemap.xml` answer host-aware; `/terms` etc. serve the correct host surface; `/api/favicon` responds. (Order creation no longer exists after Phase 00 — the webhook is the only money path; in-flight legacy orders settle through it.)
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
