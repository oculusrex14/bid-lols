# 04_PAYMENTS_AND_TRUST.md — Payments & Trust

**Status:** Payment and trust contract for the Bid Network. The "current reality" section below was verified against the Phase 00 modules. **RC3 addendum (2026-08-28):** `src/lib/cashfree.ts` (Phase 00 rail) is consolidated into `src/lib/payments/provider.ts`, which is now the ONLY module defining credential lookup, API host, webhook signature verification, replay window (±15 min), and payment-status interpretation. Legacy order settlement of the four PENDING Phase 00 orders (docs/ops/LEGACY_ORDERS.md) is unchanged: the webhook route verifies via `verifyCashfreeWebhook` (provider module) and re-verifies the order at the gateway via `cashfreeOrderIsPaid` (provider module, delegating to `CashfreeProvider.isOrderPaid`). The Phase 00 `createCashfreeSession` rail (USD → INR FX at checkout) had zero consumers after order creation was removed in Phase 00 and was deleted; `src/lib/fx.ts` was likewise deleted in **RC5.1 (2026-08-30)** — it was a dead live-FX landmine (cached USD→INR quote with a silent fallback rate) and the RC5.1 currency law is NO FX (see the RC5.1 addendum below).

**RC5.1 addendum (2026-08-30) — currency foundation, INR + USD, no FX.** Three distinct concepts, never merged: (A) WORK CURRENCY — persisted on the work item (`bounties.currency`, `projects.currency`, `parent_works.currency`, child rows inherit the parent's), authoritative, follows the work; a viewer's region never changes it. (B) VIEWER DEFAULT CURRENCY — `src/lib/viewer-currency.server.ts` (deployed: trusted Vercel proxy header `x-vercel-ip-country`, the documented ISO country of the requester's PUBLIC IP — `IN` → INR, else/missing → USD; non-deployed: `DEFAULT_VIEWER_CURRENCY=INR|USD` override, else USD); used ONLY for sample objects, new-form defaults, and which Market Rates partition shows first — never payment authority. **RC5.2 correction:** RC5.1's first cut read `x-vercel-sc` (the country of the edge that served the request — Vercel's server location, not the viewer's); after verifying the contract against Vercel's docs (vercel.com/docs/headers/request-headers) and Vercel's own source (`COUNTRY_HEADER_NAME` in `packages/functions/src/headers.ts`), the resolver reads `x-vercel-ip-country`. (C) FX — does not exist: no live FX API, no cached rate, no converted payouts. Supported work currencies: INR and USD (registry in `src/lib/money.ts`: locale en-IN/en-US, 2 minor digits, symbols ₹/$; unknown codes fail visibly at every boundary — `toSupportedCurrency`, the zod `z.enum` on creation inputs, `marketRateFor`'s required currency argument). Cashfree remains INR-only: `ProviderCapabilities.currencies` declares it, and every funding entry point (`publishBountyForFunding`, `fundProject`, `publishParentForFunding`) fails BEFORE any state write or provider order via `unsupportedCollectionError` with code `unsupported_currency`. The fake test provider declares INR + USD so multi-currency ledger behavior is testable without money. Market Rates aggregates are currency-partitioned (`marketRateFor(product, category, currency, threshold)`; the SQL filters `currency = $requested`); `/market-rates?currency=INR|USD` is URL-addressable, unknown values normalize to the viewer default. **RC5.2 launch floors (one authoritative policy in `money.ts`, composed with the currency registry):** the minimum advertised BOUNTY reward is PER CURRENCY — ₹1,000 (100,000 paise) INR and $50 (5,000 cents) USD — enforced by the zod boundary AND the `createBounty` engine (no bypass path); CultureBid uses the same rule. The minimum funded Bidception PARENT budget is 1,000 MAJOR units in either currency (₹1,000 / $1,000 — a team-project scale, documented, not an FX value), enforced at the serverFn boundary and the engine; a child BOUNTY additionally must meet the bounty floor for the parent's currency (a child is a real bounty row). Projects, proposals, graveyard listings/offers (INR-only listings in this release) have no launch floor beyond non-negativity/positive values. These are product policy numbers per currency, not exchange-rate conversions.

## Current Provider Reality (verified)

**Provider & rail.** A single rail: Cashfree Payment Gateway, called with raw `fetch` against the REST API (no SDK). Auth is `x-client-id`/`x-client-secret`; `CASHFREE_MODE=production` targets `api.cashfree.com`, otherwise `sandbox.cashfree.com`. No refund/void/payout APIs are called anywhere today — "no refunds" is enforced by absence.

**Amounts.** The internal ledger is integer USD cents (`orders.amount_cents`, `listings.bid_cents`). All payable amounts are computed **server-side** (re-bid delta in `createBidOrder`; tiered swap fees via `quoteSwapFee` in `sites.ts`); the client never sets a charge. At checkout, `fx.ts` converts USD cents to INR using a live rate from `open.er-api.com` (15-minute in-process cache, optional `FX_MARKUP_PERCENT` capped at 25%, **silent fallback** to `INR_PER_USD` (default 85) when the fetch fails). The gateway is charged in INR major units (rupees), rounded by `Math.round` — the gateway amount and the FX source are recorded in the order's `payload` jsonb.

**Flow (session-first).** Order-creation server function → `createCashfreeSession` creates the gateway order **first** (local `ord_…` id is used as the Cashfree `order_id`; the gateway returns a `payment_session_id`; `notify_url` comes from `CASHFREE_NOTIFY_URL`; customer phone is a hardcoded dummy `9999999999`; customer email optional) → only then is the local `orders` row inserted with `status='pending'` and `payload` holding `paymentSessionId`, `cfOrderId`, `inrRupees`, `inrPerUsd`, `fxSource`. A gateway refusal leaves no local row (no orphans).

**Proof of payment.** `cashfreeOrderIsPaid(orderId)` polls `GET /pg/orders/{id}` up to 4 times with 350ms×n backoff and returns true only when the provider reports `order_status === "PAID"`. Settlement (`confirmPayment`, a server function) is reachable from the webhook **and** from the checkout page's client-side re-poll; it refuses to act unless that provider query returns PAID. A redirect back to `/checkout/$orderId` therefore proves nothing by itself.

**Settlement.** `confirmPayment`: loads the order; status `paid` → returns `alreadyPaid: true` (idempotent on repeat calls); non-`pending` status → reject; otherwise verify provider PAID, then apply the effect (bid/re-bid: upsert listing + rank recast + activity row; swap: URL change + `swap_count+1` + activity row; oracle: `crown_passes` insert with `on conflict (order_id) do nothing`) and finally `update orders set status='paid', paid_at=now()`.

**Webhook.** `POST /api/webhooks/cashfree`: HMAC-SHA256 over `timestamp + rawBody` (base64), compared with `timingSafeEqual`; key = `CASHFREE_WEBHOOK_SECRET`, **falling back to `CASHFREE_CLIENT_SECRET`, and returning `true` when neither is set** (fail-open). Paid event → `confirmPayment`; other events → `200 {ignored}`; missing order → 400; settlement error → 409. No timestamp freshness/replay check.

**Defects versus the target rules (each is a Phase 00/01 fix):**
1. **Fail-open webhook verification** — no secret ⇒ accept. Unacceptable; verification must fail closed.
2. **Client-secret fallback** as the webhook HMAC key conflates credentials; a dedicated `CASHFREE_WEBHOOK_SECRET` must be verified as set on Vercel (audit VERIFY item).
3. **No replay/expiry check** on the webhook `timestamp`.
4. **Settlement is not concurrency-safe**: the status guard and the effect are not atomic. Two concurrent settlements (webhook + client re-poll) can both pass the `pending` check: a re-bid re-applies the same values but inserts a duplicate `activity` row; a swap double-increments `swap_count` and can consume one of the capped swaps. Only the oracle path is guarded (`on conflict (order_id) do nothing`).
5. **Silent FX fallback** changes the amount the customer is charged when `open.er-api.com` is unreachable; the fallback must be visible, logged, and audited.
6. Gateway amounts are major units (rupees) while the ledger is minor units (cents); the exact gateway amount already stored in `payload` remains the audit of record.

## Target Rules (invariants)

- Monetary values stored internally in **integer minor units** only.
- **Explicit ISO-4217 currency** on every money column (default `INR` for the India-first launch; extensible without migration pain).
- **The server calculates every payable amount**; client-submitted values are treated as input to validate, never as authority.
- **Checkout redirects do not prove payment.** Payment is proven only by server-side provider verification (order-status API and/or verified webhook event).
- Webhooks are **cryptographically verified and fail closed**: missing secret, missing signature, or unverifiable signature ⇒ reject (401/403), log, and do not settle.
- Webhook processing is **idempotent**: dedupe on the provider's event/order id before settling; duplicate events must not duplicate settlements.
- **Provider order/payment IDs are stored** on the local ledger row (`provider`, `provider_order_id`), immutable once set, `unique`.
- **Every monetary state transition is auditable**: who/what/when/amount/result in an append-only audit trail (`audit_events`), plus the ledger row's own `created_at`/`paid_at`-style timestamps.
- **Refunds and disputes are explicit states** in the ledger, never implied by deleting rows or side notes.
- **No fabricated payment status**: any UI showing "paid", "settled", or equivalent must be backed by a verified provider state in the ledger.

## Bounty Money Model (direction — Phase 01+)

Seven distinct money quantities, never conflated:

| Term | Meaning | Direction |
|---|---|---|
| Sponsor charge | Total the sponsor pays to fund a bounty | Sponsor → platform |
| Platform fee | Transparent service fee, disclosed at creation | Sponsor → platform |
| Reward | Advertised to participants; paid on award | From funded pool → winner(s) |
| Taxes | Statutory amounts, shown explicitly at checkout | Sponsor → tax authority |
| Payment processing | Provider fees; attribution to payer is explicit | Sponsor or platform |
| Refund | Return of funds to the sponsor (pre-award, or on cancellation) | Platform → sponsor |
| Payout | Delivery of the reward to the winner | Platform → winner (separate provider rail — VERIFY support before claiming it) |

**No hidden deductions:** the advertised participant reward is exactly the payout amount. The platform fee is charged to the sponsor on top of (or disclosed before funding), never carved out of the advertised reward. The ledger decomposition (sponsor charge = reward + fee + taxes + processing, as applicable) must sum correctly and be visible to the sponsor.

## Provider Abstraction

`src/lib/payments/` exposes a provider-agnostic interface: `createOrder`, `getOrderStatus`, `verifyWebhook`, and — only where the provider actually supports it — `refund`/`payout`. Cashfree is the first implementation, generalized from the existing `cashfree.ts`; no provider SDK types may leak above the adapter. The abstraction claims **only collect-only capability today**: no escrow, no holds, no payout APIs — until a verified provider flow exists, those operations do not exist in the interface.

## Payment State Machine (direction)

Order (ledger row): `pending → paid` (provider-verified) | `pending → failed` | `pending → expired` (TTL sweep); `paid → refunded`; `paid → disputed → refunded | paid`. Bounty fund lifecycle: `pending_funding → funded → awarded → paid_out`; branches `pending_funding → cancelled` and `funded → refunded`/`disputed`. Settlement applies the effect and the status change **atomically** (claim-guard: `update … where status='pending'`, proceed only if exactly one row changed), so duplicate webhooks or re-polls can never double-settle.

## India-First (currently applicable, not hard-coded forever)

Today, India-first shows up concretely as: INR-only charging (USD→INR FX), Cashfree as the sole gateway, `en-IN` currency formatting (`formatInr`), and a dummy Indian phone number on gateway orders. These are **initial-market defaults, not invariants**: the `currency` column, per-market gateway selection, and a pluggable FX source keep the launch India-first while leaving USD/EUR (or a non-Cashfree provider) as configuration rather than a rewrite.


## RC4 terminology (binding)

**Bid Index** = the personal marketplace trust score (BI-1.0, 300-900, model-versioned; docs/BID_INDEX_METHODOLOGY.md). The aggregate pricing benchmark is **Market Rates** (/market-rates, code `marketRateFor`/`MARKET_RATE_MIN_SAMPLE`) and must never be called Bid Index again. Paid verification (future, behind TRUST_VERIFICATION_LIVE=0) earns zero Bid Index effect: payment alone is never evidence.
