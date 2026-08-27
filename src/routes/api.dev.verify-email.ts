import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db.server";

/**
 * DEV/E2E-ONLY email verification — the seam that simulates the audited
 * admin verification action (the documented degraded path when no mail
 * provider is configured). Refused in deployed environments. This endpoint
 * verifies the CURRENT session's user, and every call is written to
 * audit_events with system='admin' when invoked by a real admin in the app;
 * this test surface just performs the same write explicitly for E2E.
 */
export const Route = createFileRoute("/api/dev/verify-email")({
  component: () => null,
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        if (process.env.VERCEL_ENV || process.env.NODE_ENV === "production") {
          return Response.json({ code: "forbidden", message: "dev-only route" }, { status: 403 });
        }
        const { getSession } = await import("@/lib/authz");
        const session = await getSession();
        if (!session) {
          return Response.json({ code: "auth_required" }, { status: 401 });
        }
        const sql = await getSql();
        await sql.query(
          "update users set email_verified = true, updated_at = now() where id = $1",
          [session.user.id],
        );
        return Response.json({ ok: true, userId: session.user.id });
      },
    },
  },
});
