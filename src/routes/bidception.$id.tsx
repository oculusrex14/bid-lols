import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { formatMinor } from "@/lib/money";
import { getSession } from "@/lib/authz";
import {
  allocateChildWorkFn,
  childStateFn,
  activateParentWorkFn,
  settleParentWorkFn,
  publishParentWorkFn,
} from "@/lib/marketplace/bidception";

/**
 * /bidception/:id — the parent tree (Phase 03, FR-3/FR-4). The allocation
 * panel shows the live balance (funded - allocated - captain fee) and only the
 * sponsor/captain can act; every mutation goes through the row-locked engine.
 */
const loadDetail = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => z.object({ id: z.string().trim().min(4).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const session = await getSession();
    const row = (
      await sql.query<{
        id: string; title: string; objective: string; status: string;
        sponsor_user_id: string; captain_user_id: string | null;
        funded_budget_minor: number | null; captain_compensation_minor: number;
        currency: string; sponsor_name: string | null; captain_name: string | null;
      }>(
        `select pw.id, pw.title, pw.objective, pw.status, pw.sponsor_user_id, pw.captain_user_id,
                pw.funded_budget_minor, pw.captain_compensation_minor, pw.currency,
                su.display_name as sponsor_name, cu.display_name as captain_name
         from parent_works pw
         join users su on su.id = pw.sponsor_user_id
         left join users cu on cu.id = pw.captain_user_id
         where pw.id = $1`,
        [data.id],
      )
    )[0];
    if (!row) return null;
    const children = await sql.query<{
      id: string; title: string; state: string; allocated_minor: number; seq: number; depends_on: string[];
    }>(
      "select id, title, state, allocated_minor, seq, depends_on from child_works where parent_work_id = $1 order by seq",
      [data.id],
    );
    const allocated = children.reduce((t, c) => t + Number(c.allocated_minor), 0);
    const balance = Number(row.funded_budget_minor ?? 0) - allocated - Number(row.captain_compensation_minor);
    return {
      product: await currentProductKey(),
      parent: row,
      children,
      allocated,
      balance,
      viewerUserId: session?.user.id ?? null,
      emailVerified: session?.user.emailVerified ?? false,
    };
  });

export const Route = createFileRoute("/bidception/$id")({
  loader: (ctx) => loadDetail({ data: { id: ctx.params.id } }),
  component: BidceptionDetailPage,
});

function BidceptionDetailPage() {
  const data = Route.useLoaderData();
  if (!data) {
    return (
      <ProductShell site="foundersbid">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-display-site text-2xl tracking-tight">Parent work not found</h1>
          <Link to="/bidception" className="mt-4 inline-block text-sm underline underline-offset-2">← Back</Link>
        </div>
      </ProductShell>
    );
  }
  return <BidceptionDetailBody data={data} />;
}

function BidceptionDetailBody({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof loadDetail>>>;
}) {
  const p = data.parent;
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSponsor = p.sponsor_user_id === data.viewerUserId;
  const isCaptain = p.captain_user_id === data.viewerUserId && data.viewerUserId != null;
  const canAct = isSponsor || isCaptain;

  async function run(fn: () => Promise<{ ok: boolean; message?: string }>, okNote: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await fn();
      setMessage(r.ok ? okNote : r.message ?? "Something went wrong.");
      if (r.ok) {
        await new Promise((res) => setTimeout(res, 600));
        location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  const status = p.status;

  return (
    <ProductShell site={data.product}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Link to="/bidception" className="text-sm text-subtle underline underline-offset-2">← Parent work</Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">{status}</p>
            <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">{p.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{p.objective}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-subtle">Funded budget</p>
            <p className="font-display-site text-2xl tracking-tight text-accent">
              {p.funded_budget_minor != null ? formatMinor(Number(p.funded_budget_minor), p.currency) : "—"}
            </p>
          </div>
        </div>

        {message ? (
          <p role="status" aria-live="polite" className="mt-4 rounded-md border-2 border-fg/15 bg-surface p-3 text-sm" data-testid="action-message">{message}</p>
        ) : null}

        {/* Budget ledger — the invariant, made visible */}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border-2 border-fg/15 bg-surface p-3">
            <p className="text-xs uppercase tracking-kicker text-subtle">Allocated</p>
            <p className="mt-1 text-sm font-medium">{formatMinor(data.allocated, p.currency)}</p>
          </div>
          <div className="rounded-md border-2 border-fg/15 bg-surface p-3">
            <p className="text-xs uppercase tracking-kicker text-subtle">Captain fee</p>
            <p className="mt-1 text-sm font-medium">{formatMinor(Number(p.captain_compensation_minor), p.currency)}</p>
          </div>
          <div className="rounded-md border-2 border-fg/15 bg-surface p-3">
            <p className="text-xs uppercase tracking-kicker text-subtle">Available balance</p>
            <p className="mt-1 text-sm font-medium" data-testid="balance">{formatMinor(data.balance, p.currency)}</p>
          </div>
          <div className="rounded-md border-2 border-fg/15 bg-surface p-3">
            <p className="text-xs uppercase tracking-kicker text-subtle">Captain</p>
            <p className="mt-1 truncate text-sm font-medium">{p.captain_name ?? "not selected"}</p>
          </div>
        </div>

        {/* Sponsor/captain actions */}
        {canAct ? (
          <div className="mt-6 space-y-4">
            {status === "FUNDED" ? (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await run(() => activateParentWorkFn({ data: { parentWorkId: p.id } }), "Parent work activated — allocate the child units below.");
                }}
                className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
              >
                Activate (start allocating)
              </button>
            ) : null}

            {status === "ACTIVE" ? (
              <form
                className="grid gap-3 rounded-lg border-2 border-fg/20 bg-surface p-4 sm:grid-cols-4"
                data-testid="allocate-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  await run(
                    () =>
                      allocateChildWorkFn({
                        data: {
                          parentWorkId: p.id,
                          title: String(f.get("childTitle")),
                          allocatedRupees: Number(f.get("childRupees")),
                          dependsOnIds: String(f.get("dependsOn") ?? "")
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      }),
                    "Child unit allocated.",
                  );
                }}
              >
                <input name="childTitle" required minLength={3} maxLength={140} placeholder="Child unit title (e.g. Landing page)" className="rounded-md border-2 border-fg/20 bg-surface px-3 py-2 text-sm sm:col-span-2" />
                <input name="childRupees" type="number" required min={1} placeholder="₹ allocation" className="rounded-md border-2 border-fg/20 bg-surface px-3 py-2 text-sm" />
                <button type="submit" disabled={busy} className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-60">
                  Allocate
                </button>
              </form>
            ) : null}

            {status === "ACTIVE" || status === "COMPLETING" ? (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await run(
                    () => settleParentWorkFn({ data: { parentWorkId: p.id, action: "REFUND_RESERVE" } }),
                    "Settled — the remaining reserve was refunded (recorded in the money ledger).",
                  );
                }}
                className="text-sm font-medium underline underline-offset-2"
              >
                Settle & refund remaining reserve
              </button>
            ) : null}
          </div>
        ) : null}

        {/* The tree */}
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Child units ({data.children.length})</h2>
          {data.children.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No child units allocated yet.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {data.children.map((c, i) => (
                <li key={c.id} className="rounded-lg border-2 border-fg/15 bg-surface p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">#{i + 1} {c.title}</p>
                    <p className="text-sm">{formatMinor(c.allocated_minor, p.currency)} · <span className="text-subtle">{c.state}</span></p>
                  </div>
                  {c.depends_on.length > 0 ? (
                    <p className="mt-1 text-xs text-subtle">depends on: {c.depends_on.join(", ")}</p>
                  ) : null}
                  {canAct && c.state !== "COMPLETE" && c.state !== "FAILED" ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.state === "BLOCKED" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            await run(() => childStateFn({ data: { childWorkId: c.id, action: "mark_ready" } }), "Marked ready.");
                          }}
                          className="rounded border-2 border-fg/20 px-2 py-0.5 text-xs"
                        >
                          Mark ready
                        </button>
                      ) : null}
                      {c.state === "READY" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            await run(() => childStateFn({ data: { childWorkId: c.id, action: "activate" } }), "Child unit active.");
                          }}
                          className="rounded border-2 border-fg/20 px-2 py-0.5 text-xs"
                        >
                          Activate
                        </button>
                      ) : null}
                      {c.state === "ACTIVE" ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              await run(() => childStateFn({ data: { childWorkId: c.id, action: "complete" } }), "Child unit complete.");
                            }}
                            className="rounded border-2 border-up/40 px-2 py-0.5 text-xs"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              const reason = window.prompt("Why is this child failing?");
                              if (!reason) return;
                              await run(() => childStateFn({ data: { childWorkId: c.id, action: "fail", reason } }), "Child unit failed.");
                            }}
                            className="rounded border-2 border-danger/40 px-2 py-0.5 text-xs"
                          >
                            Fail
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        {isSponsor && status === "DRAFT" ? (
          <form
            className="mt-8 rounded-lg border-2 border-accent/40 bg-raised/40 p-4"
            data-testid="fund-parent"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await run(
                async () => {
                  const r = await publishParentWorkFn({
                    data: { parentWorkId: p.id, budgetRupees: Number(f.get("budgetRupees")) },
                  });
                  if (r.ok && "checkoutUrl" in r && r.checkoutUrl) {
                    location.assign(r.checkoutUrl);
                  }
                  return r;
                },
                "Funding checkout started — the parent activates once the payment verifies.",
              );
            }}
          >
            <p className="text-sm font-medium">Fund this parent work</p>
            <p className="mt-1 text-xs text-muted">
              Total funded budget (the pool from which the captain allocates child units and the fee). Fee is charged on top.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input name="budgetRupees" type="number" required min={1000} placeholder="₹ total budget" className="h-10 rounded-md border-2 border-fg/20 bg-surface px-3 text-sm outline-none focus:border-fg/60" />
              <button type="submit" disabled={busy} className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-60">
                Fund & publish
              </button>
            </div>
            {!data.emailVerified ? <p className="mt-2 text-xs text-muted">Email verification required for money-facing actions (admin can verify while mail delivery is unconfigured).</p> : null}
          </form>
        ) : null}
      </div>
    </ProductShell>
  );
}