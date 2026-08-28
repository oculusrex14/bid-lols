/**
 * RC3, S-10.4: dev/E2E-only endpoints must be inert in DEPLOYED environments.
 *
 * Production simulation: the same route handlers that a deployed Vercel
 * runtime would execute, called with `VERCEL_ENV` set (any value — Vercel
 * sets it for preview + production alike). Every dev surface must answer
 * 403 with the machine-readable envelope BEFORE touching the database or
 * leaking financial/user/env state.
 *
 * Also pins the second guard on the fake checkout: even locally it is
 * refused unless PAYMENT_PROVIDER=fake.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Route as DevStateRoute } from "../src/routes/api.dev.state";
import { Route as VerifyEmailRoute } from "../src/routes/api.dev.verify-email";
import { Route as TestCheckoutRoute } from "../src/routes/test.checkout.$paymentId";

type Handler = (opts: { request: Request; params?: Record<string, string> }) => Promise<Response>;

const devStateHandler = (
  DevStateRoute as unknown as { options: { server: { handlers: { GET: Handler } } } }
).options.server.handlers.GET;
const verifyEmailHandler = (
  VerifyEmailRoute as unknown as { options: { server: { handlers: { POST: Handler } } } }
).options.server.handlers.POST;
const testCheckoutHandler = (
  TestCheckoutRoute as unknown as { options: { server: { handlers: { GET: Handler } } } }
).options.server.handlers.GET;

function withDeployedEnv<T>(fn: () => Promise<T>): Promise<T> {
  const prev = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "preview";
  const run = async () => {
    try {
      return await fn();
    } finally {
      if (prev === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = prev;
    }
  };
  return run();
}

test("deployed sim: /api/dev/state refuses with 403 (no bounty state, no env leak)", async () => {
  await withDeployedEnv(async () => {
    const res = await devStateHandler({
      request: new Request("http://test.local/api/dev/state?bountyId=bnt_doesnotexist00"),
    });
    assert.equal(res.status, 403);
    const json = JSON.parse(await res.text()) as Record<string, unknown>;
    assert.equal(json.code, "forbidden");
    assert.ok(!("bounty" in json) && !("payments" in json) && !("env" in json), "no state in the body");
  });
});

test("deployed sim: /api/dev/verify-email refuses with 403 before any session/DB read", async () => {
  await withDeployedEnv(async () => {
    const res = await verifyEmailHandler({
      request: new Request("http://test.local/api/dev/verify-email", { method: "POST" }),
    });
    assert.equal(res.status, 403);
    const json = JSON.parse(await res.text()) as Record<string, unknown>;
    assert.equal(json.code, "forbidden");
    assert.ok(!("userId" in json) && !("ok" in json), "no user state in the body");
  });
});

test("deployed sim: /test/checkout refuses with 403 (fake provider seam is inert)", async () => {
  await withDeployedEnv(async () => {
    const res = await testCheckoutHandler({
      request: new Request("http://test.local/test/checkout/pay_deadbeef"),
      params: { paymentId: "pay_deadbeef" },
    });
    assert.equal(res.status, 403);
    const json = JSON.parse(await res.text()) as Record<string, unknown>;
    assert.equal(json.code, "forbidden");
  });
});

test("second guard: fake checkout is refused locally unless PAYMENT_PROVIDER=fake", async () => {
  const prevProvider = process.env.PAYMENT_PROVIDER;
  process.env.PAYMENT_PROVIDER = "real-cashfree";
  try {
    const res = await testCheckoutHandler({
      request: new Request("http://test.local/test/checkout/pay_deadbeef"),
      params: { paymentId: "pay_deadbeef" },
    });
    assert.equal(res.status, 403, "non-fake provider cannot reach the test checkout");
    const json = JSON.parse(await res.text()) as Record<string, unknown>;
    assert.equal(json.code, "forbidden");
  } finally {
    if (prevProvider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = prevProvider;
  }
});
