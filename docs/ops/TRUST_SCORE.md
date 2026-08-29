# Trust Score Operations Runbook (RC4)

Operational owner: bidthrone trust layer. Scope: the Bid Index (BI-1.0),
trust_events, snapshots, appeals, risk flags, verification scaffolding.

## Where things live

| Piece | Path |
| --- | --- |
| Published methodology | `docs/BID_INDEX_METHODOLOGY.md` (mirrored on /bid-index) |
| Pure model | `src/lib/trust/model-v1.ts` (BI-1.0, frozen) |
| Role pipeline | `src/lib/trust/score-core.ts` |
| Evidence loader | `src/lib/trust/evidence.server.ts` |
| Projector | `src/lib/trust/projector.server.ts` + `scripts/rebuild-trust-events.mjs` |
| Snapshot service | `src/lib/trust/score.server.ts` |
| Migration | `migrations/0018_trust_bid_index.sql` |

## Routine operations

- **Rebuild trust events (audit layer):**
  `npx tsx scripts/rebuild-trust-events.mjs` (dry-run first), then `--apply`.
  Idempotent: reruns produce zero new events when state is unchanged.
- **Snapshot freshness:** scores recompute automatically on read when the
  input fingerprint changes (new outcome, revealed review, final
  adjudication, reversal, model version). No snapshot writes by hand.
- **Leaderboards:** score boards read snapshots, then re-verify each row
  through the full pipeline (bounded by the small limit) — public rankings
  are never stale.
- **Profile NR state:** expected and correct while a role has fewer than 2
  primary outcomes or fewer than 2 unrelated counterparties.

## Adjudication (admin)

Disputes must be finalized with the structured fields: `resolution_code`,
`responsibility`, `severity_code` (selects on the admin dispute card). The
RESOLVED transition stamps `finalized_at`, writes an audit row, and
best-effort refreshes the members' trust events. OPEN/UNDER_REVIEW never
affect scores.

## Guards (do not violate)

- No admin can set a score, weight, or severity directly; corrections go
  through REVERSAL trust events, then rebuild.
- `trust_events` is append-only; never UPDATE/DELETE (except by an audited
  correction service; manual DELETE is a postmortem-level violation).
- SUSPECTED trust_risk_flags never lower a score by themselves.
- TRUST_VERIFICATION_LIVE stays 0; there is no checkout; verification
  payment would earn zero Bid Index effect even when introduced.
- Client input can never author score/weight/severity/outcome values: the
  projector reads only server-owned marketplace state.

## Verification infra (built, DISABLED)

`verification_cases` / `verification_events` exist with scopes
( PERSONAL/BUSINESS), check types, and status flows, ready for a future
verified-provider release behind `TRUST_VERIFICATION_LIVE=0`. No raw
identity documents are ever stored: provider references and results only.
