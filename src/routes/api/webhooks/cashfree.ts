import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { verifyCashfreeWebhook } from "@/lib/payments/provider";

/**
 * Cashfree webhook — the ONLY settlement entry point (Phase 00, S-2).
 *
 * Fail-closed: missing/invalid signature, stale timestamp, or no configured
 * webhook secret -> 401, nothing settled. Only verified paid events reach
 * `settleOrder`, which re-verifies at the provider, claims atomically, and is
 * idempotent. Machine-readable envelope { code, message, requestId } on
 * errors (AC-18).
 */
export const Route = createFileRoute("/api/webhooks/cashfree")({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const requestId = randomUUID();
        const fail = (status: number, code: string, message: string) =>
          Response.json({ code, message, requestId }, {
            status,
            headers: { "x-request-id": requestId },
          });

        const rawBody = await request.text();
        const verified = verifyCashfreeWebhook({
          signature: request.headers.get("x-webhook-signature"),
          timestamp: request.headers.get("x-webhook-timestamp"),
          rawBody,
        });
        if (!verified) return fail(401, "invalid_signature", "Webhook signature verification failed.");

        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return fail(400, "invalid_json", "Body is not valid JSON.");
        }

        const type = String(body.type ?? body.event ?? "");
        const data = (body.data ?? body) as Record<string, unknown>;
        const order =
          (data.order as Record<string, unknown> | undefined) ?? data;
        const payment =
          (data.payment as Record<string, unknown> | undefined) ?? {};
        const status = String(
          payment.payment_status ?? order.order_status ?? body.order_status ?? "",
        ).toUpperCase();
        const paidEvent =
          type === "PAYMENT_SUCCESS" ||
          type === "ORDER_PAID" ||
          type === "order.paid" ||
          status === "SUCCESS" ||
          status === "PAID";
        if (!paidEvent) {
          // Phase 00.6, WS4-C: every JSON body carrying a requestId must carry
          // the SAME value in x-request-id (the outer request-id middleware
          // only keeps handler-set ids — it must not mint a second one).
          return Response.json(
            { ok: true, ignored: type || "unpaid_event", requestId },
            { status: 200, headers: { "x-request-id": requestId } },
          );
        }

        const orderId = String(order.order_id ?? order.orderId ?? body.order_id ?? "");
        if (!orderId) return fail(400, "missing_order_id", "Paid event has no order id.");

        // Server-only module (DB + provider access): the SSR guard keeps it
        // out of the client bundle; this handler never runs client-side.
        if (!import.meta.env.SSR) return fail(500, "internal_error", "Settlement is unavailable.");
        const { settleOrder } = await import("@/lib/settlement.server");
        const result = await settleOrder(orderId);
        if (result.ok) {
          return Response.json(
            { ok: true, orderId: result.orderId, alreadySettled: result.alreadySettled, requestId },
            { status: 200, headers: { "x-request-id": requestId } },
          );
        }
        const statusByCode = {
          order_not_found: 400,
          order_not_settlable: 409,
          not_paid_at_gateway: 409,
          effect_failed: 500,
        } as const;
        return fail(statusByCode[result.code], result.code, result.message);
      },
    },
  },
});
