/**
 * Boot-time schema gate for real Postgres runtimes (Vercel production and
 * previews that carry a DATABASE_URL; local USE_REAL_DB=1 smoke runs).
 *
 * The PGLite path never needs it: it migrates to head on startup by
 * construction. A Neon runtime instead must PROVE the database's `_migrations`
 * ledger contains every migration the deployed code requires — or fail
 * loudly at first use with an operator message.
 *
 * Why this exists: RC3 shipped a browse query that selects `bounties.creative`,
 * added by migration 0017 — which had never been applied to production. The
 * app booted fine and the drift surfaced two marketplace surfaces later as a
 * route-level `column b.creative does not exist` 500. Schema drift must break
 * at deploy/first-request time, not at an arbitrary route.
 */

/**
 * Every file in `migrations/*.sql`, in apply order (basename = ledger key).
 * Keep in sync when adding a migration file:
 * `src/lib/schema-ledger.test.ts` asserts this list matches the directory,
 * so a forgotten entry fails CI, not production.
 */
export const REQUIRED_MIGRATIONS: readonly string[] = [
  "0002_boards.sql",
  "0003_hype.sql",
  "0004_socials.sql",
  "0005_culture.sql",
  "0006_wipe_seed.sql",
  "0007_hype_factor.sql",
  "0008_crown.sql",
  "0009_foundation.sql",
  "0010_waitlist.sql",
  "0011_waitlist_normalize.sql",
  "0012_auth_marketplace_identity.sql",
  "0013_marketplace_core.sql",
  "0014_money_trust.sql",
  "0015_graveyard.sql",
  "0016_bidception.sql",
  "0017_bidception_child_link.sql",
  "0018_trust_bid_index.sql",
];

/** Names in REQUIRED_MIGRATIONS absent from `applied`, in apply order. */
export function missingMigrations(applied: readonly string[]): string[] {
  const have = new Set(applied);
  return REQUIRED_MIGRATIONS.filter((name) => !have.has(name));
}

/** The SQL surface the gate needs (satisfied by the shared `Sql` client). */
export interface LedgerQuery {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
}

/**
 * Assert the database ledger is at least as new as the deployed code.
 * Resolves when current; rejects with an actionable error otherwise
 * (missing files named, or ledger unreadable).
 */
export async function assertSchemaCurrent(sql: LedgerQuery): Promise<void> {
  let rows: Array<{ name: string }>;
  try {
    rows = await sql.query<{ name: string }>("select name from _migrations");
  } catch (err) {
    throw new Error(
      "schema ledger unreadable (_migrations table missing or DB unreachable): " +
        `${String((err as Error).message)} — run scripts/migrate.mjs before ` +
        "activating this build (docs/ops/DATABASE_MIGRATIONS.md).",
    );
  }
  const missing = missingMigrations(rows.map((r) => r.name));
  if (missing.length > 0) {
    throw new Error(
      `database schema is behind: _migrations missing [${missing.join(", ")}]. ` +
        "Apply the pending migrations (scripts/migrate.mjs, the gated step in " +
        "docs/ops/DEPLOYMENT.md) before activating this build.",
    );
  }
}
