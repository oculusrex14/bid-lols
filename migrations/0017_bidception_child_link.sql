-- RC1 (R6): Bidception child work is linked to REAL marketplace engines.
-- STRICTLY ADDITIVE.
--
-- A child unit gets a kind (BOUNTY | PROJECT) and, once materialized, a link
-- to the actual bounties/projects row. The underlying engine stays
-- authoritative for applications/participants/proposals/submissions/
-- milestones/judging/disputes/reviews. Bidception only owns the budget, the
-- child state, and the parent invariant.
--
-- Fee rule: the platform fee is charged ONCE at the parent funding. Child
-- bounties open directly (funded by parent allocation); child projects go
-- ACTIVE on selection (quote capped at the allocation) without a second
-- sponsor charge.

alter table child_works add column if not exists kind text
  check (kind is null or kind in ('BOUNTY','PROJECT'));

alter table bounties add column if not exists parent_work_id text
  references parent_works(id) on delete set null;
create index if not exists bounties_parent_idx on bounties (parent_work_id);

alter table projects add column if not exists parent_work_id text
  references parent_works(id) on delete set null;
create index if not exists projects_parent_idx on projects (parent_work_id);

-- RC1 (R7): structured creative-brief fields for CultureBid (product-scoped
-- semantics live in a jsonb payload, not scattered columns).
alter table bounties add column if not exists creative jsonb;