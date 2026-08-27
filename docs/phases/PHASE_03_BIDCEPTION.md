# PHASE_03_BIDCEPTION.md — Bidception nested/team bounties

**Status:** ACTIVE (specified 2026-08-27, autonomous execution authorized).
**Principle:** ONE FUNDED PROBLEM. A TEAM FORMS AROUND THE MONEY. Built as an extension on the shared payment/ledger primitives — money cannot be created by nesting.

## Objective

`bidception.lol` joins the marketplace as the nested/team bounty product: a sponsor funds a parent work; a CAPTAIN decomposes it into funded child bounties/projects; the whole team works under strict budget invariants.

## User roles

| Role | Powers |
|---|---|
| sponsor | creates the parent work, funds it, selects the captain, approves settlement |
| captain | decomposes the assigned parent into funded child units within the allocated budget; scoped ONLY to assigned parents |
| provider/child worker | works a child bounty/project (same engines as Phases 01/02) |
| admin | dispute resolution, budget-corruption investigations (audited) |

## Functional requirements

- **FR-1 Parent work**: parent project/bounty with total funded budget (integer minor units), objective, deadline, constraints, captain compensation rule, child-work rules. The parent must be FUNDED before children can be allocated (same funded-before-open rule).
- **FR-2 Captain**: selected by the sponsor from members; scoped ONLY to the assigned parent. Captain profile/reputation tracks: projects captained, completion rate, budget accuracy, dispute rate, sponsor rating, team rating, child-work completion (reputation_events kinds: `captained_completion`, `budget_deviation`).
  Captain CANNOT: change sponsor-owned funding arbitrarily; allocate more than the available balance; pay themselves arbitrary amounts; modify completed child payouts; override disputes; access unrelated parents.
- **FR-3 Children**: parent contains child BOUNTY or PROJECT — reusing the Phase 01 engines verbatim (bounties/projects with a parent link). Every child has: parent_work_id, allocation (from the parent budget), state, dependencies, assignee. Child dependency gates: BLOCKED → READY (when required dependencies COMPLETE where configured) → ACTIVE → COMPLETE.
- **FR-4 Budget invariant (the core of this phase)**:
  `allocated_to_children + reserved + captain_compensation ≤ parent.funded_budget`
  enforced transactionally with row locking on the parent and conditional updates — concurrency-tested (parallel allocation attempts must serialize; over-allocation must throw). Money cannot be created by nesting.
- **FR-5 Parent settlement**: parent completion accounts for completed children, failed/cancelled child work, remaining reserve, captain compensation, refunds, and disputes. Unused allocation is NEVER auto-paid to the captain — it follows explicit sponsor rules (refund or explicit release, audited).

## Routes

`/bidception` (parent list) · `/bidception/new` (sponsor) · `/bidception/:id` (parent tree: children, allocations, dependencies, settlement state).

## Data model (migration 0016, additive)

- `parent_works` (pwr_): id, product, sponsor_user_id, captain_user_id (null until selected), title, slug, objective, funded_budget_minor, currency, status ('DRAFT','AWAITING_FUNDING','FUNDED','ACTIVE','COMPLETING','COMPLETED','CANCELLED','DISPUTED'), captain_fee_minor (from budget), created_at, updated_at.
- `child_works` (cwk_): id, parent_work_id FK, bounty_id nullable ref bounties(id), project_id nullable ref projects(id), title, allocated_minor, currency, state ('BLOCKED','READY','ACTIVE','COMPLETE','FAILED'), depends_on jsonb (child ids), seq. Exactly one of bounty_id/milestone-bearing project per child (extension of the unified engines).
- `captain_compensations` (part of child-work accounting): captain_compensation_minor on parent_works (validated against balance).

## State machines

Parent: `DRAFT → AWAITING_FUNDING → FUNDED → ACTIVE → COMPLETING → COMPLETED` (+ CANCELLED, DISPUTED). Child: `BLOCKED → READY → ACTIVE → COMPLETE | FAILED` (dependency-gated). Allocation: appended records against the parent budget (insert-only with a transactional balance check).

## Security

- Row locking (`for update`) on the parent budget for EVERY allocation; conditional updates; unique constraints; idempotency on allocation ids.
- Captain authorization: scoped membership check on every mutation (`requireCaptainOf(parentId)`).
- All admin money actions audited; never log secrets.

## Analytics

`parent_created`, `child_allocated`, `child_completed`, `parent_settled` — internal only.

## Out of scope

Auto-delegation of sponsorship, captain payout automation, cross-parent fund pools (extension points only), nested-nested children (depth > 1).

## Acceptance criteria

| # | Criterion | Check |
|---|---|---|
| AC-1 | sponsor creates + funds parent; captain selected; children allocated within budget | integration |
| AC-2 | concurrent allocation attempts cannot exceed the parent budget (serialized by row lock + transactional check) | integration (concurrency) |
| AC-3 | dependency gating: BLOCKED children become READY only when dependencies complete where configured | integration |
| AC-4 | captain cannot over-allocate, self-pay arbitrarily, or touch unrelated parents (authz) | integration |
| AC-5 | settlement: completed/failed/remaining math balances; unused reserve refunds per sponsor rules | integration |
| AC-6 | full gates green; /bidception live on bidception.lol | CI + curl |