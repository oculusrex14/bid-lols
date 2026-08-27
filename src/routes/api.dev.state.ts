import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db.server";

/**
 * DEV/E2E-ONLY state probe (read-only). Refused in deployed environments.
 * Used by tests to assert funding/ledger state without DB access to the
 * server's embedded PGLite.
 */
export const Route = createFileRoute("/api/dev/state")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        if (process.env.VERCEL_ENV || process.env.NODE_ENV === "production") {
          return Response.json({ code: "forbidden", message: "dev-only route" }, { status: 403 });
        }
        const bountyId = new URL(request.url).searchParams.get("bountyId");
        if (!bountyId) {
          return Response.json({ code: "missing_bounty" }, { status: 400 });
        }
        const sql = await getSql();
        const bounty = (
          await sql.query<{ status: string; funding_payment_id: string | null }>(
            "select status, funding_payment_id from bounties where id = $1",
            [bountyId],
          )
        )[0];
        const payments = await sql.query<{ id: string; status: string; amount_cents: number }>(
          "select id, status, amount_cents from payments order by created_at desc limit 10",
        );
        const events = await sql.query<{ entity_id: string; type: string; amount_minor: number }>(
          "select entity_id, type, amount_minor from money_events order by created_at asc",
        );
        // Dev diagnostics (no secret values — booleans/keys only).
        const envDebug = {
          flag: process.env.MARKETPLACE_MONEY_LIVE ?? null,
          provider: process.env.PAYMENT_PROVIDER ?? null,
          vercelEnv: process.env.VERCEL_ENV ?? null,
          nodeEnv: process.env.NODE_ENV ?? null,
          mode: (await import("@/lib/payments/provider")).moneyMode(),
          modeDebug: (() => {
            const flagOn = process.env.MARKETPLACE_MONEY_LIVE === "1";
            return {
              flagOn,
              cfm: process.env.CASHFREE_MODE === "production" ? "production" : "sandbox",
              flagRaw: JSON.stringify(process.env.MARKETPLACE_MONEY_LIVE ?? null),
            };
          })(),
        };
        return Response.json({ bounty, payments, events, env: envDebug });
      },
    },
  },
});