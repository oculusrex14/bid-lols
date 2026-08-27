# PHASE_01_FOUNDERSBID.md — FoundersBid marketplace

**Status:** ACTIVE (specified 2026-08-27, autonomous execution authorized).
**Goal:** Turn `foundersbid.lol` from a pre-launch page into the first real Bid Network marketplace — startup bounties (Mode A) and projects (Mode B) — on the shared Phase 00/00.5/00.6 foundation, with real identity, a transparent fee, an auditable money ledger, disputes, admin, and notifications. Money-taking stays behind an explicit feature flag until the payout rail is real.

---

## 1. Objective

FoundersBid is the main initial revenue engine. Sponsors put money on a bounded problem; real people do the work; verified outcomes create reputation. Two work models:

- **Mode A — BOUNTY**: multiple qualified participants compete on bounded work (design, research, copy, small dev, prototypes, automation, naming, growth research, data, debugging, audits). Funded before publicly OPEN. Sponsor selects finalist(s)/winner(s) per a published reward structure.
- **Mode B — PROJECT**: sponsor posts a brief, providers submit proposals (approach + quote + milestones — never completed deliverable work), sponsor selects one, funding is required, work proceeds through milestones.

## 2. User roles

| Role | Definition | Powers |
|---|---|---|
| visitor | not signed in | discover, view public listings/profiles/legal |
| member | authenticated user | profile, apply/propose, submit, withdraw, review, dispute |
| sponsor | member with at least one created bounty/project | create, fund, qualify, select, cancel per policy, review |
| provider | member who applied/being paid | work, submit, review sponsor |
| admin | `users.role='admin'` | suspend, qualify, override, resolve disputes, audit, manual-verify email |

Reputation is never purchasable; no pay-to-rank surface exists.

## 3. User journeys

**Sponsor (bounty):** signup → profile → /bounties/new (spec: title, description, category, deliverables, acceptance criteria, reward structure + allocations, currency, deadlines, participant cap, qualification rules, IP/confidentiality rules, attachment links) → DRAFT → publish intent → funding checkout (flag-gated) → verified payment → bounty OPEN → applications arrive → approve/reject → approved participants work → submissions → sponsor judges (finalist/winner/not selected) → payout obligations created → (payout rail when live) → COMPLETED → reviews both ways.

**Builder:** signup → profile → /bounties discover/filter → apply (bounded by cap + qualification) → approved → work begins → submit before deadline → result → review sponsor. Speculative work is bounded by the participant cap + approval gates; nobody is invited to work for free.

**Project both ways:** sponsor posts project → providers propose (approach, experience, evidence, quote, timeline, milestone proposal, notes) → sponsor compares/shortlists/selects ONE → funding required (selected quoted amount + fee) → project ACTIVE → milestones (submit → review → approve/reject) → COMPLETION_REVIEW → COMPLETED → settlement per milestone → reviews.

## 4. Functional requirements

### FR-1 Identity & auth (Better Auth)
- **Decision:** adopt **Better Auth 1.7.x** (`better-auth`, actively maintained; published 2026-08-26) — no hand-rolled auth cryptography or sessions. Postgres via the existing `pg` driver; Better Auth model/field mapping onto the Phase 00 `users`/`sessions` tables (their Phase 00 shapes were deliberately made compatible); additive migration 0012 adds the missing columns + `account` + `verification` tables.
- httpOnly cookies; `secure` in production; sameSite=lax; CSRF = Better Auth origin checks + the existing app CSRF middleware for serverFns; password hashing internal to Better Auth.
- Signup (email+password), signin, signout, session read server-side; `users.status` respected (suspended ⇒ middleware-level block with honest message, except admin routes for the admin).
- Email verification: `email_verified` on users. Mail adapter `src/lib/mail/` (`sendMail`) with a provider transport (Resend-compatible via env) and an explicit **disabled** transport when no provider is configured — disabled logs honestly and never fakes "sent". Without a provider: verification links cannot be emailed; **admin manual verification** (audited) is the degraded path; UI says email delivery is not configured. Password reset requires the mail provider; until then the recovery strategy is: admin-assisted + documented.
- Account status: `users.status ('active','suspended','deleted')` + Better Auth ban fields mapped; admin suspension is audited.
- All authorization server-side (`src/lib/authz.ts`): `requireUser`, `requireAdmin`, `requireSponsorOf(bountyId)`, `requireParticipantOf(...)`, etc. Never trust client-supplied user/org/sponsor identity.

### FR-2 Profiles
- Public `/profile/:handle`: display name, handle (unique), avatar (URL), bio, location, timezone, skills, categories, portfolio links, GitHub/LinkedIn/website, availability, joined_at, verification status (email/admin-verified badge semantics), completed counts (from verified outcomes only), reviews received.
- Sponsor fields on profile: company name, website, short description, stage/category.
- Builder fields: specialties, experience summary, work examples (links).
- Handles: unique, `[a-z0-9_]{2,32}`, reserved slugs (admin, api, bounties, projects, settings, signin, signup, static…). Auto-suggested from email, editable.
- **No organizations in Phase 01** (single-user sponsors with company metadata; record as extension point for Bidception/teams).

### FR-3 Marketplace discovery
- `/bounties` — OPEN/AWARDED public bounties; filters: category, skills, reward range, deadline window, status; sorts: newest, ending soon, reward; cursor pagination (server-side SQL, indexed).
- `/bounties/:id` — full spec incl. funded state, reward breakdown, participant count/cap, deadlines, judging + IP rules; applications/authority-gated actions.
- `/projects`, `/projects/:id` — same for projects (budget range, proposal deadline).
- Empty states are useful (no fake listings); every money state (funded/awaiting funding/…) is visually explicit.
- Marketplace routes are **product-aware**: on `foundersbid.lol` they serve FoundersBid; on other hosts they 302 → `foundersbid.lol` same path until that product's phase.

### FR-4 Bounty lifecycle (Mode A)
States: `DRAFT → AWAITING_FUNDING → OPEN → APPLICATION_CLOSED → SUBMISSION → JUDGING → AWARDED → SETTLING → COMPLETED`; exits: `CANCELLED`, `EXPIRED`, `DISPUTED`. Transitions live in a pure module with an exhaustive allowed-map; DB guarded by conditional updates; every transition audited.
- Reward structures: `WINNER_TAKES_ALL`, `PODIUM` (1–3 places), `FINALIST_POOL` (participation rewards + winner premium). Invariant enforced server-side: `sum(allocation amounts) == reward_total`; advertised reward is never silently reduced (no hidden commission).
- Participants: separate `bounty_participants` lifecycle (`APPROVED → WORK_STARTED → SUBMITTED | WITHDRAWN | DISQUALIFIED`); cap enforced; withdrawal until submission deadline.
- Judging: sponsor sets `place` per submission → AWARDED creates payout obligations.
- **Cancellation fairness (deliberate policy):**
  - Before any approved participant started work: sponsor cancel ⇒ full refund of the reward obligation (fee also refunded; provider processing loss recorded as `PROCESSING`).
  - After work began (any WORK_STARTED/SUBMITTED): sponsor cannot self-cancel — bounty goes `DISPUTED` (or admin `UNDER_REVIEW`) and an admin resolves: compensate eligible participants from the funded pool (recorded as payouts/refunds) and refund the remainder. All admin money actions audited.
- `EXPIRED`: lazy transition when `submission_deadline` passes with no submissions (and via admin sweep).

### FR-5 Project lifecycle (Mode B)
States: `DRAFT → OPEN_FOR_PROPOSALS → PROPOSAL_SELECTED → AWAITING_FUNDING → ACTIVE → MILESTONE_REVIEW → COMPLETION_REVIEW → COMPLETED`; `CANCELLED`, `DISPUTED`. Milestones: `PENDING → ACTIVE → SUBMITTED_FOR_REVIEW → APPROVED|REJECTED → PAID_OUT`.
- Proposals (approach/experience/evidence/quote/timeline/milestones/notes) submitted pre-work; one selected; funding covers quoted amount + fee; sponsor approves milestones; payout obligations per approved milestone.

### FR-5b Cancellation (project)
Before selection: cancel ⇒ refund nothing (unfunded) / refund funding (if funded). After ACTIVE: sponsor cannot self-cancel mid-milestone — dispute → admin resolution (compensate approved-but-unpaid approved work; refund remainder).

### FR-6 Platform fee
- `PLATFORM_FEE_BPS = 1000` (10% sponsor-side), single source `src/lib/money.ts` (`platformFeeBps()`, `computeFee(amountMinor)`, `splitSponsorCharge(rewardMinor, bps)` — pure, unit-tested, integer minor units only).
- Sponsor subtotal = advertised reward + fee (+ tax/processing **only if actually applicable/configured**). Winner reward remains the advertised amount. The marketplace UI shows the decomposition before funding.

### FR-7 Payments & money ledger
- Provider abstraction `src/lib/payments/` (interface: `createOrder`, `getOrderStatus`, `verifyWebhook`, plus `refund`/`payout` **only if actually supported**). Cashfree collect implementation generalized from `cashfree.ts`; a **fake provider** exists for tests/E2E only (`PAYMENT_PROVIDER=fake`, never production).
- Payment proof: webhook + server-side provider verification only; return URLs prove nothing; idempotency keys; provider refs immutable; replay-checked fail-closed webhook (existing foundation, reused).
- **Money events (`money_events`, append-only)**: every money-state transition records entity, type (`REWARD|PLATFORM_FEE|TAX|PROCESSING|REFUND|PAYOUT_OBLIGATION|PAYOUT_SETTLED`), amount_minor, currency, provider, provider_ref, timestamp, actor/system, related payment. Settlements are transactional with claim-guards (no double settlement).
- `payout_obligations` created at award/approved milestone; **only** a real payout rail settles them. **No Cashfree Payouts configured ⇒ `MARKETPLACE_MONEY_LIVE` stays OFF in production**: the full architecture exists, public funding is disabled honestly in the UI ("funding not live yet — founding access"), no real sponsor money is accepted, no fake payout status is ever displayed. Documented exact provider setup required (degradable external blocker).
- Feature flag: `MARKETPLACE_MONEY_LIVE=1` AND provider configured AND payout capability verified ⇒ live. Flag OFF in production Phase 01.

### FR-8 Reviews & reputation seeds
- After COMPLETED work only: sponsor↔provider reviews both directions (quality/communication/timeliness/clarity 1–5 + text). Gating enforced server-side (no reviews for work that didn't happen; unique per reviewer per work).
- `reputation_events` (append-only) written on verified outcomes (win, completion, milestone approval, review received) — Phase 04 consumes. No public ranking computed in Phase 01.

### FR-9 Disputes (manual)
`OPEN → UNDER_REVIEW → RESOLVED → CLOSED`; claimant/reason/evidence links/disputed amount/timeline/admin notes/resolution. Admin may approve settlement, partially settle, refund, cancel, suspend — all audited. No AI adjudication.

### FR-10 Notifications
In-app `notifications` (bell + dashboard) for: application accepted/rejected, proposal received/selected, funding verified, deadline approaching, submission received, winner selected, milestone accepted/rejected, dispute update, payout state, review requested. Email adapter exists; without provider, email is disabled honestly (in-app authoritative).

### FR-11 Attachments
External URL attachments only (https, length-capped, no credentials in URL; rendered as links, never fetched server-side). `src/lib/storage/` adapter boundary reserved for a future provider; uploads are out of scope until a provider exists.

### FR-12 Admin
Protected `/admin` (role-checked server-side; noindex; not linked publicly): users (+suspend/verify), bounties, projects, applications, submissions, payments, payout obligations, disputes, reports, reviews, audit events. Deliberate actions: qualify/override, force-cancel, resolve dispute with money movement, suspend users — every write audited.

### FR-13 Analytics
Marketplace events recorded (`marketplace_events`): bounty_viewed, project_viewed, application_started/submitted, proposal_submitted, participant_approved, submission_received, winner_selected, funding_started, funding_verified, milestone_completed, review_created. Internal only; no public exposure (00.6 semantics preserved).

### FR-14 Marketplace legal
Before flag-ON, `src/lib/legal.ts` + /terms /privacy /refund gain marketplace-appropriate structured drafts: Terms, Privacy (unchanged truth), Payment/refund terms, Bounty rules, Project rules, Dispute policy, IP rules. IP default: winning deliverable IP transfers per published bounty rules only after the reward obligation is satisfied; non-winning entries keep IP except evaluation rights; project IP transfers per milestone terms. Clearly labelled "operational draft for professional legal review".

## 5. Routes (all on the shared app; product = host)

`/` (marketplace home, host-aware) · `/bounties` · `/bounties/new` · `/bounties/:id` · `/projects` · `/projects/new` · `/projects/:id` · `/dashboard` (applications/proposals/submissions/funding/notifications tabs) · `/profile/:handle` · `/settings/profile` · `/signin` `/signup` · `/admin/*` · `/api/auth/*` (Better Auth) · `/api/webhooks/cashfree` (existing) · legal pages (existing).

## 6. Data model (migrations 0012–0014, all additive)

- **0012_auth**: alter `users` (+`name`,`email_verified`,`image`,`role`,`banned`,`ban_reason`,`ban_expires`); alter `sessions` (+`ip_address`,`user_agent`); create `account`, `verification` (Better Auth shapes); alter `profiles` (+`handle` unique, `avatar_url`, `location`, `timezone`, `skills`, `categories`, `portfolio_links`, `github`,`linkedin`,`website`, `availability`, `company_name`,`company_website`,`company_about`, `is_sponsor`).
- **0013_marketplace_core**: `bounties`, `bounty_applications`, `bounty_participants`, `bounty_submissions`, `bounty_awards`, `projects`, `project_proposals`, `project_milestones` (shapes per FR-4/5; CHECK-constrained statuses; `unique(bounty_id,user_id)` etc.; indexes on (product,status,created_at desc), (status, deadline), sponsor/provider FKs).
- **0014_money_trust**: `money_events` (append-only decomposition), `payout_obligations`, `reviews`, `disputes`, `notifications`, `reports`, `marketplace_events`, `reputation_events`.

IDs: `makeId(prefix)` text ids (`bnt_`,`app_`,`par_`,`sub_`,`awd_`,`prj_`,`prp_`,`mst_`,`mev_`,`pob_`,`rev_`,`dsp_`,`ntf_`,`rpt_`,`mke_`,`rep_`). Money: integer minor units + `currency char(3) default 'INR'`.

## 7. State machines

Defined as pure data in `src/lib/marketplace/state.ts` (allowed-transition maps, guards) with exhaustive unit tests; DB updates use `update … where status = $expected` claim-guards; illegal transitions throw explicit errors and are audited when attempted by privileged actors.

## 8. Permissions matrix (highlights)

| Action | visitor | member | sponsor(own) | admin |
|---|---|---|---|---|
| view public listing | ✓ | ✓ | ✓ | ✓ |
| create bounty/project | ✗ | ✓ | ✓ | ✓ |
| fund | ✗ | ✓(flag+verified email) | ✓(own) | ✗ |
| apply/propose | ✗ | ✓ | ✗(own listing) | ✗ |
| approve application | ✗ | ✗ | ✓(own) | ✓ |
| judge winner | ✗ | ✗ | ✓(own, pre-award) | ✓ |
| cancel | ✗ | ✗ | ✓(policy-gated) | ✓ |
| resolve dispute / money action | ✗ | ✗ | ✗ | ✓ (audited) |
| suspend user / verify email | ✗ | ✗ | ✗ | ✓ (audited) |
| review | ✗ | ✓(participant/counterparty) | ✓(completed only) | ✗ |

## 9. Security (must pass before release)

IDOR (every fetch authorizes by owner/participant/admin), CSRF (origin checks + app middleware), XSS (no raw HTML injection of user content; escape + allowlist rendering), SQL injection (parameterized only), SSRF (attachment URLs never fetched), open redirects (no redirect to client-provided URLs), webhooks (fail-closed verified), payment tampering (server-computed amounts only), race conditions (claim-guards/transactions/unique constraints), double settlement (idempotency + claim guard), privilege escalation (role checks server-side; admin role not client-settable), session fixation (Better Auth), rate limiting (auth + submission endpoints), brute force (rate limit signin), secret exposure (never logged/committed; admin/audit never logs secrets).

## 10. SEO

Bounty/project public pages indexable when public+funded (index,follow) with canonical apex URL + OG; private/dashboard/admin/settings noindex; sitemap.xml extends the 00.6 policy: home + public OPEN/AWARDED bounties + ACTIVE projects (capped, DB-backed, cached); JSON-LD only where accurate (ItemList on /bounties). CultureBid/Bidception hosts still 302 marketplace paths to foundersbid.

## 11. Edge cases

Deadline enforcement (server time), concurrent applications vs cap (transactional), duplicate submissions (unique), self-dealing (sponsor can't apply on own listing), expired sessions, webhook replay (timestamp window), double-settlement (claim guard), cancelled-while-funded (refund obligations), participant over-cap (unique + count check), currency mismatch (single-currency bounties; currency never mixes in one ledger decomposition), zero-participant awards (EXPIRED refunds), suspended users (cannot act; listings they own get admin attention).

## 12. Out of scope (Phase 01)

Payout execution in production (flag OFF), refunds via provider API (recorded obligations; manual/provider-later), organizations, CultureBid/Bidception surfaces, Bidthrone reputation UI, file uploads, E2E real charges, real email delivery (adapter + flag only), Bidception nesting, public leaderboards, entertainment features.

## 13. Workstreams

WS1 auth (Better Auth + 0012 + routes + admin role) · WS2 profiles (+handles) · WS3 money core (money.ts, payments adapter generalization, money_events, payout_obligations, flag) · WS4 bounty engine (state machine + serverFns + routes) · WS5 project engine · WS6 discovery/SEO · WS7 reviews/reputation seeds/disputes · WS8 notifications (+mail adapter) · WS9 admin · WS10 legal marketplace drafts · WS11 tests (unit/integration/E2E) · WS12 release (migrate→CI→preview→prod→verify→handoff).

## 14. Migration plan / rollback

Migrations applied gated (`DATABASE_URL=… node scripts/migrate.mjs --dry-run` then real) against the shared Neon before deploy; all additive (new tables/columns only; no legacy drops). Rollback: Vercel redeploy of previous production alias (instant); migrations are additive so the previous build keeps running safely.

## 15. Acceptance criteria (verification matrix)

| # | Criterion | Check |
|---|---|---|
| AC-1 | signup/signin/signout work; session cookie httpOnly+secure(prod); suspended user blocked | integration + E2E |
| AC-2 | profile CRUD + unique handle + public page | integration + E2E |
| AC-3 | bounty create→spec validation (allocations sum)→DRAFT→publish→AWAITING_FUNDING | integration |
| AC-4 | funding: fake-provider paid → payments.paid + money_events(REWARD+PLATFORM_FEE sum == charge) + OPEN, idempotent under duplicate webhook | integration |
| AC-5 | apply→approve→submit→judge→AWARDED→payout_obligations == advertised rewards | integration |
| AC-6 | flag OFF ⇒ no funding UI path, honest copy, no real money accepted | manual + integration |
| AC-7 | project: propose→select→fund→milestone approve→obligation | integration |
| AC-8 | reviews only post-completion, unique, both directions | integration |
| AC-9 | dispute lifecycle + admin resolution audited | integration |
| AC-10 | admin authorization: non-admin 403/redirect on all /admin actions | integration |
| AC-11 | notifications emitted on the FR-10 trigger list | integration |
| AC-12 | filters/sorts/pagination on /bounties with indexed queries | integration |
| AC-13 | SEO: public listing indexable+canonical+OG; private noindex; sitemap includes live listings | unit + curl |
| AC-14 | E2E: sponsor create→fund(fake)→approve→judge; builder discover→apply→submit→win→review | Playwright |
| AC-15 | security checklist §9 reviewed clean | review |
| AC-16 | typecheck/lint/test/build green in CI; migrations applied gated | CI |

## 16. Completion checklist

- [ ] Spec reviewed against mission Phase 01 (this file)
- [ ] WS1–WS12 implemented + tests
- [ ] Migrations 0012–0014 dry-run + applied gated
- [ ] Security review §9 clean; diff reviewed; secret scan clean
- [ ] Push → CI green → preview → preview-verified (desktop+mobile) → logs clean
- [ ] Production deploy exact SHA → domain verification → docs/STATE.md + ROADMAP + handoff `docs/handoffs/PHASE_01_HANDOFF.md`