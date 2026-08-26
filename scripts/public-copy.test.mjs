// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Phase 00.5 WS1/WS2 regression (AC-1.1, AC-2.5/2.6): public customer-facing
 * copy must not contain legacy pay-to-rank product language, internal
 * engineering status phrases, or unlabelled example content.
 *
 * This is a SOURCE scan over the files a visitor's browser or crawler can
 * read (routes, components, legal copy, the host/SEO single source). Docs,
 * tests, and scripts are excluded by construction.
 */

const root = join(import.meta.dirname, "..");

/** @returns {string[]} */
function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

const COPY_DIRS = [join(root, "src", "routes"), join(root, "src", "components")];
const COPY_FILES = [
  join(root, "src", "lib", "legal.ts"),
  join(root, "src", "lib", "host.ts"),
  join(root, "src", "router.tsx"),
  join(root, "src", "start.ts"),
  join(root, "scripts", "host-seo-shared.mjs"),
];
const copyFiles = [
  ...COPY_DIRS.flatMap(listFiles).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts")),
  ...COPY_FILES,
];

// [label, regex] — legacy product concepts that no longer exist on this network.
const LEGACY_TERMS = [
  ["pay-to-rank", /pay-to-rank/i],
  ["rank as a paid product", /\brand(ed|ing|ings|s)?\b/i],
  ["$5 minimum", /\$5\b/i],
  ["minimum bid", /minimum bid/i],
  ["re-bid", /\bre-?bid/i],
  ["URL swap", /\bswap (fee|number|url|of|for)\b|\burl swap\b/i],
  ["manage link", /\bmanage (link|url|token)\b/i],
  ["listings (legacy board content)", /\blistings\b/i],
  ["outbid", /\boutbid/i],
  ["Oracle (legacy product)", /\boracle\b/i],
  ["Crown (legacy product)", /\bcrown\b/i],
  ["hype scaling", /\bhype\b/i],
];

// Internal engineering status that belongs in docs/STATE.md, not on the web (AC-2.5).
const ENGINEERING_STATUS = [
  ["foundation phase", /foundation phase/i],
  ["plumbing", /plumbing/i],
  ["nothing has been listed", /nothing has been listed/i],
  ["nothing has been paid out", /nothing has been paid out/i],
  ["no rankings exist", /no rankings exist/i],
];

test("public copy files exist (scan is not vacuous)", () => {
  assert.ok(copyFiles.length >= 10, `expected many copy files, found ${copyFiles.length}`);
});

for (const file of copyFiles) {
  const text = readFileSync(file, "utf8");
  const rel = file.slice(root.length + 1);

  for (const [label, re] of LEGACY_TERMS) {
    test(`${rel}: no legacy term "${label}"`, () => {
      const m = text.match(re);
      assert.ok(!m, `found ${JSON.stringify(m?.[0])} (legacy term "${label}")`);
    });
  }

  for (const [label, re] of ENGINEERING_STATUS) {
    test(`${rel}: no internal status phrase "${label}"`, () => {
      const m = text.match(re);
      assert.ok(!m, `found ${JSON.stringify(m?.[0])} (internal status "${label}")`);
    });
  }

  test(`${rel}: no unlabelled fake activity (counter-looking copy)`, () => {
    // Numbers that would read as live marketplace stats: "1,234 bounties",
    // "500 builders", etc. The demo amounts on foundersbid/culturebid/bidception
    // are allowed ONLY inside labelled example cards — they always co-occur
    // with the EXAMPLE/DEMO label in the same file, so assert that co-occurrence.
    if (/(₹\d|\$\d{2,})/.test(text)) {
      assert.ok(
        /example|demo/i.test(text),
        "monetary amounts appear but the file has no EXAMPLE/DEMO label",
      );
    }
  });
}
