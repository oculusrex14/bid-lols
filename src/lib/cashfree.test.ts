import { createHmac } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyCashfreeWebhook } from "@/lib/cashfree";

const SECRET = "test-webhook-secret-not-committed";

function sign(rawBody: string, timestamp: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
}

const NOW_S = () => String(Math.floor(Date.now() / 1000));
const BODY = '{"type":"PAYMENT_SUCCESS","data":{"order":{"order_id":"ord_abc123","order_status":"PAID"}}}';

test("S-1: no configured webhook secret -> reject (fail closed, never open)", () => {
  delete process.env.CASHFREE_WEBHOOK_SECRET;
  const ts = NOW_S();
  // Even a "perfectly signed" request must be rejected without a secret.
  assert.equal(verifyCashfreeWebhook({ signature: sign(BODY, ts), timestamp: ts, rawBody: BODY }), false);
});

test("S-1: whitespace-only secret counts as unconfigured -> reject", () => {
  process.env.CASHFREE_WEBHOOK_SECRET = "   ";
  const ts = NOW_S();
  assert.equal(verifyCashfreeWebhook({ signature: sign(BODY, ts), timestamp: ts, rawBody: BODY }), false);
});

test("S-1: dedicated secret only — the client secret is NOT a fallback", () => {
  process.env.CASHFREE_WEBHOOK_SECRET = "";
  process.env.CASHFREE_CLIENT_SECRET = "leaked-client-secret";
  const ts = NOW_S();
  const sigWithClientSecret = sign(BODY, ts, "leaked-client-secret");
  assert.equal(
    verifyCashfreeWebhook({ signature: sigWithClientSecret, timestamp: ts, rawBody: BODY }),
    false,
  );
  delete process.env.CASHFREE_CLIENT_SECRET;
});

test("valid signature + fresh timestamp -> accept", () => {
  process.env.CASHFREE_WEBHOOK_SECRET = SECRET;
  const ts = NOW_S();
  assert.equal(verifyCashfreeWebhook({ signature: sign(BODY, ts), timestamp: ts, rawBody: BODY }), true);
});

test("wrong secret -> reject", () => {
  process.env.CASHFREE_WEBHOOK_SECRET = SECRET;
  const ts = NOW_S();
  const bad = sign(BODY, ts, "other-secret");
  assert.equal(verifyCashfreeWebhook({ signature: bad, timestamp: ts, rawBody: BODY }), false);
});

test("tampered body -> reject", () => {
  process.env.CASHFREE_WEBHOOK_SECRET = SECRET;
  const ts = NOW_S();
  const sig = sign(BODY, ts);
  assert.equal(
    verifyCashfreeWebhook({ signature: sig, timestamp: ts, rawBody: BODY + " " }),
    false,
  );
});

test("missing signature or timestamp -> reject", () => {
  process.env.CASHFREE_WEBHOOK_SECRET = SECRET;
  const ts = NOW_S();
  assert.equal(verifyCashfreeWebhook({ signature: null, timestamp: ts, rawBody: BODY }), false);
  assert.equal(verifyCashfreeWebhook({ signature: sign(BODY, ts), timestamp: null, rawBody: BODY }), false);
  assert.equal(verifyCashfreeWebhook({ signature: "", timestamp: ts, rawBody: BODY }), false);
  assert.equal(verifyCashfreeWebhook({ signature: sign(BODY, ts), timestamp: "", rawBody: BODY }), false);
});

test("non-numeric timestamp -> reject", () => {
  process.env.CASHFREE_WEBHOOK_SECRET = SECRET;
  assert.equal(
    verifyCashfreeWebhook({ signature: "x", timestamp: "not-a-number", rawBody: BODY }),
    false,
  );
});

test("S-2 replay window: timestamp older than 15 minutes -> reject (both directions)", () => {
  process.env.CASHFREE_WEBHOOK_SECRET = SECRET;
  const old = String(Math.floor(Date.now() / 1000) - 16 * 60);
  assert.equal(
    verifyCashfreeWebhook({ signature: sign(BODY, old), timestamp: old, rawBody: BODY }),
    false,
  );
  const future = String(Math.floor(Date.now() / 1000) + 16 * 60);
  assert.equal(
    verifyCashfreeWebhook({ signature: sign(BODY, future), timestamp: future, rawBody: BODY }),
    false,
  );
  const within = String(Math.floor(Date.now() / 1000) - 10 * 60);
  assert.equal(
    verifyCashfreeWebhook({ signature: sign(BODY, within), timestamp: within, rawBody: BODY }),
    true,
    "10-minute-old event is still inside the replay window",
  );
});
