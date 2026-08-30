import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatMajor,
  formatMinor,
  formatMinorTrimmed,
  toSupportedCurrency,
} from "../src/lib/money";
import { modeBootScript, readMode } from "../src/lib/mode";

/**
 * RC5 §29/§37 MONEY: zero-decimal trimming is VISUAL ONLY. Accounting
 * keeps the precise form; marketing cards drop ".00" exactly when paise
 * are zero and never round away real money.
 */

test("trimmed display drops .00 only when paise are exactly zero", () => {
  assert.equal(formatMinorTrimmed(8_500_000, "INR"), "₹85,000");
  assert.equal(formatMinorTrimmed(100_000_00, "INR"), "₹1,00,000");
  assert.equal(formatMinorTrimmed(1_000_000, "INR"), "₹10,000");
  assert.equal(formatMinorTrimmed(0, "INR"), "₹0");
});

test("nonzero paise stay visible in the trimmed display", () => {
  assert.equal(formatMinorTrimmed(10_000_050, "INR"), "₹1,00,000.50");
  assert.equal(formatMinorTrimmed(10_000_005, "INR"), "₹1,00,000.05");
});

test("accounting format is unchanged (always two decimals for INR)", () => {
  assert.equal(formatMinor(8_500_000, "INR"), "₹85,000.00");
  assert.equal(formatMinor(10_000_050, "INR"), "₹1,00,000.50");
});

/* --------------------------------------------------------------------------
 * RC5.1 WS5: the INR + USD registry.
 * ------------------------------------------------------------------------ */

test("USD uses US grouping and the $ symbol, never Indian digit groups", () => {
  assert.equal(formatMinor(10_000_000, "USD"), "$100,000.00");
  assert.equal(formatMinor(100_050, "USD"), "$1,000.50");
  assert.equal(formatMinor(1_000_000, "USD"), "$10,000.00");
  assert.ok(!formatMinor(10_000_000, "USD").includes("1,00,000"), "no lakh grouping for USD");
});

test("INR keeps Indian digit grouping and the rupee symbol", () => {
  assert.equal(formatMinor(10_000_000, "INR"), "₹1,00,000.00");
  assert.equal(formatMinor(10_000, "INR"), "₹100.00");
});

test("USD trimming mirrors INR trimming (zero cents trim, real cents stay)", () => {
  assert.equal(formatMinorTrimmed(10_000_000, "USD"), "$100,000");
  assert.equal(formatMinorTrimmed(100_050, "USD"), "$1,000.50");
  assert.equal(formatMinorTrimmed(0, "USD"), "$0");
});

test("major-unit display for form previews is locale-correct", () => {
  assert.equal(formatMajor(85_000, "INR"), "₹85,000");
  assert.equal(formatMajor(1_000, "USD"), "$1,000");
});

test("unknown currencies fail visibly (never silently assumed INR)", () => {
  assert.throws(() => toSupportedCurrency("EUR"), /unsupported currency/i);
  assert.throws(() => toSupportedCurrency(""), /unsupported currency/i);
  assert.throws(() => formatMinor(100, "JPY" as never), /unsupported currency/i);
  assert.throws(() => formatMinorTrimmed(100, "JPY" as never), /unsupported currency/i);
});

test("trimming never rounds away a paise", () => {
  // 1 paise must not disappear and must not become .01 rounding drift.
  assert.equal(formatMinorTrimmed(999_999_001, "INR"), "₹99,99,990.01");
});

/**
 * RC5 §9/§37 DESIGN: Bidthrone is dark-first. The boot script only
 * overrides the SSR default when a stored preference exists, and
 * readMode honours the fallback in server/SSR contexts.
 */

test("readMode returns the fallback on the server (no window)", () => {
  // In node there is no window: the fallback is the contract.
  assert.equal(readMode("dark"), "dark");
  assert.equal(readMode("light"), "light");
});

test("modeBootScript pins the product default and honours stored preference", () => {
  const darkBoot = modeBootScript("dark");
  // No stored value -> the fallback (dark for Bidthrone) is written.
  assert.ok(darkBoot.includes('"dark"'), "the fallback default is in the script");
  // A stored light value must beat the dark fallback.
  assert.ok(
    /localStorage\.getItem\("bidlol\.appearance"\)/.test(darkBoot) &&
      /(m==="dark"\|\|m==="light")/.test(darkBoot),
    "the script reads the stored preference and only accepts light/dark",
  );
  const lightBoot = modeBootScript("light");
  assert.notEqual(lightBoot, darkBoot, "the boot script differs per product default");
});

test("the boot script is safe to inline (no quotes/backticks leaking)", () => {
  for (const script of [modeBootScript("dark"), modeBootScript("light")]) {
    assert.ok(script.startsWith("try{"), "inline head script stays a single try expression");
    assert.ok(!script.includes("`"), "no template characters");
  }
});
