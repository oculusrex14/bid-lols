import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHost, redirectForBrandHost, siteForHost } from "./brand-host.mjs";

test("normalizeHost strips www and port", () => {
  assert.equal(normalizeHost("www.foundersbid.lol:443"), "foundersbid.lol");
  assert.equal(normalizeHost("Bidception.lol"), "bidception.lol");
  assert.equal(normalizeHost("www.culturebid.lol"), "culturebid.lol");
});

test("localhost and portal hosts do not redirect", () => {
  assert.equal(siteForHost("localhost:8080"), null);
  assert.equal(redirectForBrandHost({ host: "bidthrone.lol", path: "/" }), null);
  assert.equal(redirectForBrandHost({ host: "www.bidthrone.lol", path: "/founders" }), null);
  assert.equal(redirectForBrandHost({ host: "localhost:8080", path: "/" }), null);
});

test("brand apex / www prefix onto the board", () => {
  assert.deepEqual(redirectForBrandHost({ host: "foundersbid.lol", path: "/" }), {
    location: "/founders",
    status: 302,
  });
  assert.deepEqual(redirectForBrandHost({ host: "www.foundersbid.lol", path: "/bid" }), {
    location: "/founders/bid",
    status: 302,
  });
  assert.deepEqual(
    redirectForBrandHost({ host: "bidception.lol", path: "/terms", search: "" }),
    { location: "/bidception/terms", status: 302 },
  );
  assert.deepEqual(
    redirectForBrandHost({ host: "bidception.lol", path: "/manage/abc", search: "?x=1" }),
    { location: "/bidception/manage/abc?x=1", status: 302 },
  );
});

test("already-prefixed brand paths stay put", () => {
  assert.equal(
    redirectForBrandHost({ host: "foundersbid.lol", path: "/founders" }),
    null,
  );
  assert.equal(
    redirectForBrandHost({ host: "foundersbid.lol", path: "/founders/bid" }),
    null,
  );
});

test("static and api paths are not prefixed", () => {
  for (const path of ["/api/webhooks/cashfree", "/assets/app.js", "/favicon.svg", "/og.jpg", "/__grok/manifest.json"]) {
    assert.equal(
      redirectForBrandHost({ host: "foundersbid.lol", path }),
      null,
      path,
    );
  }
});

test("cross-board and spec bounce to the right origin", () => {
  assert.deepEqual(redirectForBrandHost({ host: "foundersbid.lol", path: "/bidception" }), {
    location: "https://bidception.lol/",
    status: 302,
  });
  assert.deepEqual(
    redirectForBrandHost({ host: "bidception.lol", path: "/founders/rules" }),
    { location: "https://foundersbid.lol/rules", status: 302 },
  );
  assert.deepEqual(redirectForBrandHost({ host: "foundersbid.lol", path: "/spec" }), {
    location: "https://bidthrone.lol/spec",
    status: 302,
  });
  assert.deepEqual(redirectForBrandHost({ host: "culturebid.lol", path: "/" }), {
    location: "/culture",
    status: 302,
  });
  assert.deepEqual(
    redirectForBrandHost({ host: "culturebid.lol", path: "/founders" }),
    { location: "https://foundersbid.lol/", status: 302 },
  );
  assert.deepEqual(
    redirectForBrandHost({ host: "culturebid.lol", path: "/bidception/rules" }),
    { location: "https://bidception.lol/rules", status: 302 },
  );
  assert.equal(redirectForBrandHost({ host: "culturebid.lol", path: "/culture/bid" }), null);
});
