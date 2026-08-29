import { pendingMigrations } from "../../scripts/migration-plan.mjs";
import { assertSchemaCurrent } from "./schema-ledger";

/** Which database backend is active. */
export type DbSource = "neon" | "pglite";

export interface DbConfig {
  source: DbSource;
  databaseUrl?: string;
}

/**
 * Pure, testable backend resolution:
 *  - Vercel **production**: `DATABASE_URL` is REQUIRED; missing/blank -> THROW.
 *    A deployed production runtime must never silently run an in-memory DB.
 *  - Vercel **preview**: uses `DATABASE_URL` when the project scoped it there
 *    (deliberate platform configuration); otherwise hermetic PGLite.
 *  - Local runtimes (dev / `vite preview`): hermetic **PGLite** — even when a
 *    `DATABASE_URL` is present, because `.env.local` holds production
 *    credentials and Vite surfaces them to the dev SSR process. This keeps
 *    local work from mutating real data. Opt into a real database explicitly
 *    with `USE_REAL_DB=1` + `DATABASE_URL` (documented in ops/ENVIRONMENT.md).
 *
 * An empty/whitespace `DATABASE_URL` (an easy misconfig in deploy UIs) counts
 * as unset.
 */
export function resolveDbConfig(env: Record<string, string | undefined>): DbConfig {
  const trimmed = (env.DATABASE_URL ?? "").trim();
  if (env.VERCEL_ENV === "production") {
    if (!trimmed) {
      throw new Error(
        "DATABASE_URL is required in production but is missing or blank. " +
          "Set a valid Postgres connection string on the Vercel project before deploying.",
      );
    }
    return { source: "neon", databaseUrl: trimmed };
  }
  if (env.VERCEL_ENV === "preview" && trimmed) {
    return { source: "neon", databaseUrl: trimmed };
  }
  if (trimmed && env.USE_REAL_DB === "1") {
    return { source: "neon", databaseUrl: trimmed };
  }
  return { source: "pglite" };
}

/**
 * Build-time platform flag (vite `define`, Phase 00.5, AC-9.1): true when
 * this bundle was built on Vercel. In cloud builds the PGLite fallback is
 * dead-code-eliminated entirely, so a cloud runtime that somehow resolved to
 * "pglite" must fail LOUDLY below (AC-9.2) instead of crashing later with an
 * opaque missing-module error.
 *
 * `__VERCEL_BUILD__` is a bare identifier defined in vite.config.ts. It must
 * be read through `typeof` first: under plain Node/tsx (tests) the
 * identifier is undeclared, which yields "undefined" → false, without
 * throwing (local semantics unchanged).
 */
const VERCEL_BUILD: boolean =
  typeof __VERCEL_BUILD__ !== "undefined" && __VERCEL_BUILD__;

// Server-only module: resolved once, from the real process env.
const dbConfig = resolveDbConfig(process.env);

if (VERCEL_BUILD && dbConfig.source === "pglite") {
  throw new Error(
    "Cloud build without a resolvable DATABASE_URL: PGLite is not shipped in " +
      "Vercel builds. Set DATABASE_URL for this environment — production always " +
      "requires it, and previews do now that the PGLite fallback is excluded " +
      "from cloud artifacts.",
  );
}

/** Active backend. */
export const dbSource: DbSource = dbConfig.source;
const databaseUrl: string | undefined = dbConfig.databaseUrl;

/**
 * Minimal shared SQL surface, satisfied by both Neon and PGLite. Both the
 * tagged-template and `.query()` forms resolve to an array of row objects:
 *
 *   const sql = await getSql();
 *   const rows = await sql`select * from todos where id = ${id}`; // parameterized
 *   const rows2 = await sql.query("select * from todos where id = $1", [id]);
 *
 * Money-path code must wrap claim + effects in `sql.transaction(...)`: one
 * database transaction, so a crash can never leave a claimed order with
 * partially applied effects.
 */
export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
}

/**
 * Init state lives on globalThis as promises: dev HMR creates new instances of
 * this module, and two instances racing module-level state would open a second
 * pool or run two concurrent PGLite migration passes (whose duplicate
 * `_migrations` insert rejects — and would get memoized, poisoning every later
 * `getSql()`). A failed init clears its slot so the next call retries.
 */
const globalRef = globalThis as typeof globalThis & {
  __pgSqlPromise__?: Promise<Sql>;
  __pgliteInstance__?: Promise<import("@electric-sql/pglite").PGlite>;
  __pgliteMigrateChain__?: Promise<void>;
};

/**
 * Result-type parity: Postgres sends every value as text plus a type OID — the
 * JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
 * int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
 * JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
 * production return identical, JSON-safe shapes:
 *   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
 *                                   `::text` if you ever need huge integers)
 *   date                         -> 'YYYY-MM-DD' string
 *   interval                     -> Postgres interval text
 * numeric already comes back as a string on both (arbitrary precision).
 */
const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    // Rebuild with $1, $2, … placeholders so values stay parameterized.
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

function createNeonSql(): Promise<Sql> {
  globalRef.__pgSqlPromise__ ??= (async () => {
    // Regular Postgres driver: node-postgres (`pg`) — works directly with Neon's
    // pooled endpoint. One pool per process; warm serverless instances reuse it.
    const { Pool, types } = await import("pg");
    types.setTypeParser(OID_INT8, Number);
    types.setTypeParser(OID_DATE, identity);
    types.setTypeParser(OID_INTERVAL, identity);
    const pool = new Pool({ connectionString: databaseUrl });
    const sql = toSql(async <T>(text: string, params: unknown[]) => {
      const res = await pool.query(text, params);
      return res.rows as T[];
    });
    // Transactions must pin ONE connection for their whole lifetime — a pool
    // query could hop connections between BEGIN and COMMIT.
    sql.transaction = async <R>(fn: (tx: Sql) => Promise<R>): Promise<R> => {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const txSql = toSql(async <T>(text: string, params: unknown[]) => {
          const res = await client.query(text, params);
          return res.rows as T[];
        });
        const result = await fn(txSql);
        await client.query("commit");
        return result;
      } catch (err) {
        try {
          await client.query("rollback");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      } finally {
        client.release();
      }
    };
    // Boot gate: on a real Postgres the deployed code must run only against a
    // schema at least as new as REQUIRED_MIGRATIONS, or fail loudly here with
    // an operator message. PGLite self-migrates to head and never needs it.
    // (Runbook: scripts/migrate.mjs is the gated pre-deploy step — a pending
    // migration must never be absorbed as a route-level 500.)
    await assertSchemaCurrent(sql);
    return sql;
  })().catch((err) => {
    globalRef.__pgSqlPromise__ = undefined;
    throw err;
  });
  return globalRef.__pgSqlPromise__;
}

async function createPgliteSql(): Promise<Sql> {
  // Embedded Postgres, imported on demand so it never loads on the Neon path.
  // One in-memory instance per process, shared across HMR module instances, so
  // data survives source edits (it resets on dev-server restart).
  globalRef.__pgliteInstance__ ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite({
      parsers: {
        [OID_INT8]: Number,
        [OID_DATE]: identity,
        [OID_INTERVAL]: identity,
      },
    });
    await pg.waitReady;
    await pg.exec(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    return pg;
  })().catch((err) => {
    globalRef.__pgliteInstance__ = undefined;
    throw err;
  });
  const pg = await globalRef.__pgliteInstance__;

  // Apply migrations/ (the single schema source) so preview matches production.
  // SQL is inlined by the bundler via import.meta.glob (no runtime fs); applied
  // files are tracked in _migrations. The glob does not descend, so the opt-in
  // auth schema under migrations/auth/ stays out. Runs once per module instance
  // — so an HMR reload after adding a migration file applies it live — with
  // passes serialized on a global chain so concurrent callers never
  // double-apply.
  const readMigrationFiles =
    async (): Promise<Array<{ name: string; text: string }>> => {
      try {
        // Full-name call: Vite statically replaces import.meta.glob at
        // transform time (dev + build). In plain Node (the test runner)
        // import.meta has no `glob`, so the call throws and falls through.
        const migrations = import.meta.glob("/migrations/*.sql", {
          query: "?raw",
          import: "default",
          eager: true,
        }) as Record<string, string>;
        return Object.entries(migrations).map(([path, text]) => ({
          name: path.split("/").pop() ?? path,
          text,
        }));
      } catch {
        // Plain Node (the test runner): read from disk instead.
        return readMigrationsFromDisk();
      }
    };

  // Plain Node (the test runner): read migrations/ from disk.
  async function readMigrationsFromDisk() {
      const { readdir, readFile } = await import("node:fs/promises");
      const { dirname, join } = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const dir = join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "migrations",
      );
      const entries = await readdir(dir).catch(() => [] as string[]);
      const names = pendingMigrations(entries, []).map((m) => m.name);
      const files: Array<{ name: string; text: string }> = [];
      for (const name of names) {
        files.push({ name, text: await readFile(join(dir, name), "utf8") });
      }
      return files;
  }
  const migrate = async (): Promise<void> => {
    const files = await readMigrationFiles();
    const doneRows = await pg.query<{ name: string }>(
      "select name from _migrations",
    );
    const done = doneRows.rows.map((r) => r.name);
    for (const { name, path } of pendingMigrations(files.map((f) => f.name), done)) {
      // Apply + record atomically (parity with scripts/migrate.mjs) so a failed
      // statement can't leave a file half-applied but untracked.
      const text = files.find((f) => f.name === path)?.text;
      if (text == null) continue;
      await pg.transaction(async (tx) => {
        await tx.exec(text);
        await tx.query("insert into _migrations (name) values ($1)", [name]);
      });
    }
  };
  const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve())
    .catch(() => undefined) // an earlier failed pass must not wedge the chain
    .then(migrate);
  globalRef.__pgliteMigrateChain__ = pass;
  await pass;

  const sql = toSql(async <T>(text: string, params: unknown[]) => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  });
  sql.transaction = async <R>(fn: (tx: Sql) => Promise<R>): Promise<R> => {
    return pg.transaction(async (tx) => {
      const txSql = toSql(async <T>(text: string, params: unknown[]) => {
        const result = await tx.query<T>(text, params);
        return result.rows;
      });
      return fn(txSql);
    });
  };
  return sql;
}

let sqlPromise: Promise<Sql> | null = null;

async function createSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler " +
        "or a server route loader, never from client code.",
    );
  }
  if (VERCEL_BUILD) {
    // Cloud builds ship neon only: PGLite is eliminated from the artifact
    // (AC-9.1), so this branch must never reach the local fallback.
    // resolveDbConfig guarantees a URL here (or threw at module load, AC-9.2).
    return createNeonSql();
  }
  return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}

/**
 * Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
 * otherwise the local PGLite fallback (dev/preview only — production fails
 * loudly instead, see `resolveDbConfig`). Memoized — safe to call per request.
 *
 * Schema comes from `migrations/*.sql`, auto-applied before the first query on
 * the PGLite path; the Neon path is migrated by `npm run db:migrate` (gated).
 */
export function getSql(): Promise<Sql> {
  sqlPromise ??= createSql().catch((err) => {
    sqlPromise = null; // don't memoize failures — let the next call retry
    throw err;
  });
  return sqlPromise;
}

/**
 * The shared PGLite instance (dev/preview only), with `migrations/*.sql`
 * applied. Throws when `DATABASE_URL` is set (that path uses Neon).
 */
export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  if (VERCEL_BUILD) {
    throw new Error("PGLite is excluded from cloud builds (Phase 00.5, AC-9.1)");
  }
  if (dbSource !== "pglite") {
    throw new Error("getPglite() is only available on the PGLite fallback (no DATABASE_URL)");
  }
  await getSql();
  const pg = await globalRef.__pgliteInstance__;
  if (!pg) throw new Error("PGLite instance failed to initialize");
  return pg;
}

/**
 * Finish DB bootstrap before the server handles traffic.
 *
 * - **PGLite** (dev/preview, no `DATABASE_URL`): open the in-memory DB and
 *   apply `migrations/*.sql`. Idempotent — concurrent callers share one promise.
 * - **Neon**: no-op (pool is created lazily on first query).
 *
 * Vite `configureServer` awaits this at dev startup; preview imports of this
 * module kick it off immediately (see bottom of file).
 */
export function ensureDbReady(): Promise<void> {
  if (dbSource !== "pglite") return Promise.resolve();
  return getSql().then(() => undefined);
}

// Server-only eager start: kick PGLite bootstrap as soon as this module loads in
// Node. Client bundles never hit this path (`getSql` throws in the browser).
const globalBoot = globalThis as typeof globalThis & {
  __pgBootstrapPromise__?: Promise<void>;
};
if (typeof window === "undefined" && dbSource === "pglite") {
  globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
    globalBoot.__pgBootstrapPromise__ = undefined;
    console.error("[db] PGLite bootstrap failed:", err);
    throw err;
  });
}
