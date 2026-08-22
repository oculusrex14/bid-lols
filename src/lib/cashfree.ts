import { createHmac, timingSafeEqual } from "node:crypto";

export type CashfreeSession = {
  live: boolean;
  mode: "sandbox" | "production";
  paymentSessionId: string;
  cfOrderId: string;
  /** Amount sent to Cashfree in INR major units (rupees). */
  inrRupees: number;
  inrPerUsd: number;
};

/** Board bids stay USD; Cashfree India collects INR until a global PG is wired. */
export function inrPerUsdRate() {
  const n = Number(process.env.INR_PER_USD || "85");
  return Number.isFinite(n) && n > 0 ? n : 85;
}

export function usdCentsToInrRupees(amountCents: number) {
  const dollars = Math.max(0, Number(amountCents) / 100);
  return Math.max(1, Math.round(dollars * inrPerUsdRate()));
}

function envMode(): "sandbox" | "production" {
  return process.env.CASHFREE_MODE === "production" ? "production" : "sandbox";
}

function credentials() {
  const clientId = process.env.CASHFREE_CLIENT_ID ?? process.env.CASHFREE_APP_ID;
  const clientSecret =
    process.env.CASHFREE_CLIENT_SECRET ?? process.env.CASHFREE_SECRET_KEY;
  if (!clientId || !clientSecret) {
    throw new Error("Cashfree keys are not configured. Live checkout cannot start.");
  }
  return { clientId, clientSecret };
}

function apiHost() {
  return envMode() === "production"
    ? "https://api.cashfree.com"
    : "https://sandbox.cashfree.com";
}

function authHeaders() {
  const { clientId, clientSecret } = credentials();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-version": "2025-01-01",
    "x-client-id": clientId,
    "x-client-secret": clientSecret,
  };
}

export async function createCashfreeSession(opts: {
  orderId: string;
  amountCents: number;
  email?: string;
  note?: string;
  returnUrl?: string;
}): Promise<CashfreeSession> {
  const mode = envMode();
  const customerId =
    `anon_${opts.orderId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-40)}` || "guest";
  const email = opts.email?.trim();
  const inrPerUsd = inrPerUsdRate();
  const inrRupees = usdCentsToInrRupees(opts.amountCents);
  const res = await fetch(`${apiHost()}/pg/orders`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      order_id: opts.orderId,
      order_amount: inrRupees,
      order_currency: "INR",
      order_note: opts.note || undefined,
      customer_details: {
        customer_id: customerId,
        customer_phone: "9999999999",
        ...(email ? { customer_email: email } : {}),
      },
      order_meta: {
        notify_url: process.env.CASHFREE_NOTIFY_URL || undefined,
        return_url: opts.returnUrl || undefined,
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    payment_session_id?: string;
    order_id?: string;
    message?: string;
    code?: string;
  };
  if (!res.ok || !json.payment_session_id) {
    throw new Error(
      json.message || json.code || `Cashfree refused the order (${res.status}).`,
    );
  }
  return {
    live: true,
    mode,
    paymentSessionId: json.payment_session_id,
    cfOrderId: json.order_id ?? opts.orderId,
    inrRupees,
    inrPerUsd,
  };
}

export async function cashfreeOrderIsPaid(orderId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(`${apiHost()}/pg/orders/${encodeURIComponent(orderId)}`, {
      headers: authHeaders(),
    });
    if (res.ok) {
      const json = (await res.json().catch(() => ({}))) as {
        order_status?: string;
      };
      if (String(json.order_status ?? "").toUpperCase() === "PAID") return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
  }
  return false;
}

export function verifyCashfreeWebhook(opts: {
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
}): boolean {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET ?? process.env.CASHFREE_CLIENT_SECRET;
  if (!secret) return true;
  if (!opts.signature || !opts.timestamp) return false;
  const expected = createHmac("sha256", secret)
    .update(opts.timestamp + opts.rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(opts.signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
