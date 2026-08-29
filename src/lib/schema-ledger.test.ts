import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  REQUIRED_MIGRATIONS,
  missingMigrations,
  assertSchemaCurrent,
  type LedgerQuery,
} from "@/lib/schema-ledger";

function ledgerSql(names: string[]): LedgerQuery {
  return {
    query: async <T>(_text: string): Promise<T[]> =>
      names.map((name) => ({ name })) as T[],
  };
}

test("missingMigrations: full ledger -> none missing", () => {
  assert.deepEqual(missingMigrations([...REQUIRED_MIGRATIONS]), []);
});

test("missingMigrations: names the gaps in apply order, ignores extras", () => {
  const missing = missingMigrations([
    "0002_boards.sql",
    "0017_bidception_child_link.sql",
    "9999_future.sql", // applied-but-unknown entries are tolerated
  ]);
  assert.deepEqual(missing.slice(0, 3), [
    "0003_hype.sql",
    "0004_socials.sql",
    "0005_culture.sql",
  ]);
  assert.ok(missing.includes("0016_bidception.sql"));
});

test("REQUIRED_MIGRATIONS matches the migrations/ directory exactly (no drift)", async () => {
  const dir = fileURLToPath(new URL("../../migrations/", import.meta.url));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  assert.deepEqual([...REQUIRED_MIGRATIONS], files);
});

test("assertSchemaCurrent: resolves on a current ledger", async () => {
  await assertSchemaCurrent(ledgerSql([...REQUIRED_MIGRATIONS]));
});

test("assertSchemaCurrent: rejects naming the missing migration(s)", async () => {
  await assert.rejects(
    () => assertSchemaCurrent(ledgerSql(["0002_boards.sql"])),
    /database schema is behind: _migrations missing \[0003_hype\.sql, .*0018_trust_bid_index\.sql\]/,
  );
});

test("assertSchemaCurrent: an unreadable ledger fails loudly, not silently", async () => {
  const broken: LedgerQuery = {
    query: async () => {
      throw new Error('relation "_migrations" does not exist');
    },
  };
  await assert.rejects(
    () => assertSchemaCurrent(broken),
    /schema ledger unreadable.*_migrations table missing or DB unreachable/,
  );
});
