import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasCapability,
  canonicalProductForCapability,
  capabilityForPath,
  readRedirectFor,
  assertProductCapability,
  assertEntityProduct,
} from "../src/lib/marketplace/capabilities";
import { entityRedirectFor } from "../src/lib/marketplace/capabilities.server";
import { AuthzError } from "../src/lib/authz-shared";

/**
 * RC1 R4 — host × capability matrix. The shared matrix (host-seo-shared.mjs)
 * is the single source: these assertions pin it so a change anywhere is a
 * test failure.
 */

test("R4: capability matrix (the authoritative matrix)", () => {
  // foundersbid: bounties, projects, graveyard
  assert.ok(hasCapability("foundersbid", "bounties"));
  assert.ok(hasCapability("foundersbid", "projects"));
  assert.ok(hasCapability("foundersbid", "graveyard"));
  assert.ok(!hasCapability("foundersbid", "bidception"));
  assert.ok(!hasCapability("foundersbid", "reputation"));
  // culturebid: creative bounties only
  assert.ok(hasCapability("culturebid", "bounties"));
  assert.ok(!hasCapability("culturebid", "projects"));
  assert.ok(!hasCapability("culturebid", "graveyard"));
  assert.ok(!hasCapability("culturebid", "bidception"));
  assert.ok(!hasCapability("culturebid", "reputation"));
  // bidception: parent work only
  assert.ok(hasCapability("bidception", "bidception"));
  for (const c of ["bounties", "projects", "graveyard", "reputation"] as const) {
    assert.ok(!hasCapability("bidception", c), `bidception must not host ${c}`);
  }
  // bidthrone: reputation only
  assert.ok(hasCapability("bidthrone", "reputation"));
  for (const c of ["bounties", "projects", "graveyard", "bidception"] as const) {
    assert.ok(!hasCapability("bidthrone", c), `bidthrone must not host ${c}`);
  }
  // shared capabilities everywhere
  for (const p of ["foundersbid", "culturebid", "bidception", "bidthrone"]) {
    for (const c of ["profiles", "auth", "dashboard", "notifications"]) {
      assert.ok(hasCapability(p as never, c as never), `${p} shares ${c}`);
    }
  }
});

test("R4: canonical products", () => {
  assert.equal(canonicalProductForCapability("bounties"), "foundersbid");
  assert.equal(canonicalProductForCapability("projects"), "foundersbid");
  assert.equal(canonicalProductForCapability("graveyard"), "foundersbid");
  assert.equal(canonicalProductForCapability("bidception"), "bidception");
  assert.equal(canonicalProductForCapability("reputation"), "bidthrone");
  assert.equal(canonicalProductForCapability("profiles"), null, "shared — no canonical host");
});

test("R4: path → capability classification", () => {
  assert.equal(capabilityForPath("/bounties"), "bounties");
  assert.equal(capabilityForPath("/bounties/new"), "bounties");
  assert.equal(capabilityForPath("/bounties/bnt_x"), "bounties");
  assert.equal(capabilityForPath("/projects"), "projects");
  assert.equal(capabilityForPath("/graveyard/new"), "graveyard");
  assert.equal(capabilityForPath("/bidception/pwr_x"), "bidception");
  assert.equal(capabilityForPath("/leaderboards"), "reputation");
  assert.equal(capabilityForPath("/bid-index"), "reputation");
  assert.equal(capabilityForPath("/profile/alpha"), null, "profiles are shared");
  assert.equal(capabilityForPath("/signin"), null);
  assert.equal(capabilityForPath("/terms"), null);
});

test("R4: READ redirects (host × route matrix)", () => {
  // wrong host -> canonical origin
  assert.equal(readRedirectFor("bidthrone", "/graveyard"), "https://foundersbid.lol/graveyard");
  assert.equal(readRedirectFor("bidception", "/bounties"), "https://foundersbid.lol/bounties");
  assert.equal(readRedirectFor("foundersbid", "/bidception"), "https://bidception.lol/bidception");
  assert.equal(readRedirectFor("foundersbid", "/leaderboards"), "https://bidthrone.lol/leaderboards");
  assert.equal(readRedirectFor("culturebid", "/projects"), "https://foundersbid.lol/projects");
  assert.equal(readRedirectFor("culturebid", "/graveyard"), "https://foundersbid.lol/graveyard");
  assert.equal(readRedirectFor("bidception", "/bid-index"), "https://bidthrone.lol/bid-index");
  // right host -> no redirect
  assert.equal(readRedirectFor("foundersbid", "/bounties"), null);
  assert.equal(readRedirectFor("foundersbid", "/graveyard"), null);
  assert.equal(readRedirectFor("culturebid", "/bounties"), null, "creative bounties are culturebid's own");
  assert.equal(readRedirectFor("bidception", "/bidception/new"), null);
  assert.equal(readRedirectFor("bidthrone", "/leaderboards"), null);
  // shared paths never redirect
  assert.equal(readRedirectFor("bidthrone", "/signin"), null);
  assert.equal(readRedirectFor("culturebid", "/profile/alpha"), null);
  assert.equal(readRedirectFor("foundersbid", "/dashboard"), null);
});

test("R4: WRITE enforcement — assertProductCapability throws wrong_product", () => {
  assert.doesNotThrow(() => assertProductCapability("foundersbid", "bounties"));
  for (const bad of [
    ["bidthrone", "bounties"],
    ["bidception", "bounties"],
    ["culturebid", "projects"],
    ["culturebid", "graveyard"],
    ["foundersbid", "bidception"],
    ["bidthrone", "graveyard"],
  ] as Array<[never, never]>) {
    assert.throws(
      () => assertProductCapability(bad[0], bad[1]),
      (err: unknown) => err instanceof AuthzError && err.code === "wrong_product",
      `${bad[0]} must not write ${bad[1]}`,
    );
  }
});

test("R4: entity-scoped WRITE enforcement — assertEntityProduct", () => {
  assert.doesNotThrow(() => assertEntityProduct("foundersbid", "foundersbid"));
  assert.throws(
    () => assertEntityProduct("foundersbid", "bidthrone"),
    (err: unknown) => err instanceof AuthzError && err.code === "wrong_product",
  );
});

test("R4: entity-aware READ redirect (detail routes)", () => {
  // a culturebid bounty viewed on bidthrone goes to culturebid's live origin (www)
  assert.equal(entityRedirectFor("culturebid", "bidthrone", "/bounties/bnt_x"), "https://www.culturebid.lol/bounties/bnt_x");
  assert.equal(entityRedirectFor("foundersbid", "bidception", "/projects/prj_x"), "https://foundersbid.lol/projects/prj_x");
  assert.equal(entityRedirectFor("bidception", "bidthrone", "/bidception/pwr_x"), "https://bidception.lol/bidception/pwr_x");
  // same product -> no redirect; unknown -> no redirect (honest 404 in the loader)
  assert.equal(entityRedirectFor("foundersbid", "foundersbid", "/bounties/bnt_x"), null);
  assert.equal(entityRedirectFor(null, "foundersbid", "/bounties/bnt_x"), null);
  assert.equal(entityRedirectFor("bogus", "foundersbid", "/bounties/bnt_x"), null);
});