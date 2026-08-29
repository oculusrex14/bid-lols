#!/usr/bin/env node
/**
 * RC4 §39: the trust-event projector CLI. Deterministic, idempotent,
 * rebuildable. Dry-run by default: reports what WOULD change and writes
 * nothing. `--apply` inserts missing events and appends REVERSAL rows for
 * events the authoritative state no longer supports.
 *
 *   node scripts/rebuild-trust-events.mjs            # dry run
 *   node scripts/rebuild-trust-events.mjs --apply
 *
 * An empty backfill is a completely acceptable result: no eligible real
 * history yields zero events, and history is NEVER fabricated.
 */
import { pendingMigrations } from "./migration-plan.mjs";

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.slice(8) ?? 5000);

if (process.env.DATABASE_URL) {
  console.error(
    "[rebuild] this build targets the local/hermetic database by default." +
      " For the production DB, run it with the gated preflight in" +
      " docs/ops/DEPLOYMENT.md (DATABASE_URL is never read from CI).",
  );
  process.exit(2);
}

// Boot the hermetic app DB (PGLite migrates itself to head).
const { getPglite } = await import("../src/lib/db.server.ts");
await getPglite();

// Hermetic guard: refuse to run a projector rebuild against a database that
// is not at head (the schema-ledger boot gate does this for Neon).
const entries = (await import("node:fs/promises")).readdir
  ? await (await import("node:fs/promises")).readdir(new URL("../migrations/", import.meta.url))
  : [];
const { getSql } = await import("../src/lib/db.server.ts");
const sql = await getSql();
const appliedRows = await sql.query("select name from _migrations");
const applied = appliedRows.map((/** @type {{ name: string }} */ r) => r.name);
const missing = pendingMigrations(entries.map((e) => String(e)), applied);
if (missing.length > 0) {
  console.error(`[rebuild] database is missing migrations: ${missing.join(", ")} — refusing.`);
  process.exit(2);
}

const { projectAllUsers } = await import("../src/lib/trust/projector.server.ts");
console.log(`[rebuild] mode: ${APPLY ? "APPLY" : "DRY-RUN"} — inspecting up to ${LIMIT} members…`);
const results = await projectAllUsers(LIMIT);
const totals = results.reduce(
  (acc, r) => ({ created: acc.created + r.created, reversed: acc.reversed + r.reversed, valid: acc.valid + r.valid }),
  { created: 0, reversed: 0, valid: 0 },
);
for (const r of results) {
  if (r.created || r.reversed) {
    console.log(
      `[rebuild] ${r.userId}: created=${r.created} reversed=${r.reversed} valid=${r.valid}${r.apply ? "" : " (dry)"}`,
    );
  }
}
const postCount = Number((await sql.query("select count(*)::int as n from trust_events"))[0]?.n ?? 0);
console.log(
  `[rebuild] ${APPLY ? "applied" : "dry-run"}: members=${results.length} would-create=${totals.created} would-reverse=${totals.reversed} valid=${totals.valid}`,
);
console.log(`[rebuild] trust_events rows now: ${postCount}${APPLY ? "" : " (unchanged in dry-run)"}`);
