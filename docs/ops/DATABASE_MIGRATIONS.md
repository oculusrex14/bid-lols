# DATABASE_MIGRATIONS.md — Migration Operations

**Status:** Runbook for schema changes. No schema changes yet — this defines how Phase 00 and later migrations are created, verified, and applied.

## Current mechanism (verified)

- **Files:** `migrations/NNNN_name.sql`, applied in filename order. Today: `0002_boards` through `0008_crown` (0001 was the auth opt-in, applied only if present in `migrations/`).
- **Ledger:** `_migrations(name, applied_at)` on each backend; files keyed by **basename**, applied once, never re-run. Bookkeeping shared by both appliers (`scripts/migration-plan.mjs`: `pendingMigrations`/`isMigrationFile`).
- **Prod applier:** `scripts/migrate.mjs` — `pg` pooler against `DATABASE_URL`, each file in one transaction; skips when `DATABASE_URL` is unset.
- **Local applier:** `src/lib/db.ts` PGLite fallback applies the same `migrations/*.sql` glob (non-recursive) at dev startup — the zero-config local loop. Keep the glob + vite bootstrap plugin together or the loop breaks.
- **Known hazard:** `npm run build` ends with `db:migrate`, so a production build mutates prod DDL (this is how `0008_crown.sql` reached prod). See Production strategy below.

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

- **Decouple from build (Phase 00, PRIORITY):** remove `db:migrate` from `npm run build`. The build is pure (no DB connection, no PGLite bundling). Migrations run as a **dedicated, gated release step** — an explicit CI job or manual `DATABASE_URL=… node scripts/migrate.mjs` — ordered before the new build is activated, with the run's output captured.
- Pre-flight: `SELECT name FROM _migrations ORDER BY name` to confirm expected state (today: 0002–0008) before applying.
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
