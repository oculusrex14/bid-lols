import { createFileRoute } from "@tanstack/react-router";
import { confirmPayment } from "@/lib/board-fns";
import { verifyCashfreeWebhook } from "@/lib/cashfree";

export const Route = createFileRoute("/api/webhooks/cashfree")({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const rawBody = await request.text();
        const signed = verifyCashfreeWebhook({
          signature: request.headers.get("x-webhook-signature"),
          timestamp: request.headers.get("x-webhook-timestamp"),
          rawBody,
        });
        if (!signed) return new Response("invalid signature", { status: 401 });

        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return new Response("invalid json", { status: 400 });
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
        if (type && !paidEvent) {
          return Response.json({ ok: true, ignored: type });
        }

        const orderId = String(
          order.order_id ?? order.orderId ?? body.order_id ?? "",
        );
        if (!orderId) return new Response("missing order", { status: 400 });
        try {
          await confirmPayment({ data: { orderId } });
        } catch (err) {
          const message = err instanceof Error ? err.message : "settle failed";
          return Response.json({ ok: false, error: message }, { status: 409 });
        }
        return Response.json({ ok: true, gateway: "cashfree" });
      },
    },
  },
});
