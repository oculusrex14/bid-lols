# DEPLOYMENT.md — Autonomous Deployment Sequence

**Status:** Runbook for deploying the Bid Network. Defines the sequence an autonomous agent may run end-to-end, what blocks it, and what "verified" means.

## Topology (verified)

- **Platform:** Vercel project `bidthrone` (`prj_sJF1T6PBZoNkFnXRD9jvjqnr5PUt`), Nitro `vercel` preset, `serverDir: ./server`. No `vercel.json` — platform behavior is default; if a setting must change, create `vercel.json` deliberately. **Do NOT attempt host-scoped `redirects` in `vercel.json`**: the schema rejects a `host` property on redirects (verified — deploy fails with "should NOT have additional property `host`"); the www→apex 301s (Phase 00.6) are therefore implemented in-app (shared `wwwRedirectFor` in `scripts/host-seo-shared.mjs`, applied by the Nitro `seo-host` middleware + the dev twin), which also keeps dev and prod byte-identical in behavior.
- **Database:** Postgres (Neon) via `DATABASE_URL` (Vercel env; `.env.local` locally, never committed). Production requires it — the runtime fails to start without it (`resolveDbConfig`).
- **Git remote (Phase 00.5):** `origin` = `github.com/oculusrex14/bid-lols` (public; `main`). `new-repo` (`lark-zenith-able-tulip`) is the superseded export — never push release work there. Vercel project `bidthrone` is **not yet Git-integrated** (`vercel git connect` fails without the Vercel GitHub App installed for the account — browser-side, external follow-up). Until then, releases are CLI deploys from a clean local tree at the pushed SHA (see "Releasing from a clean SHA").
- **Build chain (Phase 00/00.5):** `npm run build` = `vite build` only — no DB connection, no DDL. Migrations run exclusively through the gated step below. **PGLite is excluded from cloud build output** (Phase 00.5, AC-9.1): Vercel sets `VERCEL=true` at build time, `vite.config.ts` bakes that into `import.meta.env.VERCEL_BUILD`, and `db.server.ts` dead-code-eliminates the PGLite fallback + its migration glob from the artifact. A Vercel runtime without `DATABASE_URL` fails loudly at module load (AC-9.2) instead of falling back. `node scripts/copy-pglite.mjs` stages PGLite wasm **into the local preview loop only** — local builds keep PGLite; the local built preview (:8081) is hermetic.
- **Host routing:** each of the four domains serves its own product surface from the same app (Host header → product). No cross-domain 302 mapping; legacy board paths 308 → same-host `/` (`server/middleware/seo-host.ts` + dev twin in `scripts/host-seo-plugin.mjs`, shared logic in `scripts/host-seo-shared.mjs`).

## Expected domains

- `bidthrone.lol` (+ `www.`) — reputation & discovery umbrella
- `foundersbid.lol` (+ `www.`) — startup execution
- `culturebid.lol` (+ `www.`) — creative bounties
- `bidception.lol` (+ `www.`) — nested & team bounties

All four are in `vite.config.ts` `allowedHosts` (dev Host-header testing). Each domain serves its own product surface from the same app; unknown hosts get the bidthrone umbrella default. CNAME/Vercel-domain state is **out of repo** — verify on the Vercel project before relying on a domain.

## Releasing from a clean SHA (Phase 00.5)

Production must be reproducible from GitHub. The release protocol:

1. Working tree clean: `git status --porcelain` prints nothing.
2. Commit all intended work (focused commits; never env files, secrets, `.vercel/`, or generated output).
3. Push fast-forward only — **never force-push**: `git push origin main`.
4. Verify identity: `git fetch origin && [ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ]` — local release SHA == remote SHA.
5. Deploy production from that exact tree: `vercel deploy --prod` (or the platform mechanism) while `git status --porcelain` is still empty. Record the deployment id and confirm the deployment's recorded git SHA == the released SHA and its dirty flag is not set (`vercel inspect <url>` / API).
6. Until Vercel Git-integration is available (external follow-up below), step 5's clean-tree CLI deploy is the reproducibility guarantee: anyone checking out the pushed SHA and running `vite build` produces the deployed artifact.

External follow-up (not in repo scope): install the Vercel GitHub App for the account (browser: github.com/settings/apps), then `vercel git connect https://github.com/oculusrex14/bid-lols.git` so pushes to `main` auto-deploy production from the SHA.

### Independent CI gate (Phase 00.6, WS5; extended RC3)

RC3 extends the gate to a second job and hardens it:

- `gates`: lint -> typecheck -> unit/integration (hermetic PGLite) -> build
  -> artifact sanity -> **complexity gate** (`node scripts/complexity-report.mjs
  --gate`: production code only — cyclomatic <= 15, nesting <= 5, functions
  <= 120 non-blank lines; thresholds are the "must refactor" line, measured
  by scripts/complexity-report.mjs, not guessed) -> **runtime dependency
  audit** (`npm audit --omit=dev --audit-level=high`).
- `e2e`: Playwright chromium against a local dev server with the TEST-ONLY
  fake provider (money machinery exercised end to end without real rails):
  the funded marketplace journey (scripts/marketplace-e2e.mjs) and the
  cross-product critical paths (tests/e2e/critical-paths.mjs).
- `codeql` runs from its own workflow (codeql.yml, weekly + PRs).
- GitHub Actions are pinned to immutable commit SHAs (versions noted in
  comments); Dependabot (dependabot.yml) keeps npm + actions current weekly.

### Independent CI gate (Phase 00.6, WS5)

`CI` (`.github/workflows/ci.yml`) runs on every `pull_request` and on pushes
to `main` under Node 24 with `npm ci` + lockfile caching: **lint →
typecheck → test → build**, all hermetic (PGLite local DB; fake provider
credentials inside tests; no production secrets in CI). A release SHA with a
red CI run must not be deployed.

Recommended `main` branch protection (GitHub: repo → Settings → Branches →
Add branch protection rule for `main`):

- **Require status checks to pass before allowing merges** — select `CI` (the
  workflow name);
- **Restrict force pushes** — untick "Allow force pushes";
- (optional) require reviews for PRs to `main`.

If the automation/account lacks API permission to change these settings,
apply them in the browser as above and record it in the phase notes — the
workflow itself does not need to modify GitHub settings.

## DNS note — culturebid.lol apex (Phase 00.5, WS5)

`culturebid.lol`'s **apex** A records publicly resolve to private `10.x` addresses (verified via Cloudflare DoH), so the apex is unreachable from the internet while `www.culturebid.lol` works. The other three apex domains are healthy.

Exact correction at the DNS provider (zone `culturebid.lol`):

- apex: replace the broken A records with Vercel's apex record — A `76.76.21.21` (confirm the current value in the Vercel dashboard → project → Domains; Vercel may update its anycast IP).
- www: keep/set CNAME `www.culturebid.lol` → `cname.vercel-dns.com`.

Verification after the change (run both before trusting the apex):

```bash
# public resolution must be Vercel's anycast IP, not 10.x
curl -s "https://cloudflare-dns.com/dns-query?name=culturebid.lol&type=A" -H "accept: application/dns-json" | grep -o '"data":"[0-9.]*"'
curl -sI https://culturebid.lol | head -3   # expect HTTP 200
curl -sI https://www.culturebid.lol | head -3  # expect HTTP 200
```

Until the apex is verified reachable, the app routes **both** clickable cross-product links and **declarative** URLs (canonical, og:url, og:image, sitemap URLs, the robots `Sitemap:` line, JSON-LD `url`/`@id`, IndexNow) to `https://www.culturebid.lol` (`linkOrigin()` / `seoOrigin()` in `scripts/host-seo-shared.mjs`). Search engines must never be told that the broken apex is canonical. Re-check after the DNS fix, then remove `"culturebid"` from BOTH `WWW_NORMALIZE_EXCLUDED` and `SEO_CANONICAL_WWW` in `scripts/host-seo-shared.mjs` (the test suite pins the two sets in agreement); www 301s to apex and the apex becomes canonical again. Full rollback steps: `docs/ops/SEARCH_VISIBILITY.md`, "CultureBid DNS mode".

## Autonomous-safe deployment sequence

Execute in order; any BLOCKING failure (below) stops the run and triggers rollback rules.

1. **Verify clean/understood diff.** `git status` + `git diff`: every changed path maps to the current task; no application-code change unless the task says so; no env files, secrets, local DBs, `.vercel/` output, or temp files in the diff.
2. **lint / typecheck / test.** `npm run lint` (eslint), `npm run typecheck`, `npm run test` — all green.
3. **Production build locally.** `npm run build` — pure `vite build`: no DB connection, no DDL, no PGLite assets. Local preview loop: `npm run build && node scripts/copy-pglite.mjs && npm run preview` (port 8081; PGLite hermetic).
4. **Verify migrations (gated step).** Pre-deploy ledger check (`DATABASE_URL=<prod> node scripts/migrate.mjs --dry-run` — lists pending, applies nothing; expected at deploy time: "0 pending"), then apply (`DATABASE_URL=<prod> node scripts/migrate.mjs`) when anything is pending, then confirm the `_migrations` ledger matches expectations (Phase 00 example: pre = 0002–0008, post = +0009; prod is at head since 2026-08-29) and the row-count snapshot is unchanged. No pending migrations allowed at deploy time. **Enforced since the post-RC3 incident (d28d380):** the Neon boot path asserts the ledger ⊇ `REQUIRED_MIGRATIONS` before the first query (`src/lib/schema-ledger.ts`), so a skipped apply fails the step-6 smoke test with the missing files named — instead of a route-level 500 two releases later (the 0017 gap that broke `/bounties`).
   **Schema preflight, in order (P0 #4 — release gate on the authenticated operator/runtime; the production `DATABASE_URL` NEVER enters ordinary CI or untrusted PR pipelines):**
   1. Determine the latest repository migration: `ls migrations/*.sql | sort | tail -1` (CI pins `REQUIRED_MIGRATIONS` in `src/lib/schema-ledger.ts` to the directory, so the two cannot drift).
   2. Production `migrate.mjs --dry-run` — lists pending, applies nothing.
   3. The production deploy MUST NOT continue while expected migrations are pending.
   4. Safely apply the required additive migrations BEFORE the app release (additive `CREATE … IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` DDL is backwards-compatible with the currently running build).
   5. Re-run the dry-run and require zero pending.
   6. Deploy the exact pushed SHA (step 8).
   7. Production critical-route smoke test (step 10).
5. **Preview deploy.** `vercel` (non-prod) with valid deployment credentials (token/OIDC). Missing auth = BLOCK (never manufacture credentials).
6. **Smoke test.** `scripts/browser-smoke.mjs` (with `BROWSER_SMOKE_ROOT="$PWD/screenshots"`) on dev :8080 and the local built preview :8081 (baselines `screenshots/app-builder-preview.json` / `app-builder-built.json`, regenerated with the new surface); verdicts must be green (exit 0, status 200, no console/page errors).
7. **Verify critical APIs / server functions.** On the local preview and on the Vercel preview: `POST /api/webhooks/cashfree` with a bad/missing signature must get **401** with the `{ code, message, requestId }` envelope (fail-closed — an accepted unsigned webhook is BLOCKING); `/robots.txt` and `/sitemap.xml` answer host-aware; `/terms` etc. serve the correct host surface; `/api/favicon` responds. (Order creation no longer exists after Phase 00 — the webhook is the only money path; in-flight legacy orders settle through it.)
8. **Production deploy.** `vercel --prod` (or the authorized deployment mechanism).
9. **Verify all custom domains.** HEAD/GET `https://bidthrone.lol`, `foundersbid.lol`, `culturebid.lol`, `bidception.lol` (+ `www.` where CNAMEs exist): 200, correct per-host coming-next surface (domain-specific `<title>`), host-aware canonical/OG; Vercel logs show the Postgres connection, not PGLite fallback.
10. **Inspect runtime errors/logs + critical-route smoke.** Vercel function logs for the new deploy: no unhandled server errors, no 5xx on the routes visited in step 9. Then run `node scripts/prod-critical-smoke.mjs` (P0 #5; RC4 updated): all 17 critical routes (the four homepages, founders `/bounties` `/projects` `/graveyard`, culture `/bounties`, bidception `/bidception`, bidthrone `/leaderboards` `/bid-index` `/market-rates`, signin, signup, robots, sitemap, security.txt) must answer HTTP 200. A homepage-only check is NOT sufficient — it is exactly what let the RC3 `/bounties` schema incident reach users.
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
- Phase 00.5 additions: a production deployment whose source tree is not exactly the pushed `origin/main` SHA, or whose deployment reports dirty (AC-0.3); PGLite artifacts present in a Vercel build output (AC-9.1); a 404 response missing `noindex,follow` or carrying a canonical for the missing path (AC-6.4); HTML responses on deployed runtimes missing the security header baseline (AC-8.1).

## Non-negotiables

- Never bypass missing authentication (deploy creds, provider creds): stop and report.
- Never manufacture credentials or fake provider responses.
- Never weaken security (open webhooks, disabled checks, swallowed errors) to make a deploy pass.
- Never expose secrets: no values in diffs, logs, screenshots, or committed files.
- Preview → production requires no human confirmation **when the active execution prompt explicitly authorizes production deployment**; otherwise the sequence stops at step 6–7 and asks.
