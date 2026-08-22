import { createHmac, timingSafeEqual } from "node:crypto";

export type CashfreeSession = {
  live: boolean;
  mode: "sandbox" | "production";
  paymentSessionId: string;
  cfOrderId: string;
};

function envMode(): "sandbox" | "production" {
  return process.env.CASHFREE_MODE === "production" ? "production" : "sandbox";
}

export async function createCashfreeSession(opts: {
  orderId: string;
  amountCents: number;
}): Promise<CashfreeSession> {
  const clientId = process.env.CASHFREE_CLIENT_ID ?? process.env.CASHFREE_APP_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const mode = envMode();
  const fallback: CashfreeSession = {
    live: false,
    mode: "sandbox",
    paymentSessionId: `session_${opts.orderId}`,
    cfOrderId: opts.orderId,
  };
  if (!clientId || !clientSecret) return fallback;

  const host =
    mode === "production"
      ? "https://api.cashfree.com/pg/orders"
      : "https://sandbox.cashfree.com/pg/orders";
  try {
    const res = await fetch(host, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-version": "2025-01-01",
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
      },
      body: JSON.stringify({
        order_id: opts.orderId,
        order_amount: Number((opts.amountCents / 100).toFixed(2)),
        order_currency: "USD",
        customer_details: {
          customer_id: `anon_${opts.orderId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-40) || "guest"}`,
          customer_phone: "9999999999",
        },
        order_meta: {
          notify_url: process.env.CASHFREE_NOTIFY_URL || undefined,
        },
      }),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      payment_session_id?: string;
      order_id?: string;
    };
    return {
      live: Boolean(json.payment_session_id),
      mode,
      paymentSessionId: json.payment_session_id ?? fallback.paymentSessionId,
      cfOrderId: json.order_id ?? opts.orderId,
    };
  } catch {
    return fallback;
  }
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
