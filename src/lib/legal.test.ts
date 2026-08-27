import { test } from "node:test";
import assert from "node:assert/strict";
import { legalDoc, LEGAL_SLUGS } from "@/lib/legal";
import { PRODUCT_KEYS, product } from "@/lib/host";

/**
 * Phase 00.5 WS1 regression: the public legal copy must not contain legacy
 * pay-to-rank product language, and must state the pre-launch truth
 * (AC-1.1..1.6).
 */

const FORBIDDEN: Array<[string, RegExp]> = [
  ["pay-to-rank", /pay-to-rank/i],
  ["rank (product concept)", /\brand(s|ed|ing|ings)?\b/i],
  ["bid to rank", /bid to rank/i],
  ["$5 minimum", /\$5\b/i],
  ["minimum bid", /minimum bid/i],
  ["re-bid", /\bre-?bid/i],
  ["URL swap / swap fee", /(url )?swap (fee|number)|swaps? (of|for) the? url/i],
  ["manage link", /manage (link|url)/i],
  ["legacy no-accounts line", /no accounts? (needed|are required)/i],
  ["listings (legacy board content)", /\blistings\b/i],
  ["outbid", /outbid/i],
  ["Oracle", /\boracle\b/i],
  ["Crown", /\bcrown/i],
  ["hype", /\bhype\b/i],
  ["sponsored", /sponsored/i],
];

function flatten(doc: ReturnType<typeof legalDoc>): string {
  return [
    doc.title,
    doc.updated,
    doc.intro,
    ...doc.blocks.map((b) => [b.heading ?? "", ...b.body].join(" ")),
  ].join("\n");
}

for (const key of PRODUCT_KEYS) {
  for (const slug of LEGAL_SLUGS) {
    test(`${key}/${slug}: no legacy product language`, () => {
      const text = flatten(legalDoc(key, slug));
      for (const [label, re] of FORBIDDEN) {
        assert.ok(
          !re.test(text),
          `${key}/${slug} contains legacy term "${label}": ${text.match(re)?.[0]}`,
        );
      }
    });

    test(`${key}/${slug}: product-aware + dated`, () => {
      const doc = legalDoc(key, slug);
      assert.match(doc.updated, /\d{2} \w+ 2026/);
      assert.match(flatten(doc), new RegExp(product(key).name, "i"));
    });
  }
}

const TERMS = PRODUCT_KEYS.map((k) => flatten(legalDoc(k, "terms")));
const PRIVACY = PRODUCT_KEYS.map((k) => flatten(legalDoc(k, "privacy")));
const REFUND = PRODUCT_KEYS.map((k) => flatten(legalDoc(k, "refund")));

test("terms: accounts exist, payments disabled, marketplace rules drafted (all products)", () => {
  for (const text of TERMS) {
    // Phase 01 reality: accounts + profiles + drafts exist; payments do not.
    assert.match(text, /funding is NOT yet enabled/i);
    assert.match(text, /no payment of any kind is accepted/i);
    assert.match(text, /EXAMPLE or DEMO/i);
    assert.match(text, /founding-access/i);
    // The marketplace rules are published as the operational draft.
    assert.match(text, /operational draft/i);
    assert.match(text, /MODE A — BOUNTIES/i);
    assert.match(text, /MODE B — PROJECTS/i);
    // No provider names or payment-flow words in public copy.
    assert.doesNotMatch(text, /cashfree|upi/i);
  }
});

test("privacy: only data actually collected today (all products)", () => {
  for (const text of PRIVACY) {
    assert.match(text, /aggregate/i);
    assert.match(text, /email address/i);
    assert.match(text, /appearance choice/i);
    assert.match(text, /vercel/i);
    assert.match(text, /do not collect/i);
    assert.doesNotMatch(text, /card|upi|payment method details/i);
  }
});

test("privacy: transient IP disclosure is technically accurate (Phase 00.6, AC-2.1)", () => {
  for (const text of PRIVACY) {
    assert.match(text, /temporarily process your ip address in memory/i);
    assert.match(text, /rate limit/i);
    assert.match(text, /not persisted/i);
    assert.match(text, /not used for advertising or profiling/i);
    // the unqualified legacy claim is gone
    assert.doesNotMatch(text, /we do not store ip addresses/i);
  }
});

test("refund: payments disabled; funding refund terms drafted (all products)", () => {
  for (const text of REFUND) {
    assert.match(text, /no payment of any kind is accepted/i);
    assert.match(text, /no payment method can be entered/i);
    assert.match(text, /operational draft/i);
    assert.match(text, /earlier version of the service/i);
    // Must NOT describe legacy mechanics that do not exist today:
    assert.doesNotMatch(text, /final once paid|charge is non-refundable/i);
    // No provider names in public copy.
    assert.doesNotMatch(text, /cashfree|upi/i);
  }
});
