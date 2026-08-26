# DATABASE_MIGRATIONS.md — Migration Operations

**Status:** Runbook for schema changes. `0009_foundation` is authored and pending the gated prod apply; everything after it follows this runbook.

## Current mechanism (verified)

- **Files:** `migrations/NNNN_name.sql`, applied in filename order. Prod today: `0002_boards` through `0008_crown` applied; `0009_foundation` pending. (`0001` was the auth opt-in under `migrations/auth/`, archived and never applied; the glob is non-recursive.)
- **Ledger:** `_migrations(name, applied_at)` on each backend; files keyed by **basename**, applied once, never re-run. Bookkeeping shared by both appliers (`scripts/migration-plan.mjs`: `pendingMigrations`/`isMigrationFile`/`projectRoot`).
- **Prod applier:** `scripts/migrate.mjs` — `pg` against `DATABASE_URL`, each file in one transaction, ledger insert in the same transaction; `--dry-run` lists pending without applying; skips (with a message) when `DATABASE_URL` is unset.
- **Local applier:** `src/lib/db.server.ts` PGLite (hermetic dev/preview runtimes) applies the same `migrations/*.sql` set at startup — via the Vite glob when bundled, via a disk read in plain Node (the test runner). Keep the glob + the `pgliteBootstrapPlugin` in `vite.config.ts` together or the loop breaks.
- **Build decoupling (Phase 00, done):** `npm run build` is pure `vite build` — no DB connection, no DDL. `db:migrate` is a separate script, run only as the gated release step below.

## Creation workflow

1. Author `migrations/NNNN_snake_case.sql` with the next unused number; the number is permanent — the ledger keys by basename.
2. **Additive DDL by default:** `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, constraint checks where the pattern already does (e.g. `0005_culture`).
3. Money: `integer` minor currency units + explicit `currency char(3)`; timestamps `timestamptz not null default now()`; `text` PKs from `makeId(prefix)`; FKs on new logical relationships (legacy dangling text refs are not a model).
4. No seed/demo data in migrations; legacy tables (`listings`, `orders`, `crown_*`, `activity`, `site_stats`) are read-only from new code.
5. Run locally: `npm run dev` — PGLite self-migrates on boot; exercise the affected path. Also `npm run typecheck` and `npm run test` (migration-plan unit tests).
6. Record the change: bump `docs/02_DATA_MODEL.md`, update `docs/STATE.md`.

## Local verification

- `npm run dev` boot with PGLite: all pending files apply, `_migrations` rows appear, app boots.
- Re-start dev: applied files are skipped exactly once (idempotency via ledger).
- `node --test scripts/**/*.test.mjs` covers the plan/apply bookkeeping.
- For anything touching prod-shaped data, verify against a scratch Postgres with a dumped copy — never against prod.

## Backwards-safe expectations

- New releases must run against an **older** schema during overlap windows: add-only DDL first, code tolerant of the new columns being absent (`IF NOT EXISTS`, coalesce on reads).
- Never `ALTER` a column's semantics or type in place; add a new column, migrate data, then deprecate.
- Data is never rewritten by a routine migration: legacy rows (real paid orders) remain intact and readable.

## Production migration strategy

- **Gated release step (in force since Phase 00):** `DATABASE_URL=… node scripts/migrate.mjs` — first as `--dry-run` (lists pending, applies nothing), then for real, ordered **before** the new build is activated, with the run's output captured as evidence.
- Pre-flight: the `--dry-run` output + `SELECT name FROM _migrations ORDER BY name` to confirm expected state (Phase 00 pre: 0002–0008; post: +0009) before applying.
- Keep the per-file transaction + ledger insert (atomic per file).
- `DATABASE_URL` set-and-valid is a hard deploy precondition; a missing/invalid value fails the step loudly.

## Rollback / forward-fix philosophy

- **Forward-fix, no down-migrations:** a broken or bad migration is repaired by a new migration (or a fixed file with a *new* name — the ledger only keys applied basenames); you do not edit an applied file.
- A failed mid-file file rolls back its own transaction; the ledger row is absent, so re-running is safe once fixed.
- Schema rollback of shipped additive columns is generally deferred to a later cleanup; data preservation beats schema symmetry.

## Before destructive migrations

- Explicit approval + written justification (the Phase 00 safety rule forbids destructive DDL at all).
- Dump/backup the affected tables first; record row counts.
- Verify the ledger state of the target database immediately before running.
- Never silent: destructive DDL gets its own named migration, its own run, and its own audit note.

## Rules

- No manual DDL against prod (no psql ad-hoc changes).
- No migrations triggered by an ordinary build or preview.
- No schema change that depends on application code being deployed simultaneously, unless the code is tolerant of the schema being ahead (additive-first ordering).
