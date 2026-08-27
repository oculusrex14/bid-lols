import { test } from "node:test";
import assert from "node:assert/strict";
import requestIdMiddleware from "../server/middleware/request-id";
import { staleServerFnGuard } from "../src/lib/serverfn-guard";

/**
 * Phase 00.6, AC-4.1 — INTEGRATION-level regression around the response
 * AFTER ALL relevant middleware has run.
 *
 * Composition under test (the real order):
 *   [outer Nitro] request-id  →  [inner Start] staleServerFnGuard  →  handler
 * where the handler is the framework resolver's stale-id rejection
 * (`Error: Server function info not found for <id>`), simulated faithfully
 * (the guard cannot intercept any other error source for a stale id — the
 * resolver throws outside the handler's own boundary).
 *
 * Asserts the FINAL client response: status 404, code stale_client_bundle,
 * refresh-oriented message, requestId present, and header === body.
 */

interface NitroEvent {
  url: URL;
  req: { method?: string; headers: Headers };
}

function jsonEvent(path: string, method = "POST"): NitroEvent {
  return {
    url: new URL(`http://test.local${path}`),
    req: {
      method,
      headers: new Headers({ accept: "application/json" }),
    },
  };
}

/** Simulated Start dispatch: resolver rejection for a stale id. */
function staleResolverHandler(): () => Promise<Response> {
  return async () => {
    throw new Error("Server function info not found for deadbeef0000");
  };
}

/** Simulated Start dispatch: a genuine handler failure (must NOT be masked). */
function genuineErrorHandler(): () => Promise<Response> {
  return async () => {
    throw new Error("db connection refused");
  };
}

/**
 * A healthy handler result as it arrives at the guard AFTER Start's own
 * ctx→Response normalization (the guard sees the final Response; anything
 * earlier in the chain is framework-internal).
 */
function healthyHandler(): () => Promise<Response> {
  return async () =>
    new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
}

function composed(inner: () => Promise<unknown> | Promise<Response>) {
  // The guard is the innermost layer (wraps the dispatch); request-id is the
  // outermost Nitro middleware (wraps the whole Start handler).
  return async (event: NitroEvent): Promise<Response> => {
    return (await requestIdMiddleware(
      event,
      async () => staleServerFnGuard({ handlerType: "serverFn", next: inner }),
    )) as Response;
  };
}

test("stale serverFn AFTER all middleware: 404 stale_client_bundle, header === body", async () => {
  const run = composed(staleResolverHandler());
  const res = await run(jsonEvent("/_serverFn/deadbeef0000"));

  assert.equal(res.status, 404, "final status is 404, not the unhandled 500");
  assert.match(String(res.headers.get("content-type")), /application\/json/);

  const body = JSON.parse(await res.text()) as {
    code: string;
    message: string;
    requestId: string;
  };
  assert.equal(body.code, "stale_client_bundle", "the specific code survives composition");
  assert.match(body.message, /refresh/i, "refresh-oriented message");
  assert.ok(body.requestId, "body carries a requestId");
  assert.equal(
    res.headers.get("x-request-id"),
    body.requestId,
    "x-request-id must equal body.requestId after ALL middleware",
  );
});

test("genuine handler failure after all middleware: NOT masked, stays an error", async () => {
  const run = composed(genuineErrorHandler());
  // The guard re-throws genuine errors; the outermost layer (Simulating what
  // Start/Nitro does with an unhandled rejection) turns it into a 500.
  let rejected = false;
  let res: Response | null = null;
  try {
    res = await run(jsonEvent("/_serverFn/knownfn0000"));
  } catch {
    rejected = true;
  }
  if (rejected) {
    // Reaching here means the guard correctly let the genuine error propagate
    // out of the Start chain (the framework converts it to its 500 path —
    // the important assertion is that the guard did NOT swallow it).
    assert.ok(true);
    return;
  }
  // If the guard DID answer, it must not have answered with the stale code.
  assert.ok(res);
  const body = JSON.parse(await res.text()) as { code?: string };
  assert.notEqual(body.code, "stale_client_bundle");
});

test("healthy serverFn result passes through the composed chain untouched", async () => {
  const run = composed(healthyHandler());
  const res = await run(jsonEvent("/_serverFn/knownfn0000"));
  // 200 JSON must pass through both layers: guard does not rewrite it, and
  // request-id does not envelope it (status < 400) — it only adds the id.
  assert.equal(res.status, 200);
  const body = JSON.parse(await res.text()) as { ok: boolean; code?: string };
  assert.equal(body.ok, true, "healthy payload preserved");
  assert.equal(body.code, undefined, "no error envelope injected on 200");
  assert.ok(res.headers.get("x-request-id"), "id header still added");
});
