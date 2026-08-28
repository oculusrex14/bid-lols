import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { Route } from "../src/routes/api/webhooks/cashfree";

/**
 * Phase 00.6, WS4-C: every JSON response from the Cashfree webhook that
 * carries a requestId must carry the SAME value in x-request-id. Regression
 * covers the fixed "ignored / non-paid" 200 path (which used to omit the
 * header) and keeps the fail-closed 401 path pinned.
 *
 * The route handler is exercised directly (no HTTP server): the route module
 * is imported under tsx, and only code paths that do NOT touch the DB are
 * driven (ignored path, invalid-signature path) — settlement stays covered
 * by the dedicated PGLite tests.
 */

const SECRET = "webhook-secret-phase-006-test";
process.env.CASHFREE_WEBHOOK_SECRET = SECRET;

type Handler = (opts: { request: Request }) => Promise<Response>;

// The route config (incl. server handlers) lives on `Route.options` in this
// router version — `Route.server` is not a public surface.
const handler = (
  Route as unknown as { options: { server: { handlers: { POST: Handler } } } }
).options.server.handlers.POST;

function signedRequest(rawBody: string, timestamp: string, signature: string): Request {
  return new Request("http://test.local/api/webhooks/cashfree", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": signature,
      "x-webhook-timestamp": timestamp,
    },
    body: rawBody,
  });
}

function sign(rawBody: string, timestamp: string): string {
  return createHmac("sha256", SECRET).update(timestamp + rawBody).digest("base64");
}

test("ignored (non-paid) event: 200 with body.requestId === x-request-id (WS4-C)", async () => {
  const body = JSON.stringify({
    type: "PAYMENT_INITIATED",
    data: { payment: { payment_status: "INITIATED" } },
  });
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await handler({ request: signedRequest(body, ts, sign(body, ts)) });
  assert.equal(res.status, 200, "non-paid events are acknowledged, not errored");
  const json = JSON.parse(await res.text()) as { ok: boolean; ignored: string; requestId: string };
  assert.equal(json.ok, true);
  assert.equal(json.ignored, "PAYMENT_INITIATED");
  assert.ok(json.requestId, "body carries a requestId");
  assert.equal(
    res.headers.get("x-request-id"),
    json.requestId,
    "x-request-id must equal body.requestId (the audited defect)",
  );
});

test("ignored path with missing event type still id-matches (WS4-C)", async () => {
  const body = JSON.stringify({ data: { payment: { payment_status: "PENDING" } } });
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await handler({ request: signedRequest(body, ts, sign(body, ts)) });
  assert.equal(res.status, 200);
  const json = JSON.parse(await res.text()) as { requestId: string };
  assert.equal(res.headers.get("x-request-id"), json.requestId);
});

test("fail-closed unchanged: unsigned / bad-signature requests get 401, id-matched", async () => {
  const body = JSON.stringify({ type: "PAYMENT_SUCCESS" });
  const ts = String(Math.floor(Date.now() / 1000));

  const noSig = await handler({
    request: new Request("http://test.local/api/webhooks/cashfree", {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
    }),
  });
  assert.equal(noSig.status, 401);
  const noSigJson = JSON.parse(await noSig.text()) as { code: string; requestId: string };
  assert.equal(noSigJson.code, "invalid_signature");
  assert.equal(noSig.headers.get("x-request-id"), noSigJson.requestId);

  const badSig = await handler({
    request: signedRequest(body, ts, "AAAA" + sign(body, ts).slice(4)),
  });
  assert.equal(badSig.status, 401);
  const badSigJson = JSON.parse(await badSig.text()) as { code: string; requestId: string };
  assert.equal(badSigJson.code, "invalid_signature");
  assert.equal(badSig.headers.get("x-request-id"), badSigJson.requestId);
});

test("stale timestamp is rejected fail-closed (id-matched 401)", async () => {
  const body = JSON.stringify({ type: "PAYMENT_SUCCESS" });
  const staleTs = String(Math.floor(Date.now() / 1000) - 60 * 60);
  const res = await handler({ request: signedRequest(body, staleTs, sign(body, staleTs)) });
  assert.equal(res.status, 401);
  const json = JSON.parse(await res.text()) as { code: string; requestId: string };
  assert.equal(json.code, "invalid_signature");
  assert.equal(res.headers.get("x-request-id"), json.requestId);
});

test("RC3 battery #4: valid signature but malformed JSON -> 400 invalid_json, id-matched", async () => {
  const body = '{"type":"PAYMENT_SUCCESS","data": oops-not-json';
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await handler({ request: signedRequest(body, ts, sign(body, ts)) });
  assert.equal(res.status, 400, "malformed JSON is a client error, not 500/200");
  const json = JSON.parse(await res.text()) as { code: string; requestId: string };
  assert.equal(json.code, "invalid_json");
  assert.equal(res.headers.get("x-request-id"), json.requestId);
});

test("RC3 battery #4b: paid event without an order id -> 400 missing_order_id, id-matched", async () => {
  const body = JSON.stringify({ type: "PAYMENT_SUCCESS", data: { payment: { payment_status: "SUCCESS" } } });
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await handler({ request: signedRequest(body, ts, sign(body, ts)) });
  assert.equal(res.status, 400);
  const json = JSON.parse(await res.text()) as { code: string; requestId: string };
  assert.equal(json.code, "missing_order_id");
  assert.equal(res.headers.get("x-request-id"), json.requestId);
});
