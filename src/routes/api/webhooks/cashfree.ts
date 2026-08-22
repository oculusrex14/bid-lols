import { createFileRoute } from "@tanstack/react-router";
import { confirmPayment } from "@/lib/board-fns";

export const Route = createFileRoute("/api/webhooks/cashfree")({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("invalid json", { status: 400 });
        }
        const data = (body.data ?? body) as Record<string, unknown>;
        const order =
          (data.order as Record<string, unknown> | undefined) ?? data;
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
        return Response.json({ ok: true });
      },
    },
  },
});
