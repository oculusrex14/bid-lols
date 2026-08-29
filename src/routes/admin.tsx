import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { requireAdmin, getSession } from "@/lib/authz";
import { insertAudit, recentAudit } from "@/lib/audit.server";
import { transitionDispute, listOpenDisputes } from "@/lib/marketplace/disputes.server";
import {
  RESOLUTION_CODES,
  RESPONSIBILITIES,
  SEVERITY_CODES,
} from "@/lib/marketplace/dispute-vocab";

/**
 * /admin — the protected operational surface (Phase 01, FR-12). EVERY action
 * here is authorized server-side (admin role from the session, never client
 * input) and audited. noindex via middleware policy; never linked publicly.
 * The admin reads real state; there is no fabricated data anywhere here.
 */

const loadAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSession();
  if (!session) throw redirect({ to: "/signin" });
  if (session.user.role !== "admin") throw redirect({ to: "/dashboard" });
  const sql = await getSql();
  const [users, bounties, payments, obligations, disputes, auditTrail, stats] = await Promise.all([
    sql.query<{ id: string; email: string; display_name: string | null; status: string; role: string; email_verified: boolean; banned: boolean; created_at: string }>(
      "select id, email, display_name, role, email_verified, banned, status, display_name, created_at from users order by created_at desc limit 50",
    ),
    sql.query<{ id: string; title: string; status: string; reward_total_minor: number; currency: string; created_at: string }>(
      "select id, title, status, reward_total_minor, currency, created_at from bounties order by created_at desc limit 50",
    ),
    sql.query<{ id: string; kind: string; status: string; amount_cents: number; currency: string; created_at: string; product: string }>(
      "select id, kind, status, amount_cents, currency, product, created_at from payments order by created_at desc limit 50",
    ),
    sql.query<{ id: string; payee_user_id: string; amount_minor: number; currency: string; status: string; created_at: string }>(
      "select id, payee_user_id, amount_minor, currency, status, created_at from payout_obligations where status = 'PENDING' order by created_at asc limit 50",
    ),
    listOpenDisputes(20),
    recentAudit(50),
    sql.query<{ monevents: number; users_n: number; bounties_n: number }>(
      `select (select count(*)::int from money_events) as monevents,
              (select count(*)::int from users) as users_n,
              (select count(*)::int from bounties) as bounties_n`,
    ),
  ]);
  return { product: await currentProductKey(), me: (await (await import("@/lib/shell-context")).getShellContext()).me, users, bounties, payments, obligations, disputes, auditTrail, stats };
});

export const Route = createFileRoute("/admin")({
  loader: () => loadAdmin(),
  component: AdminPage,
});

/** Server-validated admin action handler: every write is audited. */
const adminAction = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        action: z.enum(["verify-email", "suspend", "reinstate", "resolve-dispute"]),
        userId: z.string().trim().min(4).max(64).optional(),
        disputeId: z.string().trim().min(4).max(64).optional(),
        resolution: z.string().trim().max(2000).optional(),
        resolutionCode: z.enum(RESOLUTION_CODES as unknown as [string, ...string[]]).optional(),
        responsibility: z.enum(RESPONSIBILITIES as unknown as [string, ...string[]]).optional(),
        severityCode: z.enum(SEVERITY_CODES as unknown as [string, ...string[]]).optional(),
      })
      .strict(),
  )
  .handler(
    async ({
      data,
    }): Promise<{ ok: true } | { ok: false; code: string; message: string }> => {
      try {
        const session = await requireAdmin();
        const sql = await getSql();
        if (data.action === "verify-email" && data.userId) {
          await sql.transaction(async (tx) => {
            await tx.query(
              "update users set email_verified = true, updated_at = now() where id = $1",
              [data.userId],
            );
            await insertAudit(tx, {
              actorUserId: session.user.id,
              action: "email_verified_manually",
              entityType: "USER",
              entityId: data.userId!,
            });
          });
          return { ok: true };
        }
        if (data.action === "suspend" && data.userId) {
          await sql.transaction(async (tx) => {
            await tx.query(
              "update users set status='suspended', banned=true, updated_at=now() where id=$1 and role <> 'admin'",
              [data.userId],
            );
            await insertAudit(tx, {
              actorUserId: session.user.id,
              action: "account_suspended",
              entityType: "USER",
              entityId: data.userId!,
              meta: { reason: data.resolution ?? "" },
            });
          });
          return { ok: true };
        }
        if (data.action === "reinstate" && data.userId) {
          await sql.transaction(async (tx) => {
            await tx.query(
              "update users set status='active', banned=false, updated_at=now() where id=$1",
              [data.userId],
            );
            await insertAudit(tx, {
              actorUserId: session.user.id,
              action: "account_reinstated",
              entityType: "USER",
              entityId: data.userId!,
            });
          });
          return { ok: true };
        }
        if (data.action === "resolve-dispute" && data.disputeId) {
          const result = await transitionDispute({
            disputeId: data.disputeId,
            nextStatus: "RESOLVED",
            resolution: data.resolution,
            resolutionCode: data.resolutionCode,
            responsibility: data.responsibility,
            severityCode: data.severityCode,
            adminUserId: session.user.id,
          });
          if (!result.ok) return result;
          await insertAudit(sql, {
            actorUserId: session.user.id,
            action: "dispute_resolved",
            entityType: "DISPUTE",
            entityId: data.disputeId,
            meta: {
              resolution: data.resolution ?? "",
              resolutionCode: data.resolutionCode ?? "",
              responsibility: data.responsibility ?? "",
              severityCode: data.severityCode ?? "",
            },
          });
          // RC4 §39: refresh the members' trust-event audit layer best-effort
          // (scores read dispute state directly, so this is bookkeeping).
          try {
            const { projectUserTrustEvents } = await import("@/lib/trust/projector.server");
            const d = (await sql.query<{ claimant_user_id: string; respondent_user_id: string }>(
              "select claimant_user_id, respondent_user_id from disputes where id = $1",
              [data.disputeId],
            ))[0];
            if (d) {
              await projectUserTrustEvents(d.claimant_user_id, { apply: true });
              await projectUserTrustEvents(d.respondent_user_id, { apply: true });
            }
          } catch {
            // never block the admin action on projection bookkeeping
          }
          return { ok: true };
        }
        return { ok: false, code: "invalid_action", message: "Unknown admin action." };
      } catch (err) {
        return { ok: false, code: "error", message: err instanceof Error ? err.message : "Admin action failed." };
      }
    },
  );

function AdminPage() {
  const d = Route.useLoaderData();
  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="canvas-app py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Admin</p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">Operations</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-4" data-testid="admin-stats">
          {[
            ["users", d.stats[0]?.users_n],
            ["bounties", d.stats[0]?.bounties_n],
            ["money events", d.stats[0]?.monevents],
            ["pending payouts", d.obligations.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border border-fg/15 bg-surface p-3">
              <p className="text-xs uppercase tracking-kicker text-subtle">{String(label)}</p>
              <p className="mt-1 font-display-site text-xl tracking-tight">{Number(value ?? 0)}</p>
            </div>
          ))}
        </div>

        <AdminUsers
          users={d.users}
          onAction={async (action, userId) => {
            await adminAction({ data: { action, userId } });
            location.reload();
          }}
        />
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Disputes</h2>
          {d.disputes.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No open disputes.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {d.disputes.map((dispute) => (
                <li key={String(dispute.id)} className="rounded-md border border-fg/15 bg-surface p-3 text-sm">
                  <p className="font-medium">
                    {String(dispute.work_type)} · {String(dispute.status)} · claimant {String(dispute.claimant_email ?? dispute.claimant_user_id)}
                  </p>
                  <p className="mt-1 text-muted">{String(dispute.reason).slice(0, 300)}</p>
                  <form
                    className="mt-2 flex flex-wrap gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      await adminAction({
                        data: {
                          action: "resolve-dispute",
                          disputeId: String(dispute.id),
                          resolution: String(f.get("resolution") ?? ""),
                        },
                      });
                      location.reload();
                    }}
                  >
                    <input name="resolution" placeholder="Resolution note (audited)" className="h-8 rounded-sm border border-fg/20 bg-surface px-2 text-xs transition-colors duration-150 focus:border-fg/50" />
                    <select name="resolutionCode" aria-label="Resolution code" className="h-8 rounded-sm border border-fg/20 bg-surface px-1 text-xs">
                      <option value="">code…</option>
                      {RESOLUTION_CODES.map((c) => (
                        <option key={c} value={c}>{c.replace(/_/g, " ").toLowerCase()}</option>
                      ))}
                    </select>
                    <select name="responsibility" aria-label="Responsibility" className="h-8 rounded-sm border border-fg/20 bg-surface px-1 text-xs">
                      <option value="">responsibility…</option>
                      {RESPONSIBILITIES.map((c) => (
                        <option key={c} value={c}>{c.toLowerCase()}</option>
                      ))}
                    </select>
                    <select name="severityCode" aria-label="Severity code" className="h-8 rounded-sm border border-fg/20 bg-surface px-1 text-xs">
                      <option value="">severity…</option>
                      {SEVERITY_CODES.map((c) => (
                        <option key={c} value={c}>{c.replace(/_/g, " ").toLowerCase()}</option>
                      ))}
                    </select>
                    <button className="inline-flex h-7 items-center rounded-sm border border-fg/25 px-2 text-xs font-medium transition-colors duration-150 hover:border-fg/50">Resolve</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Payments</h2>
          <div className="mt-3 overflow-x-auto rounded-md border border-fg/15">
            <table className="w-full text-sm">
              <thead className="bg-raised/50 text-left text-xs uppercase tracking-kicker text-subtle">
                <tr><th className="p-2">Product</th><th className="p-2">Kind</th><th className="p-2">Status</th><th className="p-2">Amount</th><th className="p-2">Created</th></tr>
              </thead>
              <tbody>
                {d.payments.map((p) => (
                  <tr key={p.id} className="border-t border-fg/10">
                    <td className="p-2">{p.product}</td><td className="p-2">{p.kind}</td><td className="p-2">{p.status}</td>
                    <td className="p-2">{(Number(p.amount_cents) / 100).toLocaleString("en-IN", { style: "currency", currency: p.currency })}</td>
                    <td className="p-2">{String(p.created_at).slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.payments.length === 0 ? <p className="mt-2 text-sm text-muted">No payments yet (funding not live).</p> : null}
        </section>

        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Audit trail</h2>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {d.auditTrail.map((a) => (
              <li key={String(a.id)}>
                {String(a.created_at).slice(0, 19)} · {String(a.action)} · {String(a.entity_type)}/{String(a.entity_id).slice(0, 18)} · {String(a.actor_email ?? "system")}
              </li>
            ))}
            {d.auditTrail.length === 0 ? <li>Nothing yet.</li> : null}
          </ul>
        </section>
      </div>
    </ProductShell>
  );
}

/** User management (RC3 split): the actions remain the audited serverFn; */
/** the table renders rows and delegates the action upward. */
function AdminUsers({
  users,
  onAction,
}: {
  users: Awaited<ReturnType<typeof loadAdmin>>["users"];
  onAction: (action: "verify-email" | "reinstate" | "suspend", userId: string) => Promise<unknown>;
}) {
  return (

        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Users</h2>
          <div className="mt-3 overflow-x-auto rounded-md border border-fg/15">
            <table className="w-full text-sm" data-testid="admin-users">
              <thead className="bg-raised/50 text-left text-xs uppercase tracking-kicker text-subtle">
                <tr>
                  <th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Email verified</th><th className="p-2">Status</th><th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: typeof users[number]) => (
                  <tr key={u.id} className="border-t border-fg/10">
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.role}</td>
                    <td className="p-2">{u.email_verified ? "yes" : "no"}</td>
                    <td className="p-2">{u.banned || u.status === "suspended" ? "suspended" : u.status}</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        {!u.email_verified ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              await onAction("verify-email", u.id);
                              location.reload();
                            }}
                          >
                            <button className="rounded border border-fg/20 px-2 py-0.5 text-xs">Verify email</button>
                          </form>
                        ) : null}
                        {u.banned || u.status === "suspended" ? (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              await onAction("reinstate", u.id);
                              location.reload();
                            }}
                          >
                            <button className="px-2 py-0.5 text-xs underline underline-offset-2">Reinstate</button>
                          </form>
                        ) : (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              await onAction("suspend", u.id);
                              location.reload();
                            }}
                          >
                            <button className="px-2 py-0.5 text-xs text-danger underline underline-offset-2">Suspend</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
  );
}