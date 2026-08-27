# RC1_PRODUCT_COMPLETION.md — Release-candidate completion pass

**Status:** ACTIVE (specified 2026-08-27, autonomous execution authorized).
**Trigger:** external full-roadmap audit FAILED final completion. RC1 corrects implementation defects, completes the intended product boundaries, replaces pre-launch UX with operational marketplace UX, adds true end-to-end verification in CI, and ships a clean RC1.

**Hard constraints:**
- No new product phase. No real funding enabled: `MARKETPLACE_MONEY_LIVE` stays OFF in production for the entire pass. No Sovereign /live.
- The current stable production deployment is NOT rolled back for these corrections.
- `docs/FINAL_BUILD_REPORT.md` is rebuilt from the actual final RC1 state (it contained stale intermediate references and is not proof of correctness).

## Starting source

- origin/main `78ef2ae` (docs-only tip); runtime ancestor `a4ef783`/`3ea74d2`; production `dpl_4E2d9nWmQL5Fjg7Egsta2L7B1N6M` stable.
- Repository + runtime behavior are authoritative.

## Confirmed P0 defects (root causes, verified in source)

1. **Project milestone binding** — `submitMilestone()` SQL references `$1` (milestone), `$2` (provider user id), `$3` (feedback jsonb) but passes only 2 values: the payload lands in the provider position. Any milestone submission therefore could not succeed / could match the wrong provider.
2. **Bidception funding path** — `publishParentForFunding()` binds `funded_budget_minor`/`funding_payment_id` reversed; the parent payment meta uses `parent_budget_minor` while the shared `settleFundingPayment` reads `reward_minor` → the real parent funding path can never settle (and `parent_id` meta key is missing, breaking test-checkout routing).
3. **Cashfree precision** — `CashfreeProvider.createOrder` does `Math.round(amountMinor / 100)`: ₹1,101.10 (110110 paise) becomes order_amount 1101. Paise are silently dropped.
4. **Product capabilities** — every host exposes every capability (bidthrone can create bounties, culturebid can host projects/graveyard, etc.); no central model, no host redirects, no write-side enforcement (writes only check the session, not the product).

## RC1 acceptance criteria

### R1 — Project engine
- AC-1.1 `submitMilestone` binds ($1 milestone, $2 provider user id, $3 feedback jsonb) correctly; only the selected provider of an ACTIVE project can submit; feedback stored as jsonb.
- AC-1.2 **Full lifecycle test with no manual DB state skips**: create → publish → proposal → select (milestones materialized, sum-checked) → fundProject (fake provider) → verifyProjectFunding (provider re-verified inside the claim) → ACTIVE + milestone #1 ACTIVE → provider submits m1 → sponsor REJECTS with feedback → provider resubmits → sponsor APPROVES (m2 becomes ACTIVE, m1 APPROVED) → provider submits m2 → APPROVE → project COMPLETION_REVIEW → **new `completeProject`** (sponsor; all milestones APPROVED; project → COMPLETED; `project_completed` reputation seed + audit + notifications) → review eligibility: a review for the project is allowed post-COMPLETED and forbidden before it.
- AC-1.3 Negative: wrong provider cannot submit; non-sponsor cannot decide; PENDING milestone cannot be submitted; duplicate/concurrent decisions rejected exactly-once; milestone amounts reconcile exactly to the selected quote.

### R2 — Bidception real funding path
- AC-2.1 `publishParentForFunding`: `funded_budget_minor` = numeric budget (reward pool), `funding_payment_id` = payment id; payment meta = `{ parent_id, reward_minor, platform_fee_minor }` (authoritative shared-decomposition keys + entity routing key); sponsor subtotal charged = reward + fee.
- AC-2.2 `verifyParentFunding` settles through the shared ledger with `entityType: PARENT_WORK` (money_events rows are PARENT_WORK, never BOUNTY), provider re-verification authoritative + idempotent.
- AC-2.3 **Integration test of the production path (no `update … set status='ACTIVE'` shortcuts)**: create parent → fake-provider funding intent → payment decomposition inspected → mark paid → verify → FUNDED → selectCaptain (real engine) → activateParent → ACTIVE; second verify is a no-op.

### R3 — Money precision
- AC-3.1 Provider order amount = exact minor/100 (2-decimal major units, no rounding): ₹1,000 → 1000.00; ₹1,001.00 + 10% fee → ₹1,101.10 exactly; odd paise totals preserved; zero/negative refused.
- AC-3.2 Provider amount, local payment row amount, provider-verified amount and ledger decomposition all agree exactly (asserted in tests).

### R4 — Product capability model
- AC-4.1 `src/lib/marketplace/capabilities.ts` (client-safe, pure): `productCapabilities(product)` (bounties, projects, graveyard, bidception, reputation, shared: profiles/auth/dashboard/notifications), `canonicalProductForCapability(cap)`, `capabilityForPath(pathname)`, `redirectForCapability(hostProduct, pathname)`, `assertProductCapability(product, capability)` (throws AuthzError code `wrong_product`).
- Capability matrix: foundersbid {bounties, projects, graveyard}; culturebid {bounties (creative)}; bidception {bidception}; bidthrone {reputation}; shared everywhere {profiles, auth, dashboard, notifications}.
- AC-4.2 READ: on the wrong host, list/create routes 301 to the canonical product origin (`bidthrone.lol/graveyard → foundersbid.lol/graveyard`, `foundersbid.lol/bidception → bidception.lol/bidception`, `culturebid.lol/projects → foundersbid.lol/projects`); detail routes whose entity belongs to another product redirect to that product's origin; impossible paths get a branded 404.
- AC-4.3 WRITE: every creation/mutation serverFn enforces the capability server-side (independent of routing) and returns `{ ok:false, code:"wrong_product" }` on violation: wrong-product bounty/project/graveyard/parent creation + funding + judging + settlement all refused.
- AC-4.4 Full host × capability matrix test (4 hosts × all routes × read + write).

### R5 — Public site transition
- AC-5.1 ProductShell is auth-aware (session via a shared page-context helper) and renders product nav from the capability model: foundersbid (Bounties/Projects/Graveyard), culturebid (Creative bounties), bidception (Parent work), bidthrone (Leaderboards/Bid Index); anonymous → Sign in; authenticated → Dashboard (+ handle) + compact sign out; theme toggle stays secondary; mobile usable.
- AC-5.2 Homes are operational: hero + primary actions (Post work / Browse / profile), honest funding-off copy ("Marketplace preview is open. Funding opens when the payout rail is enabled."), honest empty states. No "opens in stages", "coming next", "A later product" copy; founding access demoted to a secondary newsletter/launch-updates section (data preserved).
- AC-5.3 CultureBid surfaces use its own terminology (creative bounty / brief), never "FoundersBid".

### R6 — Bidception = nested marketplace work
- AC-6.1 0017 migration (additive): `child_works.kind` ('BOUNTY'/'PROJECT'), `bounties.parent_work_id`, `projects.parent_work_id`.
- AC-6.2 A captain/sponsor allocating a child chooses kind + child spec; allocation materializes a REAL bounties row (child, product = parent's, sponsor = parent sponsor, reward = allocation, funded-by-parent state → OPEN with no self-funding) OR projects row (OPEN_FOR_PROPOSALS, budget = allocation), linked both ways. Fee is charged once at the parent level — child funding obligations never add a second platform fee.
- AC-6.3 Child COMPLETE is gated on the linked entity's real terminal state (bounty AWARDED-or-later; project COMPLETED) — no click-through "Complete" for unfinished work; unlinked legacy reservations keep the direct path.
- AC-6.4 Captain selection UI: sponsor picks a real member via handle search (verified profile shown), never an opaque id; engine unchanged.
- AC-6.5 Parallel allocation invariant still holds after linking (re-run the 5-concurrent test).
- AC-6.6 Full browser E2E: parent → fake funding → captain → activate → child BOUNTY (apply/approve/submit/award) → child COMPLETE → child PROJECT (propose/select/fund/milestones/complete) → dependency unlock → settlement with unused reserve accounting; all money reconciles.

### R7 — CultureBid coherence
- AC-7.1 Structured creative-brief fields (formats, target platform/channel, public-posting required, performance-measurement required, usage/licensing notes) captured on culturebid bounties (jsonb on the bounty; no new mandatory columns for foundersbid semantics), shown on the detail page; self-reported metrics stay self-reported (no fabricated verification).
- AC-7.2 Deferred items recorded as **DEFERRED (post-RC1 backlog)**: invite-only/reputation qualification modes — docs/UI no longer claim they are implemented.

### R8 — Bidthrone leaderboard semantics
- AC-8.1 Each board has its own dedicated, honestly-named metric: MOST EXPERIENCE (verified completions), MOST WINS (place-1 awards), MOST COMPLETED (project completions), HIGHEST RATED (mean review quality, min-3-reviews floor, else excluded), MOST RELIABLE (reliability dimension, min-sample floor), RISING (verified completions in an explicit trailing 90 days with stable tie-breaks), TOP CAPTAINS (captained completions), TOP SPONSORS (sponsor-side verified completed work + provider reviews of the sponsor — never a backwards provider score).
- AC-8.2 `recentActivity` counts bounty wins + project completions + captained completions.
- AC-8.3 Product scoping: boards are explicitly network-wide (no misleading product parameter) OR product-filtered — the shipped choice is network-wide, documented; formula on the page stays in sync with the implementation.
- AC-8.4 Test: seed distinct users into distinct facts and assert each board orders by ITS metric.

### R9 — Bid Index
- AC-9.1 Sample = genuinely verified completed/funded outcomes only (settled bounties / completed projects); created/unfunded/awarded-but-unsettled work never counts.
- AC-9.2 Tests: 9 → suppressed; 10 → published; correct median odd + even (documented rounding); product/category isolation; threshold constant = 10.

### R10 — Graveyard
- AC-10.1 FoundersBid-only (R4 matrix covers routing + writes).
- AC-10.2 Full browser E2E: seller creates → publishes → different buyer offers → seller accepts → a second competing offer cannot be accepted while one is accepted → checklist attestation → mark transferred.
- Off-platform transaction model stays as-is (honest; no escrow claims).

### R11 — E2E in CI (mandatory)
- Deterministic Playwright suite runs in GitHub Actions (`npm run test:e2e`): hermetic PGLite, `PAYMENT_PROVIDER=fake` + `MARKETPLACE_MONEY_LIVE=1` set ONLY on the local CI server process; fake provider provably unreachable in any deployed runtime.
- Workflows: (1) FoundersBid bounty full lifecycle, (2) FoundersBid project full lifecycle incl. reject/resubmit, (3) CultureBid branding/copy/scoping + creative bounty lifecycle, (4) Graveyard offer state flow, (5) Bidception real funding + linked children + settlement, (6) Bidthrone leaderboards seed+order via service APIs, (7) host × capability isolation (prohibited reads redirect / writes refuse) across all four domains.
- CI gate: `npm ci → lint → typecheck → test → build → test:e2e`. A release is NOT green without E2E.

### R12 — SEO/copy
- Sweep all public source for "coming next", "opens in stages", "later product", stale "founding access" primary-CTA wording; every occurrence reviewed. Product metadata (titles/descriptions) updated to operational state. Detail/list routes have accurate host-aware title/description/canonical/OG; no wrong-product canonical pages.

### R13 — Final report + release
- `docs/FINAL_BUILD_REPORT.md` rebuilt from actual RC1 final state (FINAL CODE SHA vs RELEASE SHA vs docs-only SHA explicitly distinguished; deferred features labelled DEFERRED).
- STATE.md + handoffs updated to reality.

## Migration plan
- 0017 (additive): child_works.kind, bounties.parent_work_id, projects.parent_work_id, bounties.status gains no new values (child bounties enter via OPEN with parent linkage documented), parent_works unchanged. Gated dry-run + apply before deploy.

## Rollback
Preview first (RC1 preview), then production from the exact RC1 SHA; rollback = redeploy the previous production alias (additive migrations keep it safe).

## Verification matrix (release gate)
1. lint, typecheck, unit+integration suite, E2E suite (local), build — all green.
2. Migrations dry-run + gated apply.
3. Security review: capability writes, milestone binding, settlement provider-verify, secret scan.
4. Push clean SHA → CI (incl. E2E) green → preview → browser-verify desktop+mobile (all 4 products + host isolation) → preview log inspection.
5. Production deploy from exact SHA → verify all four domains + www redirects + prohibited routes + no unexplained 5xx in runtime logs after real traffic.
6. Funding stays OFF in production (verified: moneyMode=off, funding UI refuses honestly).