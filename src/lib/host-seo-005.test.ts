import { test } from "node:test";
import assert from "node:assert/strict";
import {
  injectNotFoundTheme,
  injectSeoHead,
  linkOrigin,
  notFoundHeadTags,
  sitemapXml,
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

  test(`${key}: sitemap inventories only its own URLs`, () => {
    const xml = sitemapXml(key);
    assert.match(xml, new RegExp(`<loc>https://${apex}/</loc>`));
    for (const path of ["/terms", "/privacy", "/refund", "/contact"]) {
      assert.match(xml, new RegExp(`<loc>https://${apex}${path}</loc>`));
    }
    // No other product origin in this host's inventory (AC-6.2).
    for (const other of PRODUCT_KEYS) {
      if (other === key) continue;
      assert.ok(!xml.includes(product(other).apex), `${key} sitemap leaked ${other}'s origin`);
    }
  });

  test(`${key}: not-found head is noindex,follow without canonical`, () => {
    const tags = notFoundHeadTags(key);
    assert.match(tags, /<meta name="robots" content="noindex,follow">/);
    assert.match(tags, new RegExp(`Page not found — ${product(key).name.replace(/[.*+?^${}()|[\]\\]/g, "")}`));
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

  test(`${key}: 200 injection keeps canonical + host title`, () => {
    const out = injectSeoHead(SAMPLE_HTML, key, "/", 200);
    assert.match(out, new RegExp(`<link rel="canonical" href="https://${apex}/">`));
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
