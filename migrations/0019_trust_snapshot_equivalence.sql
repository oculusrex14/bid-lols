-- RC4.1 (RC5 §5.1/§5.8): trust snapshot cold/warm equivalence + database
-- enforced append-only. STRICTLY ADDITIVE: no existing table is rewritten,
-- no column is dropped or re-typed, no shipped migration is mutated.
--
-- 1) trust_score_snapshots.span_days
--    A valid snapshot must reconstruct the COMPLETE RoleScoreResult
--    (RC5 §5.1). Every persisted field is now readable back: bRaw is
--    deterministically reconstructed from the stored pillars through the
--    model-versioned roleBase() (proven by test), uncappedScore is derived
--    through the model-versioned roleScore() when a cap was applied, and
--    span_days is the one fact that exists nowhere else: the evidence-span
--    factor of the confidence formula. Stored as integer days (0 when the
--    role had fewer than two counted outcomes), exactly what scoreRole()
--    computes.

alter table trust_score_snapshots add column if not exists span_days
  integer not null default 0 check (span_days >= 0);

-- 2) trust_events append-only, database-enforced (RC5 §5.8)
--    PostgreSQL and PGLite both ship PL/pgSQL + row triggers, so the rule
--    holds on every runtime the app boots. Corrections remain new REVERSAL
--    rows pointing at the value they undo; the UNIQUE key
--    (source_type, source_id, user_id, role, event_kind) still makes
--    projection idempotent. The application layer ALSO never carries an
--    UPDATE/DELETE path (projector inserts only); this trigger is the
--    second, database-level enforcement documented in
--    docs/BID_INDEX_METHODOLOGY.md.
--
--    A BEFORE row trigger raising an exception aborts the statement before
--    any row is touched, so a partial batch cannot half-apply. Test and
--    rebuild tooling that must exercise the reproducibility invariant
--    ("delete every trust event and the score still reproduces", RC4 §41)
--    disables the trigger explicitly for that single check: the escape hatch
--    is visible in the diff and is never available to application code.

create or replace function trust_events_reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'trust_events is append-only: corrections are REVERSAL events, not UPDATE/DELETE';
end;
$$;

drop trigger if exists trust_events_append_only on trust_events;
create trigger trust_events_append_only
  before update or delete on trust_events
  for each row
  execute function trust_events_reject_mutation();
