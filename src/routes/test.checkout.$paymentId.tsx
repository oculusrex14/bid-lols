import { createFileRoute, redirect } from "@tanstack/react-router";
import { randomUUID } from "node:crypto";
import { getSql } from "@/lib/db.server";
import { verifyFundingAndOpen } from "@/lib/marketplace/bounties.server";

/**
 * TEST-ONLY checkout confirmation (the fake provider's "hosted page").
 *
 * Refused unconditionally in deployed environments; exists so the funding →
 * verify → publish path is exercised END-TO-END in dev/E2E without real
 * money. It simulates exactly what the production flow does: the provider
 * marks the order paid, the settlement service re-verifies at the provider,
 * claim-guards, and only then does the bounty open. It CANNOT be selected in
 * a runtime that isn't already on PAYMENT_PROVIDER=fake.
 */
export const Route = createFileRoute("/test/checkout/$paymentId")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ params }: { request: Request; params: { paymentId: string } }) => {
        if (process.env.VERCEL_ENV || process.env.NODE_ENV === "production") {
          return Response.json({ code: "forbidden", message: "test-only route" }, { status: 403 });
        }
        if (process.env.PAYMENT_PROVIDER !== "fake") {
          return Response.json(
            { code: "forbidden", message: "only available with the fake payment provider" },
            { status: 403 },
          );
        }
        const { getPaymentProvider } = await import("@/lib/payments/provider");
        const provider = getPaymentProvider() as unknown as {
          markPaid(id: string): void;
        };
        provider.markPaid(params.paymentId);
        const sql = await getSql();
        const payment = (
          await sql.query<{ meta: Record<string, unknown> }>(
            "select meta from payments where id = $1",
            [params.paymentId],
          )
        )[0];
        const meta = (payment?.meta ?? {}) as Record<string, string | undefined>;
        const ref = `test-${randomUUID()}`;
        if (meta.bounty_id) {
          const result = await verifyFundingAndOpen({
            bountyId: meta.bounty_id,
            paymentId: params.paymentId,
            providerRef: ref,
          });
          if (result === "opened") {
            throw redirect({ to: "/bounties/$id", params: { id: meta.bounty_id } });
          }
          return Response.json({ code: result }, { status: 409 });
        }
        if (meta.project_id) {
          const { verifyProjectFunding } = await import("@/lib/marketplace/projects.server");
          const result = await verifyProjectFunding({
            projectId: meta.project_id,
            paymentId: params.paymentId,
            providerRef: ref,
          });
          if (result === "active" || result === "alreadyActive") {
            throw redirect({ to: "/projects/$id", params: { id: meta.project_id } });
          }
          return Response.json({ code: result }, { status: 409 });
        }
        if (meta.parent_id) {
          const { verifyParentFunding } = await import("@/lib/marketplace/bidception.server");
          const result = await verifyParentFunding({
            parentWorkId: meta.parent_id,
            paymentId: params.paymentId,
            providerRef: ref,
          });
          if (result === "funded" || result === "alreadyFunded") {
            throw redirect({ to: "/bidception/$id", params: { id: meta.parent_id } });
          }
          return Response.json({ code: result }, { status: 409 });
        }
        return Response.json({ code: "unknown_entity", message: "Payment has no linked work entity." }, { status: 404 });
      },
    },
  },
});