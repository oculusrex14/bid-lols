#!/usr/bin/env node
/**
 * The ONLY database migration applier for real Postgres (node-postgres, `pg`).
 *
 * Decoupled from the build (Phase 00, FR-6/FR-7): `npm run build` is a pure
 * `vite build` with zero DB access. This script is the gated release step, run
 * as:  DATABASE_URL=… node scripts/migrate.mjs [--dry-run]
 *
 * Pending files in ../migrations are applied to DATABASE_URL, each in one
 * transaction and recorded in a `_migrations` ledger, so it runs once and is
 * safe to re-run. `--dry-run` lists what would apply and changes nothing.
 *
 * The read is non-recursive, so the archived auth schema under
 * migrations/auth/ is never applied.
 *
 * No DATABASE_URL -> skip with a message (local PGLite dev/preview applies the
 * same files at startup instead; see src/lib/db.ts).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const DRY_RUN = process.argv.includes("--dry-run");
import { pendingMigrations } from "./migration-plan.mjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log(
    "[migrate] DATABASE_URL not set — skipping (the PGLite fallback migrates itself).",
  );
  process.exit(0);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }
  // An app with no schema of its own must not pay for a database connection.
  if (pendingMigrations(entries, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query("SELECT name FROM _migrations")).rows.map(
      (r) => r.name,
    );

    const pending = pendingMigrations(entries, applied);
    if (DRY_RUN) {
      if (pending.length === 0) console.log("[migrate] dry-run: up to date, nothing to apply.");
      for (const { name } of pending) console.log(`[migrate] dry-run: would apply ${name}`);
      console.log(`[migrate] dry-run done — ${pending.length} pending, nothing applied.`);
      return;
    }

    let count = 0;
    for (const { name } of pending) {
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        // pg's simple-query protocol runs a whole multi-statement file at once.
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  // pg errors carry the context needed to debug a bad SQL file.
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});
