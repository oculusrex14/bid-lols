# PAYOUTS.md — enabling live marketplace payouts

**Status (Phase 01):** NOT configured. `moneyMode()` is therefore `off` in production: the platform does NOT accept public bounty/project funding, and the funding UI says so honestly. This is a deliberate fail-safe (product rules 9/10): never take money the platform cannot safely pay out.

## What exists today

- **Collect rail:** Cashfree Payment Gateway (session-first order, server-side paid verification, HMAC webhook, replay window) — generalized in `src/lib/payments/provider.ts` (`CashfreeProvider`), INR-native.
- **Ledger:** `money_events` (append-only: REWARD / PLATFORM_FEE / TAX / PROCESSING / REFUND / PAYOUT_OBLIGATION / PAYOUT_SETTLED) + `payout_obligations` (created at award / approved milestone; settled only by a real rail).

## Exact setup required to flip to `live`

1. **Enable Cashfree Payouts** on the Cashfree account (separate product from the Payment Gateway; requires KYC/beneficiary onboarding on Cashfree's side).
2. Set env vars on the Vercel project:
   - `CASHFREE_PAYOUT_CLIENT_ID` / `CASHFREE_PAYOUT_CLIENT_SECRET` (Payouts API credentials — NOT the PG keys)
   - `MARKETPLACE_MONEY_LIVE=1`
   - verify `CASHFREE_MODE=production` + the PG credentials remain correct
3. Implement the `payout` method on `CashfreeProvider` (currently throws by design) against Cashfree Payouts v1: beneficiary creation, transfer, status polling — idempotent by our `pob_` id, provider ref immutable, double-settlement claim-guarded.
4. Set `hasPayoutRail()` semantics to also require a successful provider handshake (a real beneficiaries API ping at startup), not just env presence.
5. Re-run the full gates + a sandbox funding→payout round-trip before production.
6. Legal: finalize the marketplace drafts in `src/lib/legal.ts` with professional legal review (the current copy is an explicitly-labelled operational draft).

## Settlement path when live

award/milestone approved → `payout_obligations` row (PENDING) → provider payout executed → `PAYOUT_SETTLED` money_event + obligation `SETTLED` (provider ref immutable) → bounty/project SETTLING → COMPLETED → reviews open → reputation events flow.