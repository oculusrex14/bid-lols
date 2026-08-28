import { test } from "node:test";
import assert from "node:assert/strict";
import {
  injectNotFoundTheme,
  injectSeoHead,
  linkOrigin,
  notFoundHeadTags,
  robotsMetaFor,
  seoOrigin,
  sitemapXml,
  wwwRedirectFor,
} from "../../scripts/host-seo-shared.mjs";
import { PRODUCT_KEYS, product } from "@/lib/host";

/**
 * Phase 00.5 WS5/WS6 regression: host-aware sitemaps, the 404 head contract
 * (noindex,follow, no canonical for missing paths), 404 body theming, and the
 * DNS-safe cross-link origins.
 */

const SAMPLE_HTML =
  '<!DOCTYPE html><html lang="en" class="antialiased" data-mode="light">' +
  '<head><title>old</title><meta name="robots" content="index"></head>' +
  '<body><script>inline()</script><script src="/a.js"></script></body></html>';

for (const key of PRODUCT_KEYS) {
  const apex = product(key).apex;

  test(`${key}: sitemap inventories only its own home URL (AC-6.2, Phase 00.6)`, () => {
    const xml = sitemapXml(key);
    assert.match(xml, new RegExp(`<loc>${seoOrigin(key)}/</loc>`));
    assert.equal((xml.match(/<url>/g) ?? []).length, 1, "home only — legal pages are noindex");
    for (const path of ["/terms", "/privacy", "/refund", "/contact"]) {
      assert.ok(!xml.includes(`${apex}${path}`), `${key} sitemap still lists ${path}`);
    }
    // No other product origin in this host's inventory.
    for (const other of PRODUCT_KEYS) {
      if (other === key) continue;
      assert.ok(!xml.includes(product(other).apex), `${key} sitemap leaked ${other}'s origin`);
    }
  });

  test(`${key}: sitemap lists live marketplace paths when provided (RC2, C7)`, () => {
    const origin = seoOrigin(key);
    const xml = sitemapXml(key, [
      { path: "/bounties/bnt_x", lastmod: "2026-08-28T00:00:00.000Z" },
      { path: "/bidception/pwr_y", lastmod: null },
    ]);
    assert.match(xml, new RegExp(`<loc>${origin}/bounties/bnt_x</loc>`));
    assert.match(xml, new RegExp(`<loc>${origin}/bidception/pwr_y</loc>`));
    assert.equal((xml.match(/<url>/g) ?? []).length, 3, "home + the provided paths");
    assert.match(xml, /<lastmod>2026-08-28T00:00:00\.000Z<\/lastmod>/);
    for (const other of PRODUCT_KEYS) {
      if (other === key) continue;
      assert.ok(!xml.includes(product(other).apex), `${key} sitemap leaked ${other}'s origin`);
    }
  });

  test(`${key}: deliberate indexing policy (AC-6.1)`, () => {
    assert.equal(robotsMetaFor(key, "/"), "index,follow");
    for (const path of ["/terms", "/privacy", "/refund", "/contact"]) {
      assert.equal(robotsMetaFor(key, path), "noindex,follow");
    }
    // the 200 head carries the policy tag
    assert.match(injectSeoHead(SAMPLE_HTML, key, "/", 200), /<meta name="robots" content="index,follow">/);
    assert.match(injectSeoHead(SAMPLE_HTML, key, "/terms", 200), /<meta name="robots" content="noindex,follow">/);
  });

  test(`${key}: not-found head is noindex,follow without canonical`, () => {
    const tags = notFoundHeadTags(key);
    assert.match(tags, /<meta name="robots" content="noindex,follow">/);
    assert.match(tags, new RegExp(`Page not found: ${product(key).name.replace(/[.*+?^${}()|[\]\\]/g, "")}`));
    assert.ok(!tags.includes("canonical"), "404 head must carry no canonical");
    assert.ok(!tags.includes("og:url"), "404 head must carry no og:url");
  });

  test(`${key}: 404 injection replaces head, strips stale robots/canonical`, () => {
    const html = `<html><head><title>x</title><meta name="robots" content="index,follow"><link rel="canonical" href="https://e.com/a"></head><body></body></html>`;
    const out = injectSeoHead(html, key, "/does-not-exist", 404);
    assert.match(out, /noindex,follow/);
    assert.ok(!out.includes('rel="canonical"'));
    assert.ok(!out.includes('content="index,follow"'), "old robots meta must be stripped");
  });

  test(`${key}: 200 injection keeps canonical (canonical origin) + host title`, () => {
    const out = injectSeoHead(SAMPLE_HTML, key, "/", 200);
    assert.match(out, new RegExp(`<link rel="canonical" href="${seoOrigin(key)}/">`));
    assert.match(out, /<title>/);
    assert.ok(!out.includes("noindex"));
  });
}

test("404 theme lands on <html> for themed products, no-op for bidthrone", () => {
  const themed = injectNotFoundTheme(SAMPLE_HTML, "foundersbid");
  assert.match(themed, /<html data-theme="founders"/);
  const unthemed = injectNotFoundTheme(SAMPLE_HTML, "bidthrone");
  assert.equal(unthemed, SAMPLE_HTML);
});

test("linkOrigin: culturebid visitors go to www (apex DNS broken), others to apex", () => {
  assert.equal(linkOrigin("culturebid"), "https://www.culturebid.lol");
  assert.equal(linkOrigin("bidthrone"), "https://bidthrone.lol");
  assert.equal(linkOrigin("foundersbid"), "https://foundersbid.lol");
  assert.equal(linkOrigin("bidception"), "https://bidception.lol");
});

test("wwwRedirectFor: 301 to apex for the three DNS-healthy products (AC-3.5)", () => {
  for (const key of ["bidthrone", "foundersbid", "bidception"] as const) {
    const apex = product(key).apex;
    assert.equal(wwwRedirectFor(`www.${apex}`), `https://${apex}/`);
    assert.equal(wwwRedirectFor(`www.${apex}`, "/terms"), `https://${apex}/terms`);
    assert.equal(wwwRedirectFor(`www.${apex}`, "/terms", "?q=1"), `https://${apex}/terms?q=1`);
    // ports do not defeat the match
    assert.equal(wwwRedirectFor(`www.${apex}:443`, "/x"), `https://${apex}/x`);
  }
});

test("wwwRedirectFor: excluded/unknown hosts never redirect (AC-3.5)", () => {
  // culturebid: apex DNS broken — www is the only working origin
  assert.equal(wwwRedirectFor("www.culturebid.lol", "/"), null);
  assert.equal(wwwRedirectFor("WWW.CultureBid.Lol:8080", "/terms"), null);
  // apex hosts themselves never redirect
  for (const key of PRODUCT_KEYS) {
    assert.equal(wwwRedirectFor(product(key).apex, "/"), null);
  }
  // www of an unknown host -> umbrella default, no redirect
  assert.equal(wwwRedirectFor("www.unknown-preview.vercel.app", "/"), null);
});
