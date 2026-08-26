import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveDbConfig } from "@/lib/db.server";

test("Vercel production with a valid DATABASE_URL selects Neon (trimmed)", () => {
  const cfg = resolveDbConfig({
    VERCEL_ENV: "production",
    DATABASE_URL: "postgres://u:p@host/db ",
  });
  assert.equal(cfg.source, "neon");
  assert.equal(cfg.databaseUrl, "postgres://u:p@host/db");
});

test("Vercel production without DATABASE_URL fails loudly (never silently in-memory)", () => {
  assert.throws(
    () => resolveDbConfig({ VERCEL_ENV: "production" }),
    /DATABASE_URL is required in production/,
  );
  assert.throws(
    () => resolveDbConfig({ VERCEL_ENV: "production", DATABASE_URL: "  " }),
    /DATABASE_URL is required in production/,
  );
});

test("local runtimes are hermetic: PGLite even when a DATABASE_URL is present", () => {
  // .env.local holds production credentials on dev machines; Vite surfaces
  // them to the dev SSR process. Dev must NOT connect to them by accident.
  assert.equal(resolveDbConfig({ DATABASE_URL: "postgres://prod" }).source, "pglite");
  assert.equal(resolveDbConfig({}).source, "pglite");
  assert.equal(resolveDbConfig({ VERCEL: "1" }).source, "pglite");
});

test("Vercel preview trusts a project-scoped DATABASE_URL, else PGLite", () => {
  assert.equal(
    resolveDbConfig({ VERCEL_ENV: "preview", DATABASE_URL: "postgres://x" }).source,
    "neon",
  );
  assert.equal(resolveDbConfig({ VERCEL_ENV: "preview" }).source, "pglite");
  assert.equal(
    resolveDbConfig({ VERCEL_ENV: "preview", DATABASE_URL: "  " }).source,
    "pglite",
  );
});

test("an empty or whitespace DATABASE_URL counts as unset", () => {
  assert.equal(resolveDbConfig({ DATABASE_URL: "" }).source, "pglite");
  assert.equal(resolveDbConfig({ DATABASE_URL: "   " }).source, "pglite");
  assert.equal(
    resolveDbConfig({ USE_REAL_DB: "1", DATABASE_URL: "   " }).source,
    "pglite",
  );
});

test("USE_REAL_DB=1 explicitly opts a local runtime into the real database", () => {
  const cfg = resolveDbConfig({ USE_REAL_DB: "1", DATABASE_URL: "postgres://u:p@h/db" });
  assert.equal(cfg.source, "neon");
  assert.equal(cfg.databaseUrl, "postgres://u:p@h/db");
});
