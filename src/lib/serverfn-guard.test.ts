import { test } from "node:test";
import assert from "node:assert/strict";
import { isStaleServerFnError, staleServerFnResponse } from "@/lib/serverfn-guard";

/**
 * Phase 00.5 WS7 regression (AC-7.1..7.3): the guard must classify ONLY the
 * framework resolver's stale-id rejection as stale, and must emit a
 * machine-readable 404 — never mask a genuine handler error.
 */

test("stale-id rejections are recognised, verbatim message from the framework", () => {
  assert.equal(isStaleServerFnError(new Error("Server function info not found for abc123")), true);
  assert.equal(isStaleServerFnError(new Error("Server function info not found for " + "x".repeat(40))), true);
});

test("genuine handler errors are NOT classified as stale (AC-7.2)", () => {
  assert.equal(isStaleServerFnError(new Error("Server function module not resolved for abc")), false);
  assert.equal(isStaleServerFnError(new Error("DB connection refused")), false);
  assert.equal(isStaleServerFnError(new Error("Server function info not found")), false);
  assert.equal(isStaleServerFnError({ message: "Server function info not found for x" }), false);
  assert.equal(isStaleServerFnError("Server function info not found for x"), false);
  assert.equal(isStaleServerFnError(undefined), false);
  assert.equal(isStaleServerFnError(null), false);
});

test("stale response is a 404 with code, refresh hint, and a self-consistent id (AC-4.1)", async () => {
  const res = staleServerFnResponse();
  assert.equal(res.status, 404);
  assert.match(String(res.headers.get("content-type")), /application\/json/);
  const body = JSON.parse(await res.text()) as { code: string; message: string; requestId: string };
  assert.equal(body.code, "stale_client_bundle");
  assert.match(body.message, /refresh/i);
  assert.ok(body.requestId, "body carries its own requestId");
  assert.equal(
    res.headers.get("x-request-id"),
    body.requestId,
    "x-request-id must equal body.requestId so the outer request-id layer keeps both",
  );
});

test("the guard body converts a stale rejection, passes genuine errors, leaves router requests alone", async () => {
  const { staleServerFnGuard } = await import("@/lib/serverfn-guard");

  // stale rejection -> 404 stale envelope (R pinned to Response: the
  // throwing next() would otherwise infer never)
  const stale = (await staleServerFnGuard<Response>({
    handlerType: "serverFn",
    next: async () => {
      throw new Error("Server function info not found for deadbeef");
    },
  })) as Response;
  assert.equal(stale.status, 404);
  assert.match(await stale.text(), /stale_client_bundle/);

  // genuine rejection -> propagates (must NOT be answered as stale)
  await assert.rejects(
    () =>
      staleServerFnGuard({
        handlerType: "serverFn",
        next: async () => {
          throw new Error("boom: real handler failure");
        },
      }),
    /boom: real handler failure/,
  );

  // router request -> untouched pass-through (same value returned, no await)
  const ctx = { response: "ok" };
  const out = staleServerFnGuard({ handlerType: "router", next: () => ctx });
  assert.equal(out, ctx);
});
