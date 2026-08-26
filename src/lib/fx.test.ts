import { test } from "node:test";
import assert from "node:assert/strict";
import { getUsdInrQuote, resetFxCache, usdCentsToInrRupees } from "@/lib/fx";

const LIVE_OK: Response = new Response(
  JSON.stringify({
    result: "success",
    rates: { INR: 88.1234 },
    time_last_update_utc: "2026-08-26T12:00:00",
  }),
  { status: 200, headers: { "content-type": "application/json" } },
);

const LIVE_BAD = new Response("boom", { status: 503 });

test("S-7: live fetch success -> source 'live' with the mid rate", async () => {
  resetFxCache();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => LIVE_OK.clone()) as typeof fetch;
  try {
    const q = await getUsdInrQuote();
    assert.equal(q.source, "live");
    assert.ok(Math.abs(q.inrPerUsd - 88.1234) < 1e-6);
    assert.equal(q.asOf, "2026-08-26T12:00:00");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("S-7: live fetch failure -> fallback rate, source 'fallback', and a visible log line", async () => {
  resetFxCache();
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;
  const warnings: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  try {
    const q = await getUsdInrQuote();
    assert.equal(q.source, "fallback");
    assert.ok(q.inrPerUsd > 0, "fallback rate is a positive number");
    assert.ok(
      warnings.some((w) => JSON.stringify(w).includes("fallback rate")),
      "fallback event is logged (never silent)",
    );
  } finally {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
  }
});

test("S-7: non-OK response also falls back", async () => {
  resetFxCache();
  const realFetch = globalThis.fetch;
  const realWarn = console.warn;
  console.warn = () => {};
  globalThis.fetch = (async () => LIVE_BAD) as typeof fetch;
  try {
    const q = await getUsdInrQuote();
    assert.equal(q.source, "fallback");
  } finally {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
  }
});

test("usdCentsToInrRupees: integer rupees, minimum 1, rate sanity", () => {
  assert.equal(usdCentsToInrRupees(10000, 85), 8500); // $100 @ 85
  assert.equal(usdCentsToInrRupees(1, 85), 1); // dust rounds up to 1 rupee
  assert.equal(usdCentsToInrRupees(0, 85), 1);
  assert.equal(usdCentsToInrRupees(10000, 0), 8500); // bad rate -> env fallback (85)
});
