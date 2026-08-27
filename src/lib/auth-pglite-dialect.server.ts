import type { CompiledQuery } from "kysely";
import {
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  type DatabaseConnection,
  type Dialect,
  type Driver,
  type QueryResult,
  type TransactionSettings,
} from "kysely";
import type { PGlite } from "@electric-sql/pglite";

/**
 * Minimal Kysely dialect for the in-process PGLite instance (local dev / test
 * runtimes only — PGLite never ships in cloud builds, see db.server.ts).
 *
 * It lets Better Auth (which speaks Kysely through its own bundled adapter)
 * share the SAME embedded Postgres instance the app uses, so integration tests
 * exercise one real schema instead of two parallel stores.
 *
 * Concurrency note: PGLite serializes all queries on one connection, so this
 * driver runs BEGIN/COMMIT on the shared instance (the same approach as the
 * community pglite dialects). Safe for the single-user local/test runtime it
 * exists for; production always runs the node-postgres dialect instead.
 */
class PgliteDriver implements Driver {
  readonly #db: Promise<PGlite>;

  constructor(db: Promise<PGlite>) {
    this.#db = db;
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<DatabaseConnection> {
    return {
      executeQuery: async <R>(
        compiledQuery: CompiledQuery,
      ): Promise<QueryResult<R>> => {
        const db = await this.#db;
        const result = await db.query<R>(
          compiledQuery.sql,
          (compiledQuery.parameters ?? []) as unknown[],
        );
        return {
          rows: result.rows as R[],
          ...(result.affectedRows != null
            ? { numAffectedRows: BigInt(result.affectedRows) }
            : {}),
        };
      },
      streamQuery: () => {
        throw new Error("PGLite Kysely dialect does not support streaming");
      },
    };
  }

  async beginTransaction(_connection: DatabaseConnection, _settings: TransactionSettings): Promise<void> {
    const db = await this.#db;
    await db.exec("begin");
  }

  async commitTransaction(_connection: DatabaseConnection): Promise<void> {
    const db = await this.#db;
    await db.exec("commit");
  }

  async rollbackTransaction(_connection: DatabaseConnection): Promise<void> {
    const db = await this.#db;
    await db.exec("rollback");
  }

  async releaseConnection(_connection: DatabaseConnection): Promise<void> {}
  async destroy(): Promise<void> {}
}

/** Build a Kysely Dialect over an existing (or initializing) PGLite instance. */
export function createPgliteDialect(db: Promise<PGlite> | PGlite): Dialect {
  return {
    createAdapter: () => new PostgresAdapter(),
    createDriver: () => new PgliteDriver(Promise.resolve(db)),
    createIntrospector: (db) => new PostgresIntrospector(db),
    createQueryCompiler: () => new PostgresQueryCompiler(),
  };
}