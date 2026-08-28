import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";

/**
 * Payment provider boundary (Phase 01, FR-7) — the ONLY money-movement surface
 * above raw provider APIs. Claims ONLY what the provider actually supports:
 * Cashfree is collect-only today (no escrow, no holds, no payout API in this
 * codebase). A payout/refund method exists on the interface only for the
 * providers that truly support it; the marketplace refuses to create funding
 * obligations it cannot settle (product rules 9/10).
 *
 * No provider types may leak above this module.
 */

export type ProviderCapabilities = {
  collect: boolean;
  refund: boolean;
  payout: boolean;
};

export type CreateOrderInput = {
  /** Our immutable ledger id — sent as the provider order id. */
  localOrderId: string;
  /** Integer minor units in `currency` (INR paise for the launch market). */
  amountMinor: number;
  currency: string;
  email?: string;
  note?: string;
  returnUrl?: string;
};

export type ProviderOrder = {
  provider: string;
  providerOrderId: string;
  paymentSessionId?: string;
  /** Amount charged at the gateway in MAJOR units (audit of record). */
  gatewayAmount: number;
  gatewayCurrency: string;
  checkoutUrl?: string;
  meta: Record<string, unknown>;
};

export type PayoutInput = {
  localPayoutId: string;
  amountMinor: number;
  currency: string;
  /** Provider-side beneficiary reference (verified by the provider). */
  beneficiaryRef: string;
  note?: string;
};

export type RefundInput = {
  providerOrderId: string;
  amountMinor: number;
  currency: string;
  reason?: string;
};

export interface PaymentProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  createOrder(input: CreateOrderInput): Promise<ProviderOrder>;
  /** Authoritative server-side status check (redirects never prove payment). */
  isOrderPaid(providerOrderId: string): Promise<boolean>;
  verifyWebhook(opts: {
    signature: string | null;
    timestamp: string | null;
    rawBody: string;
  }): boolean;
  /** Only meaningful when capabilities.payout — implementations throw otherwise. */
  payout?(input: PayoutInput): Promise<{ providerPayoutId: string; status: string }>;
  /** Only meaningful when capabilities.refund — implementations throw otherwise. */
  refund?(input: RefundInput): Promise<{ providerRefundId: string; status: string }>;
}

/* ------------------------------------------------------------------------- */
/* Cashfree collect implementation (INR-native; generalized from Phase 00's   */
/* session-first flow — same credential/secret/webhook discipline, no USD FX  */
/* layer: the marketplace ledger IS INR minor units).                         */
/* ------------------------------------------------------------------------- */

function cashfreeMode(): "sandbox" | "production" {
  return process.env.CASHFREE_MODE === "production" ? "production" : "sandbox";
}

function cashfreeCredentials() {
  const clientId = process.env.CASHFREE_CLIENT_ID ?? process.env.CASHFREE_APP_ID;
  const clientSecret =
    process.env.CASHFREE_CLIENT_SECRET ?? process.env.CASHFREE_SECRET_KEY;
  if (!clientId || !clientSecret) {
    throw new Error("Cashfree keys are not configured. Checkout cannot start.");
  }
  return { clientId, clientSecret };
}

function cashfreeHost(): string {
  return cashfreeMode() === "production"
    ? "https://api.cashfree.com"
    : "https://sandbox.cashfree.com";
}

function cashfreeAuthHeaders(): Record<string, string> {
  const { clientId, clientSecret } = cashfreeCredentials();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-version": "2025-01-01",
    "x-client-id": clientId,
    "x-client-secret": clientSecret,
  };
}

/**
 * Exact minor-unit (paise) → Cashfree order amount conversion.
 *
 * RC1: previously `Math.round(amountMinor / 100)` silently dropped paise
 * (₹1,101.10 became 1101). Cashfree INR order amounts support two decimal
 * places, so the conversion is exact: divide by 100 and keep both decimals.
 * Rejects zero/negative and non-integer amounts — the ledger is integer
 * minor units and the gateway must match it exactly.
 */
export function toCashfreeOrderAmount(amountMinor: number): number {
  if (!Number.isInteger(amountMinor)) {
    throw new Error(`cashfree order amount: not an integer minor-unit amount: ${amountMinor}`);
  }
  if (amountMinor <= 0) {
    throw new Error("cashfree order amount must be positive");
  }
  // toFixed(2) then Number: shortest round-trip of the exact 2-decimal value
  // (₹1101.10 → 1101.1, which serializes to the Cashfree API as 1101.10).
  return Number((amountMinor / 100).toFixed(2));
}

export class CashfreeProvider implements PaymentProvider {
  readonly name = "cashfree";
  readonly capabilities: ProviderCapabilities = {
    collect: true,
    // Honest capability report: neither rail is implemented/verified yet.
    refund: false,
    payout: false,
  };

  async createOrder(input: CreateOrderInput): Promise<ProviderOrder> {
    if (input.currency !== "INR") {
      throw new Error(`Cashfree provider supports INR only (got ${input.currency})`);
    }
    const inrRupees = toCashfreeOrderAmount(input.amountMinor);
    const customerId = `usr_${input.localOrderId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-40)}`;
    const res = await fetch(`${cashfreeHost()}/pg/orders`, {
      method: "POST",
      headers: cashfreeAuthHeaders(),
      body: JSON.stringify({
        order_id: input.localOrderId,
        order_amount: inrRupees,
        order_currency: "INR",
        order_note: input.note || undefined,
        customer_details: {
          customer_id: customerId,
          customer_phone: "9999999999",
          ...(input.email ? { customer_email: input.email } : {}),
        },
        order_meta: {
          notify_url: process.env.CASHFREE_NOTIFY_URL || undefined,
          return_url: input.returnUrl || undefined,
        },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      payment_session_id?: string;
      order_id?: string;
      checkout_url?: string;
      message?: string;
      code?: string;
    };
    if (!res.ok || !json.payment_session_id) {
      throw new Error(
        json.message || json.code || `Cashfree refused the order (${res.status}).`,
      );
    }
    return {
      provider: "cashfree",
      providerOrderId: json.order_id ?? input.localOrderId,
      paymentSessionId: json.payment_session_id,
      gatewayAmount: inrRupees,
      gatewayCurrency: "INR",
      checkoutUrl: json.checkout_url,
      meta: { mode: cashfreeMode() },
    };
  }

  async isOrderPaid(providerOrderId: string): Promise<boolean> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const res = await fetch(
        `${cashfreeHost()}/pg/orders/${encodeURIComponent(providerOrderId)}`,
        { headers: cashfreeAuthHeaders() },
      );
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as { order_status?: string };
        if (String(json.order_status ?? "").toUpperCase() === "PAID") return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
    return false;
  }

  verifyWebhook(opts: {
    signature: string | null;
    timestamp: string | null;
    rawBody: string;
  }): boolean {
    return verifyCashfreeWebhook(opts);
  }

  async payout(): Promise<{ providerPayoutId: string; status: string }> {
    throw new Error(
      "Cashfree Payouts are not configured/verified — payout is not available " +
        "(Phase 01 fail-safe: funding stays disabled until a payout rail exists).",
    );
  }

  async refund(): Promise<{ providerRefundId: string; status: string }> {
    throw new Error("Provider refund API is not configured (collect-only rail).");
  }
}

export const WEBHOOK_MAX_AGE_MS = 15 * 60 * 1000;

/**
 * RC3 (S-10.2): legacy-order re-verification, single source. Settlement of
 * the four PENDING Phase 00 orders (docs/ops/LEGACY_ORDERS.md) re-queries
 * the provider before claiming; this delegates to the provider class so
 * credential lookup, API host, retry shape and "PAID" interpretation exist
 * in exactly ONE place. (The Phase 00 session-creation rail that used the
 * USD FX layer had zero consumers after Phase 00 and was removed.)
 */
export async function cashfreeOrderIsPaid(orderId: string): Promise<boolean> {
  return new CashfreeProvider().isOrderPaid(orderId);
}

/**
 * Cashfree webhook signature verification — the ONLY implementation
 * (RC3, S-10.2 consolidated the Phase 00 rail into this module).
 * **Fails closed** — every misconfigured or unprovable case returns `false`:
 *
 *  - no dedicated `CASHFREE_WEBHOOK_SECRET` configured -> `false`
 *    (the Cashfree client secret is deliberately NOT a fallback: a leaked or
 *    rotated client secret must never be able to impersonate the webhook);
 *  - missing signature or timestamp -> `false`;
 *  - timestamp outside ±15 minutes of now -> `false` (replay window);
 *  - signature mismatch (constant-time compare) -> `false`.
 *
 * Signature scheme (unchanged since Phase 00): base64 HMAC-SHA256 over
 * `timestamp + rawBody`, keyed with the webhook secret.
 */
export function verifyCashfreeWebhook(opts: {
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
}): boolean {
  const secret = (process.env.CASHFREE_WEBHOOK_SECRET ?? "").trim();
  if (!secret) return false;
  if (!opts.signature || !opts.timestamp) return false;
  const ts = Number(opts.timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() - ts * 1000) > WEBHOOK_MAX_AGE_MS) return false;
  const expected = createHmac("sha256", secret)
    .update(opts.timestamp + opts.rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(opts.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------------- */
/* TEST-ONLY provider.                                                        */
/* Production can never select it (getPaymentProvider refuses it outside      */
/* explicitly non-production runtimes), and it exists so the funding/settlement */
/* machinery is exercised for real in CI without real money.                  */
/* ------------------------------------------------------------------------- */

/* ------------------------------------------------------------------------- */
/* Selection + money-live flag                                                */
/* ------------------------------------------------------------------------- */

export type MoneyMode = "off" | "sandbox" | "live";

/**
 * The single money-mode authority (FR-7):
 *  - `off` (default, and the shipped production state): NO real funding —
 *    the UI says so honestly and the funding endpoints refuse.
 *  - `sandbox`: Cashfree sandbox charges for development/E2E only.
 *  - `live`: requires ALL of MARKETPLACE_MONEY_LIVE=1, production Cashfree
 *    credentials, AND a verified payout rail (hasPayoutRail()). Cashfree
 *    Payouts is NOT configured yet, so `live` is unreachable in Phase 01 —
 *    by design: the platform must never take money it cannot safely pay out.
 */
export function moneyMode(env: NodeJS.ProcessEnv = process.env): MoneyMode {
  const flagOn = env.MARKETPLACE_MONEY_LIVE === "1";
  const payoutRail = hasPayoutRail(env);
  const deployed = Boolean(env.VERCEL_ENV) || env.NODE_ENV === "production";
  if (flagOn && payoutRail && cashfreeMode() === "production") return "live";
  // The fake provider charges nobody, ever — it is the E2E vehicle for the
  // funding machinery and is unreachable in deployed runtimes, so it may
  // enable the sandbox path regardless of Cashfree's configured mode.
  if (flagOn && env.PAYMENT_PROVIDER === "fake" && !deployed) return "sandbox";
  if (flagOn && cashfreeMode() === "sandbox" && !deployed) return "sandbox";
  return "off";
}

/**
 * Payout rail capability — TRUE only when real payout credentials exist.
 * Phase 01 ships with NO payout provider configured => false. Documented
 * setup (docs/ops/PAYOUTS.md): enable Cashfree Payouts, set
 * CASHFREE_PAYOUT_CLIENT_ID / CASHFREE_PAYOUT_CLIENT_SECRET.
 */
export function hasPayoutRail(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    (env.CASHFREE_PAYOUT_CLIENT_ID ?? "").trim() &&
      (env.CASHFREE_PAYOUT_CLIENT_SECRET ?? "").trim(),
  );
}

let fakeProviderSingleton: FakeProvider | null = null;

export function getPaymentProvider(env: NodeJS.ProcessEnv = process.env): PaymentProvider {
  const explicit = env.PAYMENT_PROVIDER;
  if (explicit === "fake") {
    // TEST-ONLY adapter: acceptable solely in explicit test runtimes; any
    // deployed environment (Vercel) refuses it unconditionally. One instance
    // per process — payment state (paid orders) must be shared by every
    // caller in the runtime, exactly like a real provider client would be.
    if (env.VERCEL_ENV || env.NODE_ENV === "production") {
      throw new Error("PAYMENT_PROVIDER=fake is test-only and may never run in a deployed environment.");
    }
    fakeProviderSingleton ??= new FakeProvider();
    return fakeProviderSingleton;
  }
  return new CashfreeProvider();
}

export function getTestPaymentProvider(): PaymentProvider {
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    throw new Error("The fake payment provider is test-only (got a deployed env).");
  }
  return new FakeProvider();
}

class FakeProvider implements PaymentProvider {
  readonly name = "fake";
  readonly capabilities: ProviderCapabilities = {
    collect: true,
    refund: true,
    payout: true,
  };
  readonly paidOrders = new Set<string>();

  async createOrder(input: CreateOrderInput): Promise<ProviderOrder> {
    return {
      provider: "fake",
      providerOrderId: input.localOrderId,
      paymentSessionId: `fake_ps_${randomUUID()}`,
      gatewayAmount: input.amountMinor / 100,
      gatewayCurrency: input.currency,
      checkoutUrl: `/test/checkout/${input.localOrderId}`,
      meta: { test: true },
    };
  }

  /** Test hook: what a verified webhook would prove. */
  markPaid(providerOrderId: string): void {
    this.paidOrders.add(providerOrderId);
  }

  async isOrderPaid(providerOrderId: string): Promise<boolean> {
    return this.paidOrders.has(providerOrderId);
  }

  verifyWebhook(): boolean {
    return true; // the fake provider has no secrets; production never uses it
  }

  async payout(input: PayoutInput) {
    return { providerPayoutId: `fake_po_${input.localPayoutId}`, status: "SUCCESS" };
  }

  async refund(input: RefundInput) {
    return { providerRefundId: `fake_rf_${input.providerOrderId}`, status: "SUCCESS" };
  }
}