# LEGACY_ORDERS.md — Operational treatment of the four pending legacy Cashfree orders

**Status:** Operational runbook (Phase 00.5, AC-9.4). These orders are legacy
pay-to-rank charges from the retired board product; they remain `pending` in
`orders` and are **not** settled, refunded, or deleted by this phase.

## Posture (why they can only settle one way)

Since Phase 00, settlement is webhook-only and fail-closed:

- The ONLY settlement entry point is `POST /api/webhooks/cashfree` with a
  valid signature (`CASHFREE_WEBHOOK_SECRET`), a fresh timestamp (±15 min),
  and a verified paid order state at the provider
  (`src/lib/settlement.server.ts` → `settleOrder`).
- `settleOrder` claims atomically (`update orders … where status='pending'
  returning id` inside one transaction with the effects + `audit_events` row)
  and is idempotent — replays are safe.
- No order-creation UI or API exists anymore; the four orders cannot be
  created, re-tried, or manually flipped by any in-app path.

## Runbook

For each of the four `pending` orders (ids visible via a gated
`select id, site, kind, amount_cents, status, created_at from orders where
status = 'pending'`):

1. **Check the provider.** In the Cashfree dashboard (or via the Cashfree
   API with the configured credentials), look up the provider order
   (`provider_order_id` if present, else by amount/date/app).
   - **If the charge completed (PAID):** the customer paid for a product that
     no longer exists. Replay the signed paid-webhook payload for that order
     (Cashfree dashboard: resend the webhook for the order — the payload must
     carry a current timestamp and a valid signature). Settlement then runs
     through the normal, audited path: atomic claim, legacy effect, and an
     `audit_events` row mark the audit trail. No manual row edits.
   - **If the charge was abandoned/expired (not paid at the provider):**
     close/expire the order at the provider so it can never later complete.
     Leave the local row as-is (it stays `pending` forever, inert — it can
     never settle without a verified paid webhook, which a closed order will
     never produce). Record the closure in the order notes below.
2. **Never** settle, refund, or delete the local rows by hand:
   - settlement = webhook + provider re-verification only (money invariant);
   - refunds are a provider operation against a real charge, not a row edit;
   - deletion would destroy the audit trail for a paid order.
3. **No customer communication is triggered automatically.** If a paying
   customer later writes in (they have no account, so they contact us by
   email), answer from this record: charge state, whether settlement ran,
   and the refund question handled under the published Refund & payment
   policy ("past payments" section).

## Record

| order id | provider state | action taken | date |
|----------|----------------|--------------|------|
| (fill during first ops pass) | | | |

The table above is the standing record; keep it current whenever an order's
state changes.
