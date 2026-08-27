# PHASE_01_HANDOFF.md — FoundersBid (FINAL, released 2026-08-27)

**Status: RELEASED TO PRODUCTION.**
- Release SHA `da76db8462f4c80c08b04cd167eb3521bf11cedb` (== origin/main at deploy; tree clean).
- Production deployment `dpl_DxjBNp1pDzf85jxXxeWpDAEKn4LZ` (READY, all four apex+www domains 200, /api/auth/ok 200).
- CI: SUCCESS on `d7f289f` (the runtime-equivalent commit; da76db8 is docs-only on top of it).
- Migrations 0012–0014 gated-applied to production Neon (ledger 0002–0014; additive; 00.6 production unaffected during apply).
- **Incident record:** the first production rollout 500'd on every route because `BETTER_AUTH_SECRET` was not yet set on the Vercel project (auth fails loudly at startup by design). Rolled back to `c50cbdb` within minutes (all domains restored to 200), secret generated + added, redeployed clean. Lesson: set new required env BEFORE deploying a phase that requires it.
- Post-release production verification: 4 domains 200; /api/auth/ok 200; signup round-trip (1 real account ops-e2e@bidthrone.lol, credential hash owned by Better Auth, email_verified=false pending audited admin verification); duplicate signup 422; wrong password 401; unsigned webhook 401; unknown-JSON 404 envelope with requestId === x-request-id; CSP nonce on HTML; /bounties index,follow; /signin + legal noindex,follow; dashboard redirects anonymous to /signin; DB: 0 bounties/projects/money_events (honest empty marketplace); 0 error-ish runtime events in the last 100.
- Env additions: `BETTER_AUTH_SECRET` (production; preview NOT yet set — previews are SSO-gated/hermetic, noted as follow-up).

## Final architecture relevant to future phases

- **Runtime unchanged:** TanStack Start (React 19) + Vite 8 + Nitro 3 `vercel` preset; one host-aware app; migrations gated via `DATABASE_URL=… node scripts/migrate.mjs [--dry-run]`.
- **Auth = Better Auth 1.7** (`src/lib/auth.server.ts`): models mapped onto the Phase 00 identity core — `user`→`users` (name→display_name, emailVerified→email_verified), `session`→`sessions`, plus NEW `account` (credentials, password hash owned by Better Auth) and `verification` tables. Admin plugin provides `role`/`banned`/`"banReason"`/`"banExpires"` columns (Better Auth DEFAULT camelCase names — plugin fields are NOT name-mappable; `"impersonatedBy"` on sessions exists for the same reason). Production DB = node-postgres via `kyselyAdapter(kysely, {type:"postgres"})`; local/test = the SAME PGLite instance via in-repo dialect `src/lib/auth-pglite-dialect.server.ts` (deps: `kysely`, NOT the stale-peer `kysely-pglite-dialect`). Session read: `getSession()` in `src/lib/authz.ts` (uses `getRequest()` headers). Cookie: httpOnly+SameSite=lax; `useSecureCookies` only in production. `BETTER_AUTH_SECRET` required in production (fails loudly). Trusted origins = 4 product domains (apex+www) + localhost:8080/8081 + `AUTH_TRUSTED_ORIGINS` env.
- **authz.ts** (server-only): `getSession`, `requireUser` (401/403 suspended), `requireAdmin` (403), `requireVerifiedEmail` (money-facing), `AuthzError`, `toErrorResponse`. serverFn boundaries map AuthzError → `{ ok:false, code, message }`.
- **Mail adapter** `src/lib/mail.ts`: resend transport (RESEND_API_KEY+MAIL_FROM) or honest `disabled` transport (logs, sent=false — never fakes). Without a provider: verification is recorded-not-emailed; **admin manual verification** (audited) is the degraded path; password reset needs the provider.
- **Money core** `src/lib/money.ts`: `PLATFORM_FEE_BPS=1000` single source; `computeFee` (round-half-up), `splitSponsorCharge` (₹10,000→₹1,000 fee→₹11,000 subtotal), `allocateEvenly` (largest-remainder; sums exact), `formatMinor` (INR has TWO decimals — paise; JPY/KRW are 0-decimal; a 100x display bug was caught live). Deps: integer minor units + explicit ISO currency everywhere.
- **Payments boundary** `src/lib/payments/provider.ts`: `PaymentProvider` interface; `CashfreeProvider` collect-only (INR-native, order_amount = minor/100 rupees); `FakeProvider` = TEST-ONLY singleton, selectable ONLY via `PAYMENT_PROVIDER=fake` in non-deployed runtimes (refused when VERCEL_ENV or NODE_ENV=production). `moneyMode()`: `off` (shipped production state — funding refuses honestly), `sandbox` (flag + fake provider in dev, or Cashfree sandbox), `live` (requires flag + CASHFREE_MODE=production + `hasPayoutRail()` — CASHFREE_PAYOUT_CLIENT_ID/SECRET — none exist yet, so live is UNREACHABLE by design). `.env.local` has CASHFREE_MODE=production; don't rely on sandbox defaults locally.
- **State machines** `src/lib/marketplace/state.ts` (pure): BOUNTY_TRANSITIONS (DRAFT→AWAITING_FUNDING→OPEN→APPLICATION_CLOSED→SUBMISSION→JUDGING→AWARDED→SETTLING→COMPLETED; CANCELLED pre-work only; DISPUTED exits), PROJECT_TRANSITIONS, PARTICIPANT_TRANSITIONS, MILESTONE_TRANSITIONS; `sponsorMaySelfCancel` (fair cancellation: self-serve before work begins, dispute path after), `validateRewardAllocations` (sum == advertised reward; structure shape rules).
- **Ledger** `src/lib/marketplace/ledger.server.ts`: `fundingDecomposition` (stored on payments.meta: reward_minor + platform_fee_minor + fee_bps; client never supplies it); `settleFundingPayment` (transactional, `for update`, decomposition re-asserted, claim-guard `update … where status='pending' returning id`, writes REWARD + PLATFORM_FEE money_events; concurrent callers → alreadyPaid); `createAwardObligations` (idempotent per award).
- **Bounty engine** `bounties.server.ts` + client `bounties.ts`; **project engine** `projects.server.ts` + `projects.ts` (Mode B: pre-work proposals only, sum-checked milestone selection, fundProject → AWAITING_FUNDING, verifyProjectFunding → ACTIVE activates milestone #1, milestone approve/reject → next ACTIVE → COMPLETION_REVIEW).
- **Trust** `reviews.server.ts` (resolveReviewParties gate: only COMPLETED work, verified counterparties, reviewee derived server-side; review_received reputation_events; `verifiedOutcomeCounts`), `disputes.server.ts` (manual OPEN→UNDER_REVIEW→RESOLVED→CLOSED, respondents derived), `notifications.server.ts` (FR-10 list, in-app authoritative), `audit.server.ts` (append-only `insertAudit`).
- **Admin** `/admin` (admin.tsx): admin-role session-gated (non-admin → /dashboard), audited verify-email/suspend/reinstate/resolve-dispute; payments + audit views.
- **SEO** `scripts/host-seo-shared.mjs`: PATH_TITLES extended (signin/signup/dashboard/settings/profile/admin/bounties/projects); `isPrivatePath` → noindex,follow (dashboard, settings/*, admin*, test/*, api/*, signin/signup); legal pages keep noindex,follow; listing/detail/profile = product content (index,follow). Middleware remains the single head authority (route-level head() is stripped in prod by injectSeoHead — don't use route head for SSR pages).
- **TEST-ONLY seams** (all refused in deployed envs): `/test/checkout/$paymentId` (fake provider "hosted page" → markPaid + verifyFundingAndOpen → redirect), `POST /api/dev/verify-email` (simulates audited admin verification), `GET /api/dev/state?bountyId=` (read probe with env diagnostics).
- **Vite dev caveat:** clicks race hydration — E2E must `waitForFunction` for `__reactProps` before clicking (Playwright MCP caching also bit: full `location.reload()` after goto).

## Schemas / migrations introduced

- **0012_auth_marketplace_identity.sql** — users +email_verified/image/role/banned/"banReason"/"banExpires"; sessions +ip_address/user_agent/updated_at/"impersonatedBy"; NEW account (id, user_id, issuer, account_id, provider_id, tokens, scope, password, timestamps; unique(provider_id, account_id)); NEW verification; profiles +handle(unique)/avatar_url/location/timezone/skills/categories/portfolio_links/github_url/linkedin_url/website_url/availability/company_name/company_website/company_about/is_sponsor. NOT yet applied to production Neon.
- **0013_marketplace_core.sql** — bounties (bnt_), bounty_applications (app_; unique(bounty_id,user_id)), bounty_participants (par_), bounty_submissions (sub_), bounty_awards (awd_; unique(bounty_id,place), unique(bounty_id,user_id)), projects (prj_), project_proposals (prp_), project_milestones (mst_; unique(project_id,seq)). No subquery CHECKs (Postgres disallows — self-apply prevention is in the service layer).
- **0014_money_trust.sql** — money_events (mev_; append-only), payout_obligations (pob_; check((award_id is null) <> (milestone_id is null))), reviews (rev_), disputes (dsp_), notifications (ntf_; partial index for unread), reports (rpt_), marketplace_events (mke_), reputation_events (rep_).
- Migration prefix registration: `bnt_ app_ par_ sub_ awd_ prj_ prp_ mst_ mev_ pob_ rev_ dsp_ ntf_ rpt_ mke_ rep_` + Better Auth `usr_ ses_ acc_ ver_ ba_` (generateId in auth.server.ts) + existing `pmt_ pmt_` payments + `aev_`.

## Important invariants

- Advertised reward == sum(allocations) == what winners receive; fee is sponsor-side on top (PLATFORM_FEE_BPS); never hidden deductions.
- sum(REWARD+PLATFORM_FEE money_events) == verified sponsor charge; settlement claim-guarded (exactly-once); decomposition re-asserted from payments.meta.
- Payout obligations settled ONLY by a real rail; PENDING obligation = honest public liability. No Cashfree Payouts configured ⇒ production mode=off (no real funding accepted).
- Sponsor cannot self-apply/self-propose (service-enforced; Postgres disallows subquery CHECKs).
- Reviews only post-COMPLETED, unique per reviewer, counterparties derived server-side.
- All authorization server-side (session); client payload never carries identity/amounts/product.

## Public routes

`/` (host-aware marketplace home — NOT yet rebuilt to marketplace home, still pre-launch page) · `/bounties` `/bounties/new` `/bounties/:id` · `/projects` `/projects/new` `/projects/:id` · `/dashboard` · `/profile/:handle` · `/settings/profile` · `/signin` `/signup` · `/admin` · `/api/auth/*` (Better Auth) · existing legal pages · `/api/webhooks/cashfree` · test seams above.

## Money/payment behavior

- Funding (flag OFF in production): publish → funding_disabled (honest copy, rollback to DRAFT, no payment row). Dev with fake provider: publish creates provider order session-first → pending payments row (meta holds bounty_id/reward/fee/fee_bps) → `/test/checkout/<paymentId>` marks paid → settle → OPEN.
- Project: select → fundProject → AWAITING_FUNDING → verified → ACTIVE (milestone #1 ACTIVE).
- Webhook foundation unchanged (fail-closed, replay window, idempotent settlement via settleFundingPayment — bounty funding settlement entry point is `verifyFundingAndOpen`/`verifyProjectFunding`; **NOTE: the Cashfree webhook route does NOT yet route marketplace payments into verifyFundingAndOpen** — wiring it is part of the remaining work before flag-ON).

## Known limitations (documented, intentional)

- Production money mode = OFF (no payout rail) — funding UI disabled honestly.
- Email delivery unconfigured → verification via audited admin action; password reset requires provider.
- No organizations (single-user sponsors); no uploads (external https URLs only).
- No E2E Playwright suite for marketplace paths yet (engine + flow proven by 8 integration tests + manual browser run).

## Release identity (mid-phase)

- All Phase 01 work so far: local main, ~8 focused commits on top of `071fc17` (00.6 cutover record). CI not yet run on this branch state; NOT pushed yet.

## Migration numbers

0012 (auth/identity), 0013 (marketplace core), 0014 (money/trust) — authored, all additive; NOT applied to production yet (gated apply is part of the release step).

## Schemas / invariants / routes: see sections above (unchanged by release)

## RELEASED (2026-08-27, this session)

- **Phase 01 (FoundersBid marketplace)**: live — release runtime SHA `d7f289f`, docs tip `2ba63cc`.
- **Phase 01B (Startup Graveyard)**: live — release SHA `4a6971406d1387e0a05c2fc75bb0038a02adfa3b`, production deployment `dpl_CNrVXvhUK93gPazkQexmFHooKXyK`; migration 0015 gated-applied (ledger 0002–0015); /graveyard live with honest empty state; all four domains + auth 200; CI SUCCESS.
- Next: PHASE_02_CULTUREBID (spec first — reuses the shared bounty engine with creative categories + brand/creator roles), then PHASE_03_BIDCEPTION, PHASE_04_BIDTHRONE.
- Follow-ups logged: preview BETTER_AUTH_SECRET env; Cashfree webhook wiring for marketplace funding settlement (required BEFORE flag-ON); professional legal review of the marketplace drafts.

## Known gotchas for the next round

- Write files SLOWLY: two corrupted-file incidents this round (garbage tokens mid-write) — always re-read after write and typecheck.
- serverFn loader return types must be serializable (no `Record<string, unknown>` — use explicit typed shapes).
- `.env.local` CASHFREE_MODE=production (folded sandbox→off; moneyMode now handles fake provider explicitly).
- PGLite is in-process: dev server state ≠ test process state; use /api/dev/state for E2E assertions.
- macOS bash: no `head -n -1`; grep needs `--` before `-i` patterns; `cat -A` unavailable.
- Dev server restart wipes PGLite (in-memory).