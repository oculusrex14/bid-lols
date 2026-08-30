# RC5.2 — Multi-Currency Correctness Patch

Status: IN PROGRESS

Small corrective release on top of the RC5.1 runtime (`2de3489`). No
redesign, no new phase, no funding, no BI-1.0 constant changes.

## Findings from the RC5.1 audit — confirmed or disproven

| # | Finding | Verdict |
|---|---------|---------|
| 1 | Viewer country read from `x-vercel-sc` | **CONFIRMED — wrong header.** `x-vercel-sc` is the country of the EDGE that served the request (Vercel's server location), not the viewer's. Vercel's documented client-country header is `x-vercel-ip-country` ("two-character ISO 3166-1 country code for the country associated with the location of the requester's public IP address", vercel.com/docs/headers/request-headers; `COUNTRY_HEADER_NAME` in Vercel's own `packages/functions/src/headers.ts`). |
| 2 | One shared `100_000` minor bounty minimum for INR and USD | **CONFIRMED.** USD floor was effectively $1,000 — while the USD samples ($250–$1,000) showed postable-looking work below it. |
| 3 | No per-currency product policy; constants duplicated | **CONFIRMED.** Minimums lived in zod + client checks + copy independently. |
| 4 | Project/other minimums | **AUDITED.** Projects: budget range optional `min(0)`, proposal quote `min(1)` minor — no INR-derived floor, unchanged. Bidception parent: `1,000` major floor (₹1,000 = $1,000) — kept as a documented team-project scale, now policy-sourced + engine-enforced; child BOUNTYs additionally must meet the bounty floor in the parent currency (new engine guard — a child is a real bounty row). Graveyard: listings INR-only by construction (schema default), offers `min(1)` major — accurate, unchanged. |
| 5 | INR-only prose on currency-localized surfaces | **CONFIRMED.** (a) Bidception SEO description: "Every rupee reconciles to the parent budget" (public og/meta copy). (b) Bidception home how-it-works: hard-coded "example: ₹10,000 of a ₹1,00,000 project" rendered even on USD-localized pages. (c) Captain-fee / allocation form labels "(rupees)" on possibly-USD parents; (d) balance-error message with a literal ₹ symbol; (e) proposal quote label "Quote (₹)" on possibly-USD projects; (f) bounties browse "Min reward (₹)" on a mixed-currency list. |
| 6 | Misleading `*Rupees` identifiers | **CONFIRMED (category C).** `feeRupees`, `allocatedRupees` (bidception serverFn inputs + forms), `askingPriceRupees`/`reserveRupees`/`amountRupees` (graveyard), `quotedRupees` (project proposal form). Category A (kept): `inrRupees` inside Cashfree's INR-only gateway conversion, `rupees` inside the explicitly INR-native BI-1.0 `valueFactor`, blog prose in an Indian context, the "₹ Indian rupee (INR)" option label. No DB rename: all occurrences are API/type/form identifiers, zero column names. |
| 7 | Samples may violate postable-work rules | **CONFIRMED as a risk.** No test checked samples against the real minimums. |

## Acceptance criteria (this phase)

1. **Country detection** — deployed: `x-vercel-ip-country` `IN` → INR, any
   other/missing/malformed → USD; non-deployed: dev-only
   `DEFAULT_VIEWER_CURRENCY` override else USD. Tests pin the real
   contract (IN/US/GB/missing/lowercase+whitespace/malformed) AND a
   regression guard that `x-vercel-sc` alone has zero effect.
   Integration verification against real Vercel infrastructure is recorded
   in the release report (no India-origin claim unless one genuinely
   occurred).
2. **One authoritative policy** — `CURRENCY_MONEY_POLICY` in
   `src/lib/money.ts` (composed with `CURRENCY_CONFIG`, no duplicated
   scales/symbols): per-currency bounty floor + parent budget floor +
   helpers (`minBountyRewardMinor/Major`, `bountyFloorCopy`,
   `meetsBountyRewardFloor`, `minParentBudgetMajor`). Server validation
   (zod boundary + engine), client validation, form copy, sample tests all
   derive from it.
3. **Launch floors** — INR bounty ₹1,000 (100,000 paise); USD bounty $50
   (5,000 cents); boundary pairs pinned (999.99 reject / 1,000 accept;
   49.99 reject / 50 accept; unknown currency reject); CultureBid uses the
   same rule; no bypass via raw minor units (engine check).
4. **Copy** — no INR-only prose on currency-localized surfaces: SEO
   description neutral; how-it-works example rendered from the active
   sample tree; form labels use the record's/parent's currency; the
   balance error formats in the parent currency; the browse min-reward
   filter label is honest (raw minor units, no invented symbol).
5. **Identifiers** — category-C renames complete; no DB migration; all
   tests updated.
6. **Samples** — every bounty-shaped sample ≥ its currency's floor; both
   Bidception trees ≥ the parent budget floor AND reconcile exactly.
7. **Invariants (regressions)** — persisted records keep their currency
   under every viewer context; Market Rates stays partitioned
   (9 INR + 9 USD publishes nothing in either partition); BI-1.0 stays
   INR-native (a huge USD amount cannot move the score or volume);
   Cashfree still rejects USD before any provider request; the mobile
   header rule holds on all four brands at phone/tablet widths; Most
   Reliable copy stays Bayesian.
8. **Release** — exact-SHA preview verified; production from a clean
   detached worktree with Vercel metadata `gitCommitSha` exact and
   `gitDirty` absent; full smoke matrix; funding OFF; verification OFF.

## Migration

None expected: no DDL change in RC5.2. If the audit of a fix requires
schema work it must be additive/idempotent and gated like 0019/0020.
