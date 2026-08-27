import { test } from "node:test";
import assert from "node:assert/strict";
import { toCashfreeOrderAmount } from "../src/lib/payments/provider";
import { splitSponsorCharge, computeFee } from "../src/lib/money";

/**
 * RC1 R3 — Cashfree paise precision. The internal ledger is integer minor
 * units (paise); the Cashfree order amount is INR major units with two
 * decimals. The conversion must be EXACT: no rounding that drops paise.
 */

test("R3: whole-rupee reward converts exactly", () => {
  // ₹1,000 reward
  const { reward, platformFee, sponsorSubtotal } = splitSponsorCharge(100_000);
  assert.equal(reward, 100_000);
  assert.equal(platformFee, 10_000);
  assert.equal(sponsorSubtotal, 110_000);
  // provider amount must be exactly 1100.00
  assert.equal(toCashfreeOrderAmount(sponsorSubtotal), 1100);
});

test("R3: the regression case — ₹1,001 reward keeps its paise (₹1,101.10)", () => {
  const rewardMinor = 100_100; // ₹1,001.00
  const { reward, platformFee, sponsorSubtotal } = splitSponsorCharge(rewardMinor);
  assert.equal(reward, 100_100, "advertised reward unchanged");
  assert.equal(platformFee, 10_010, "10% fee = ₹100.10");
  assert.equal(sponsorSubtotal, 110_110, "subtotal = ₹1,101.10 in paise");
  // THE regression: old code did Math.round(110110/100)=1101; exact = 1101.1
  assert.equal(toCashfreeOrderAmount(sponsorSubtotal), 1101.1, "provider amount is exactly ₹1,101.10");
  assert.notEqual(Math.round(sponsorSubtotal / 100), 1101.1, "rounding would have lost the paise");
});

test("R3: odd minor-unit totals are preserved exactly", () => {
  for (const minor of [1_001, 99_999, 123_456, 3, 999]) {
    const expected = Number((minor / 100).toFixed(2));
    assert.equal(toCashfreeOrderAmount(minor), expected, `minor ${minor} exact`);
    // round-trip: converting back to minor units recovers the integer
    const backMinor = Math.round(toCashfreeOrderAmount(minor) * 100);
    assert.equal(backMinor, minor, `minor ${minor} round-trips`);
  }
});

test("R3: maximum allowed amount stays exact", () => {
  // the bounty zod cap is ₹1,000,000,000 (1e9 rupees) = 1e11 paise
  const maxMinor = 100_000_000_000;
  const expected = Number((maxMinor / 100).toFixed(2));
  assert.equal(toCashfreeOrderAmount(maxMinor), expected, "max amount exact");
});

test("R3: zero and negative are refused", () => {
  assert.throws(() => toCashfreeOrderAmount(0), /positive/i);
  assert.throws(() => toCashfreeOrderAmount(-500), /positive/i);
});

test("R3: non-integer minor units are refused", () => {
  assert.throws(() => toCashfreeOrderAmount(10.5), /integer/i);
});

test("R3: fee math stays integer throughout (no float paise)", () => {
  // a fee that would be fractional under a naive float approach
  const fee = computeFee(1_001, 1000); // 1001 paise * 10% = 100.1 paise -> rounds to 100
  assert.ok(Number.isInteger(fee));
  assert.equal(fee, 100, "round-half-up keeps paise integral");
});