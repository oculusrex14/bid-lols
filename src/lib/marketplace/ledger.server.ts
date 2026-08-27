import { getSql, type Sql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { splitSponsorCharge, platformFeeBps } from "@/lib/money";

/**
 * Money ledger services (Phase 01, FR-7). Append-only decomposition of every
 * money-state transition + payout obligations. Rules baked in here:
 *
 *  - The sponsor's charge is decomposed ONCE, server-side, at funding-order
 *    creation (reward + platform fee) and stored on the payments row's meta.
 *  - Settlement re-asserts that decomposition (sum == charge) before writing,
 *    claim-guards the payments flip, and appends REWARD + PLATFORM_FEE rows
 *    atomically — a concurrent webhook + client re-poll can never double-settle.
 *  - Payout obligations are created idempotently per award and are settled
 *    ONLY by a real payout rail. A PENDING obligation is an honest public
 *    liability, never a fabricated payment.
 */

export type MoneyEventType =
  | "REWARD"
  | "PLATFORM_FEE"
  | "TAX"
  | "PROCESSING"
  | "REFUND"
  | "PAYOUT_OBLIGATION"
  | "PAYOUT_SETTLED";

export type MoneyEntityType =
  | "BOUNTY"
  | "PROJECT"
  | "MILESTONE"
  | "AWARD"
  | "PAYOUT"
  | "REFUND"
  | "PARENT_WORK";

export type MoneyEventInput = {
  entityType: MoneyEntityType;
  entityId: string;
  type: MoneyEventType;
  amountMinor: number;
  currency?: string;
  provider?: string;
  providerRef?: string;
  paymentId?: string;
  actorUserId?: string | null;
  system?: "system" | "provider" | "admin";
  meta?: Record<string, unknown>;
};

/** Append one money event (must run inside the caller's transaction). */
export async function insertMoneyEvent(tx: Sql, ev: MoneyEventInput): Promise<string> {
  if (!Number.isInteger(ev.amountMinor)) {
    throw new Error(`money event: non-integer amount ${ev.amountMinor}`);
  }
  const id = makeId("mev_");
  await tx.query(
    `insert into money_events
      (id, entity_type, entity_id, type, amount_minor, currency, provider,
       provider_ref, payment_id, actor_user_id, system, meta)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
    [
      id,
      ev.entityType,
      ev.entityId,
      ev.type,
      ev.amountMinor,
      ev.currency ?? "INR",
      ev.provider ?? "cashfree",
      ev.providerRef ?? null,
      ev.paymentId ?? null,
      ev.actorUserId ?? null,
      ev.system ?? "system",
      JSON.stringify(ev.meta ?? {}),
    ],
  );
  return id;
}

/**
 * The funding-order decomposition (single server-side computation; the client
 * never supplies any part of it): reward stays the advertised amount, the fee
 * is charged to the sponsor on top.
 */
export function fundingDecomposition(rewardMinor: number): {
  rewardMinor: number;
  feeMinor: number;
  feeBps: number;
  sponsorSubtotal: number;
} {
  const split = splitSponsorCharge(rewardMinor, platformFeeBps());
  return {
    rewardMinor: split.reward,
    feeMinor: split.platformFee,
    feeBps: platformFeeBps(),
    sponsorSubtotal: split.sponsorSubtotal,
  };
}

/**
 * Settle a verified funding payment for a bounty: re-asserts the stored
 * decomposition, claim-guards the payments flip, appends REWARD + PLATFORM_FEE
 * events — atomically. Concurrent callers get "alreadyPaid".
 */
export async function settleFundingPayment(opts: {
  bountyId: string;
  paymentId: string;
  providerRef?: string;
  /** Entity label for the money_events rows (default BOUNTY; PARENT_WORK
   * for Bidception parent funding). */
  entityType?: "BOUNTY" | "PROJECT" | "PARENT_WORK";
  /** Authoritative provider re-check (runs INSIDE the claim). */
  reverify?: (providerOrderId: string | null) => Promise<boolean>;
}): Promise<
  "settled" | "alreadyPaid" | "notPaid" | "unknownPayment" | "decompositionMismatch"
> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const rows = await tx.query<{
      id: string;
      amount_cents: number;
      currency: string;
      status: string;
      provider_order_id: string | null;
      provider: string;
      meta: Record<string, unknown>;
    }>(
      "select id, amount_cents, currency, status, provider_order_id, provider, meta from payments where id = $1 for update",
      [opts.paymentId],
    );
    const pmt = rows[0];
    if (!pmt) return "unknownPayment";
    if (pmt.status === "paid") return "alreadyPaid";
    if (pmt.status !== "pending") return "notPaid";

    // Authoritative provider re-verification inside the claim. Settlement
    // NEVER trusts a caller that skips this: when no custom reverify is
    // supplied, default to the provider's own order-status API. This closes the
    // "client says paid" hole — the provider is the only source of truth.
    const reverifyFn =
      opts.reverify ??
      (async (providerOrderId: string | null): Promise<boolean> => {
        if (!providerOrderId) return false;
        const { getPaymentProvider } = await import("@/lib/payments/provider");
        return getPaymentProvider().isOrderPaid(providerOrderId);
      });
    {
      const paid = await reverifyFn(pmt.provider_order_id);
      if (!paid) return "notPaid";
    }

    // Re-assert the stored decomposition before writing ledger rows.
    const meta = (pmt.meta ?? {}) as { reward_minor?: number; platform_fee_minor?: number };
    const reward = Number(meta.reward_minor);
    const fee = Number(meta.platform_fee_minor);
    if (
      !Number.isInteger(reward) ||
      !Number.isInteger(fee) ||
      reward <= 0 ||
      reward + fee !== pmt.amount_cents
    ) {
      return "decompositionMismatch";
    }

    const claimed = await tx.query<{ id: string }>(
      "update payments set status='paid', paid_at=now(), updated_at=now() where id = $1 and status = 'pending' returning id",
      [opts.paymentId],
    );
    if (!claimed || claimed.length !== 1) return "alreadyPaid";

    await insertMoneyEvent(tx, {
      entityType: opts.entityType ?? "BOUNTY",
      entityId: opts.bountyId,
      type: "REWARD",
      amountMinor: reward,
      currency: pmt.currency,
      provider: pmt.provider,
      providerRef: opts.providerRef,
      paymentId: opts.paymentId,
    });
    await insertMoneyEvent(tx, {
      entityType: opts.entityType ?? "BOUNTY",
      entityId: opts.bountyId,
      type: "PLATFORM_FEE",
      amountMinor: fee,
      currency: pmt.currency,
      provider: pmt.provider,
      paymentId: opts.paymentId,
    });
    return "settled";
  });
}

/** Read the append-only ledger for an entity (oldest first). */
export async function moneyEventsFor(
  entityType: MoneyEntityType,
  entityId: string,
): Promise<Array<{ type: string; amount_minor: number; created_at: string }>> {
  const sql = await getSql();
  return sql.query(
    "select type, amount_minor, created_at from money_events where entity_type = $1 and entity_id = $2 order by created_at",
    [entityType, entityId],
  );
}

/**
 * Create payout obligations for awarded places — idempotent per award
 * (re-running after a partial failure fills only the missing ones).
 */
export async function createAwardObligations(opts: {
  awards: Array<{
    awardId: string;
    payeeUserId: string;
    amountMinor: number;
    currency: string;
  }>;
}): Promise<string[]> {
  const sql = await getSql();
  const created: string[] = [];
  await sql.transaction(async (tx) => {
    for (const a of opts.awards) {
      const existing = await tx.query<{ id: string }>(
        "select id from payout_obligations where award_id = $1",
        [a.awardId],
      );
      if (existing.length > 0) continue;
      const id = makeId("pob_");
      await tx.query(
        `insert into payout_obligations (id, award_id, payee_user_id, amount_minor, currency)
         values ($1,$2,$3,$4,$5)`,
        [id, a.awardId, a.payeeUserId, a.amountMinor, a.currency],
      );
      await tx.query(
        "update bounty_awards set status='OBLIGATION_CREATED', payout_obligation_id=$2 where id=$1",
        [a.awardId, id],
      );
      await insertMoneyEvent(tx, {
        entityType: "AWARD",
        entityId: a.awardId,
        type: "PAYOUT_OBLIGATION",
        amountMinor: a.amountMinor,
        currency: a.currency,
      });
      created.push(id);
    }
  });
  return created;
}