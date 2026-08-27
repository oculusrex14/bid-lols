import { test } from "node:test";
import assert from "node:assert/strict";
import { isUnknownRouteJsonQuirk } from "../server/middleware/request-id";

/**
 * Phase 00.5, AC-6.5 regression: the unknown-route + JSON-Accept quirk
 * relabel must fire ONLY for missing pages — never mask a genuine 500 on a
 * route that has a real handler.
 */

test("unknown routes with JSON accept are the deterministic 500->404 quirk", () => {
  assert.equal(isUnknownRouteJsonQuirk("/no/such/page", 500, true), true);
  assert.equal(isUnknownRouteJsonQuirk("/anything/else/at/all", 500, true), true);
});

test("genuine routes are never relabelled", () => {
  for (const path of [
    "/",
    "/terms",
    "/privacy",
    "/refund",
    "/contact",
    "/api/webhooks/cashfree",
    "/_serverFn/abc123",
    "/robots.txt",
    "/sitemap.xml",
    "/founders",
    "/culture/board",
    "/bidception",
    "/spec",
  ]) {
    assert.equal(isUnknownRouteJsonQuirk(path, 500, true), false, `${path} must stay a 500`);
  }
});

test("non-JSON accepts and non-500 statuses are not the quirk", () => {
  assert.equal(isUnknownRouteJsonQuirk("/no/such/page", 500, false), false);
  assert.equal(isUnknownRouteJsonQuirk("/no/such/page", 404, true), false);
  assert.equal(isUnknownRouteJsonQuirk("/no/such/page", 400, true), false);
});
