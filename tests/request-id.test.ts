import { test } from "node:test";
import assert from "node:assert/strict";
import { isKnownRoute, isUnknownRouteJsonQuirk } from "../server/middleware/request-id";

/**
 * Phase 00.5 AC-6.5 + Phase 00.6 WS4-B: the unknown-route + JSON-Accept quirk
 * relabel must fire ONLY for missing pages — never mask a genuine 500 on a
 * route that has a real handler — and the classification must be
 * BOUNDARY-AWARE (the Phase 00.5 prefix regex matched /termsXYZ etc.).
 */

test("unknown routes with JSON accept are the deterministic 500->404 quirk", () => {
  assert.equal(isUnknownRouteJsonQuirk("/no/such/page", 500, true), true);
  assert.equal(isUnknownRouteJsonQuirk("/anything/else/at/all", 500, true), true);
});

test("route classification is boundary-aware (WS4-B cases)", () => {
  // known: exact routes
  assert.equal(isKnownRoute("/terms"), true, "/terms known");
  assert.equal(isKnownRoute("/privacy"), true);
  assert.equal(isKnownRoute("/"), true);
  // unknown: no boundary after the segment
  assert.equal(isKnownRoute("/termsXYZ"), false, "/termsXYZ must be unknown");
  assert.equal(isKnownRoute("/privacy123"), false, "/privacy123 must be unknown");
  // trailing slash: the router does NOT match /terms/ (verified empirically
  // on the built preview) — so a JSON 500 there is the quirk, not a genuine
  // handler failure
  // Deliberate behavior: the router answers /terms/ with a 307 -> /terms
  // (verified on the built preview), so a 500 can never originate from it —
  // classifying it "unknown" is the safe, honest choice either way.
  assert.equal(isKnownRoute("/terms/"), false, "/terms/ is the 307 redirect, not a content route");
  // api: only the real API routes are known
  assert.equal(isKnownRoute("/api/webhooks/cashfree"), true);
  assert.equal(isKnownRoute("/api/favicon"), true);
  assert.equal(isKnownRoute("/api/whatever"), false, "/api/whatever is not a route");
  assert.equal(isKnownRoute("/api"), false, "/api bare is not a route");
  // serverFn namespace
  assert.equal(isKnownRoute("/_serverFn/abc123"), true);
  assert.equal(isKnownRoute("/_serverFn"), false, "/_serverFn bare is not a dispatch path");
  // arbitrary
  assert.equal(isKnownRoute("/random"), false);
  assert.equal(isKnownRoute("/random/sub"), false);
  // legacy 308 prefixes stay boundary-aware too
  assert.equal(isKnownRoute("/founders"), true);
  assert.equal(isKnownRoute("/founders/x"), true);
  assert.equal(isKnownRoute("/foundersXYZ"), false);
  assert.equal(isKnownRoute("/specBoard"), false);
});

test("genuine routes are never relabelled", () => {
  for (const path of [
    "/",
    "/terms",
    "/privacy",
    "/refund",
    "/contact",
    "/api/webhooks/cashfree",
    "/api/favicon",
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

test("live marketplace routes are known (a real 500 there is not a fake-404)", () => {
  for (const path of [
    "/bounties",
    "/projects",
    "/graveyard",
    "/bidception",
    "/leaderboards",
    "/bid-index",
    "/signin",
    "/signup",
    "/bounties/bnt_abc123def456",
    "/graveyard/gyl_abc123def456",
    "/profile/alpha",
    "/api/auth/session",
    "/test/checkout/pmt_abc",
  ]) {
    assert.equal(isKnownRoute(path), true, `${path} is a known route`);
  }
});

test("non-JSON accepts and non-500 statuses are not the quirk", () => {
  assert.equal(isUnknownRouteJsonQuirk("/no/such/page", 500, false), false);
  assert.equal(isUnknownRouteJsonQuirk("/no/such/page", 404, true), false);
  assert.equal(isUnknownRouteJsonQuirk("/no/such/page", 400, true), false);
});
