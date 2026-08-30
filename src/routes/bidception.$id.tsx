import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey, product as productInfo, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { JsonLd } from "@/components/seo";
import { breadcrumbSchema } from "@/lib/schema";
import { getSession } from "@/lib/authz";
import { entityRedirectFor } from "@/lib/marketplace/capabilities.server";
import {
  allocateChildWorkFn,
  childStateFn,
  activateParentWorkFn,
  settleParentWorkFn,
  publishParentWorkFn,
  selectCaptainFn,
  setCaptainFeeFn,
  eligibleCaptainsFn,
  type EligibleCaptain,
} from "@/lib/marketplace/bidception";
import { formatMinor } from "@/lib/money";
import { MoneyValue } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { Button } from "@/components/ui/button";
import { Field, Input, CheckRow } from "@/components/ui/field";
import { StickyPanel } from "@/components/ui/market";
import { InlineNotice } from "@/components/ui/states";
import { BudgetBar, Metric } from "@/components/ui/data";
import { BudgetTree } from "@/components/product-objects/budget-tree";
import { Avatar } from "@/components/ui/identity";

/**
 * /bidception/:id — the parent workspace (Phase 03, FR-3/FR-4; RC3, S-27).
 * Workspace morphology, not a detail card stack: the main column is the
 * work-unit tree (real dependency data only), the sticky panel reconciles
 * the budget (total = allocated + captain fee + available, from the ledger
 * fields) and holds the lifecycle + captain controls. Every mutation goes
 * through the row-locked engine; the UI never adds arithmetic of its own.
 */
const loadDetail = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => z.object({ id: z.string().trim().min(4).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const session = await getSession();
    const row = (
      await sql.query<{
        id: string; product: string; title: string; objective: string; status: string;
        sponsor_user_id: string; captain_user_id: string | null;
        funded_budget_minor: number | null; captain_compensation_minor: number;
        currency: string; sponsor_name: string | null; captain_name: string | null;
        sponsor_handle: string | null; captain_handle: string | null;
      }>(
        `select pw.id, pw.product, pw.title, pw.objective, pw.status, pw.sponsor_user_id, pw.captain_user_id,
                pw.funded_budget_minor, pw.captain_compensation_minor, pw.currency,
                su.display_name as sponsor_name, cu.display_name as captain_name,
                sp.handle as sponsor_handle, cp.handle as captain_handle
         from parent_works pw
         join users su on su.id = pw.sponsor_user_id
         left join users cu on cu.id = pw.captain_user_id
         left join profiles sp on sp.user_id = pw.sponsor_user_id
         left join profiles cp on cp.user_id = pw.captain_user_id
         where pw.id = $1`,
        [data.id],
      )
    )[0];
    if (!row) throw notFound();
    const product = await currentProductKey();
    const entityUrl = entityRedirectFor(String(row.product), product, `/bidception/${data.id}`);
    if (entityUrl) throw redirect({ to: entityUrl });
    const children = await sql.query<{
      id: string; title: string; state: string; allocated_minor: number; seq: number; depends_on: string[];
      kind: "BOUNTY" | "PROJECT" | null; bounty_id: string | null; project_id: string | null;
    }>(
      "select id, title, state, allocated_minor, seq, depends_on, kind, bounty_id, project_id from child_works where parent_work_id = $1 order by seq",
      [data.id],
    );
    const allocated = children.reduce((t, c) => t + Number(c.allocated_minor), 0);
    const balance = Number(row.funded_budget_minor ?? 0) - allocated - Number(row.captain_compensation_minor);
    const shellContext = await (await import("@/lib/shell-context")).getShellContext();
    return {
      product: await currentProductKey(),
      me: shellContext.me, funding: shellContext.funding,
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
  return <Workspace data={data} />;
}

type DetailData = NonNullable<Awaited<ReturnType<typeof loadDetail>>>;

/** Dependency depth from real depends_on rows (no invented graph). */
function levelOf(childId: string, all: DetailData["children"], depth = 0): number {
  const c = all.find((x) => x.id === childId);
  if (!c || c.depends_on.length === 0 || depth > 20) return 0;
  return 1 + Math.max(...c.depends_on.map((d) => levelOf(d, all, depth + 1)));
}

function Workspace({ data }: { data: DetailData }) {
  const p = data.parent;
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSponsor = p.sponsor_user_id === data.viewerUserId;
  const isCaptain = p.captain_user_id === data.viewerUserId && data.viewerUserId != null;
  const canAct = isSponsor || isCaptain;

  async function run(fn: () => Promise<{ ok: boolean; message?: string; checkoutUrl?: string }>, okNote: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await fn();
      if (r.ok && r.checkoutUrl) {
        window.location.assign(r.checkoutUrl);
        return;
      }
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
  const completeCount = data.children.filter((c) => c.state === "COMPLETE").length;

  return (
    <ProductShell site={data.product} me={data.me} funding={data.funding}>
      <div className="canvas-wide pb-16">
        <nav aria-label="Breadcrumb" className="pt-6 text-sm text-subtle">
          <Link to="/" className="hover:underline hover:underline-offset-4">{productInfo(data.product as ProductKey).name}</Link>
          <span aria-hidden="true"> / </span>
          <Link to="/bidception" className="hover:underline hover:underline-offset-4">Team projects</Link>
          <span aria-hidden="true"> / </span>
          <span className="text-muted">{p.title.slice(0, 40)}{p.title.length > 40 ? "…" : ""}</span>
        </nav>

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-xs text-subtle">
              Sponsor: {p.sponsor_name ?? "member"}{p.sponsor_handle ? ` (@${p.sponsor_handle})` : ""}
            </span>
          </div>
          <h1 className="mt-2 max-w-3xl font-display-site text-3xl tracking-tight sm:text-4xl">{p.title}</h1>
          {p.objective ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{p.objective}</p> : null}
        </header>

        {message ? (
          <div className="mt-5" data-testid="action-message">
            <InlineNotice>{message}</InlineNotice>
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Main: the allocation tree dominates; the work units below it
              keep every row-level control (RC5 §22.10). */}
          <div className="order-2 lg:order-1 lg:col-span-8">
            {p.funded_budget_minor != null && data.children.length > 0 ? (
              <BudgetTree
                className="mb-8"
                values={{
                  title: p.title,
                  currency: p.currency,
                  totalMinor: Number(p.funded_budget_minor),
                  captainLabel: "Captain",
                  captainMinor: Number(p.captain_compensation_minor),
                  children: data.children.map((c) => ({
                    key: c.id,
                    label: c.title,
                    minor: Number(c.allocated_minor),
                  })),
                  // reserve = funded - captain - allocations (data.balance);
                  // a negative value renders the honest non-reconciling line.
                  reserveMinor: data.balance,
                }}
              />
            ) : null}
            <ChildUnits data={data} canAct={canAct} busy={busy} onRun={run} />
            {canAct && status === "ACTIVE" ? (
              <AllocateForm parentId={p.id} children={data.children} busy={busy} onRun={run} />
            ) : null}
          </div>

          {/* Sidebar: budget + lifecycle + captain. */}
          <div className="order-1 lg:order-2 lg:col-span-4">
            <StickyPanel>
              <BudgetPanel data={data} completeCount={completeCount} />
              {canAct ? (
                <LifecycleActions data={data} status={status} busy={busy} onRun={run} />
              ) : null}
              {isSponsor ? (
                <CaptainPanel data={data} status={status} busy={busy} onRun={run} />
              ) : null}
            </StickyPanel>
          </div>
        </div>

        <JsonLd
          data={breadcrumbSchema(data.product as ProductKey, [
            { name: productInfo(data.product as ProductKey).name, url: seoOrigin(data.product as ProductKey) },
            { name: "Team projects", url: `${seoOrigin(data.product as ProductKey)}/bidception` },
            { name: p.title, url: `${seoOrigin(data.product as ProductKey)}/bidception/${p.id}` },
          ])}
        />
      </div>
    </ProductShell>
  );
}

/* ------------------------------------------------------------ BudgetPanel */

function BudgetPanel({ data, completeCount }: { data: DetailData; completeCount: number }) {
  const p = data.parent;
  const funded = p.funded_budget_minor;
  if (funded == null) {
    return (
      <div className="rounded-md border border-fg/10 bg-surface/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Budget</p>
        <p className="mt-2 text-sm text-muted">Not funded yet. The total appears here the moment the parent work is funded.</p>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-fg/10 bg-surface/60 p-4" data-testid="budget-panel">
      <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Budget</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <Metric label="Funded total" value={formatMinor(Number(funded), p.currency)} />
      </div>
      <div className="mt-3" data-testid="budget-bar">
        <BudgetBar
          totalMinor={Number(funded)}
          unallocatedLabel="Available"
          segments={[
            { key: "allocated", label: "Allocated to work units", minor: Number(data.allocated), fill: "bg-accent" },
            { key: "captain", label: "Captain fee", minor: Number(p.captain_compensation_minor), fill: "bg-accent/50" },
          ]}
        />
      </div>
      <dl className="mt-3 space-y-2 border-t border-fg/10 pt-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs uppercase tracking-kicker text-subtle">Available balance</dt>
          <dd className="tabular font-semibold" data-testid="balance">{formatMinor(data.balance, p.currency)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs uppercase tracking-kicker text-subtle">Work units</dt>
          <dd className="tabular" data-testid="work-progress">{completeCount}/{data.children.length} complete</dd>
        </div>
        <p className="text-xs leading-relaxed text-subtle">
          Allocations, the captain fee, and this balance always add up to the
          funded total. The engine refuses to allocate more than exists. No
          money has moved while funding is off; these are the ledger's
          current commitments.
        </p>
      </dl>
    </div>
  );
}

/* -------------------------------------------------------- LifecycleActions */

function LifecycleActions({
  data,
  status,
  busy,
  onRun,
}: {
  data: DetailData;
  status: string;
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string; checkoutUrl?: string }>, okNote: string) => Promise<void>;
}) {
  const isSponsor = data.parent.sponsor_user_id === data.viewerUserId;
  if (status === "DRAFT") {
    return isSponsor ? (
      <div className="mt-4 rounded-md border border-fg/10 bg-surface/60 p-4" data-testid="fund-parent">
        <p className="text-sm font-semibold">Fund this parent work</p>
        <p className="mt-1 text-xs text-muted">
          Set the total budget. The platform fee is charged on top. Funding is not enabled yet: the checkout will open once it is.
        </p>
        <FundForm parentId={data.parent.id} emailVerified={data.emailVerified} busy={busy} onRun={onRun} />
      </div>
    ) : null;
  }
  return (
    <div className="mt-4 rounded-md border border-fg/10 bg-surface/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Lifecycle</p>
      <div className="mt-3 space-y-2">
        {status === "AWAITING_FUNDING" ? (
          <p className="text-xs text-muted">Awaiting funding. The parent activates once the payment verifies.</p>
        ) : null}
        {status === "FUNDED" ? (
          <Button
            className="w-full"
            disabled={busy}
            onClick={() => void onRun(() => activateParentWorkFn({ data: { parentWorkId: data.parent.id } }), "Parent work activated. Allocate the child units below.")}
          >
            Activate (start allocating)
          </Button>
        ) : null}
        {(status === "ACTIVE" || status === "COMPLETING") ? (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={busy}
            onClick={() => void onRun(() => settleParentWorkFn({ data: { parentWorkId: data.parent.id, action: "REFUND_RESERVE" } }), "Settled. The remaining reserve was refunded (recorded in the money ledger).")}
          >
            Settle & refund remaining reserve
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function FundForm({
  parentId,
  emailVerified,
  busy,
  onRun,
}: {
  parentId: string;
  emailVerified: boolean;
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string; checkoutUrl?: string }>, okNote: string) => Promise<void>;
}) {
  return (
    <form
      className="mt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        await onRun(
          async () => {
            const r = await publishParentWorkFn({
              data: { parentWorkId: parentId, budgetRupees: Number(f.get("budgetRupees")) },
            });
            if (r.ok && "checkoutUrl" in r && r.checkoutUrl) {
              return { ok: true, checkoutUrl: r.checkoutUrl };
            }
            return r;
          },
          "Funding checkout started. The parent activates once the payment verifies.",
        );
      }}
    >
      <Field label="Total budget (rupees)" required id="bp-budget" hint="The pool the captain allocates from. The platform fee is charged on top.">
        <Input id="bp-budget" name="budgetRupees" type="number" required min={1000} className="tabular" />
      </Field>
      <Button type="submit" className="mt-3 w-full" loading={busy} disabled={!emailVerified}>
        Fund & publish
      </Button>
      {!emailVerified ? (
        <p className="mt-2 text-xs text-muted">
          Email verification is required for money-facing actions (admin can verify while mail delivery is unconfigured).
        </p>
      ) : null}
    </form>
  );
}

/* ------------------------------------------------------------ CaptainPanel */

function CaptainPanel({
  data,
  status,
  busy,
  onRun,
}: {
  data: DetailData;
  status: string;
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string; code?: string }>, okNote: string) => Promise<void>;
}) {
  const p = data.parent;
  const showPicker = (status === "FUNDED" || status === "ACTIVE") && !p.captain_user_id;
  return (
    <div className="mt-4 rounded-md border border-fg/10 bg-surface/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Captain</p>
      {p.captain_user_id ? (
        <div className="mt-3">
          <CaptainIdentity name={p.captain_name ?? "member"} handle={p.captain_handle} userId={p.captain_user_id} />
          <FeeForm parentId={p.id} currentFee={Number(p.captain_compensation_minor)} busy={busy} onRun={onRun} />
        </div>
      ) : showPicker ? (
        <CaptainPicker parentId={p.id} busy={busy} onRun={onRun} />
      ) : (
        <p className="mt-2 text-sm text-muted">
          {status === "FUNDED" || status === "ACTIVE" ? "No captain yet." : "A captain is chosen after the parent work is funded."}
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-subtle">
        The captain splits the budget into work packages and is paid for the coordination from the funded total.
      </p>
    </div>
  );
}

function CaptainIdentity({ name, handle, userId }: { name: string; handle: string | null; userId: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}{handle ? ` (@${handle})` : ""}</p>
        <p className="text-xs text-subtle">{userId === "" ? "" : "leading this project"}</p>
      </div>
    </div>
  );
}

function FeeForm({
  parentId,
  currentFee,
  busy,
  onRun,
}: {
  parentId: string;
  currentFee: number;
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string; code?: string }>, okNote: string) => Promise<void>;
}) {
  return (
    <form
      className="mt-3 flex items-end gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        await onRun(
          () => setCaptainFeeFn({ data: { parentWorkId: parentId, feeRupees: Number(f.get("feeRupees")) } }),
          "Captain fee saved. It is reserved from the funded budget.",
        );
      }}
    >
      <Field label="Captain fee (rupees)" id="cp-fee">
        <Input id="cp-fee" name="feeRupees" type="number" min={0} defaultValue={currentFee / 100} className="tabular w-36" />
      </Field>
      <Button type="submit" size="sm" disabled={busy}>
        Save fee
      </Button>
    </form>
  );
}

function CaptainPicker({
  parentId,
  busy,
  onRun,
}: {
  parentId: string;
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string; code?: string }>, okNote: string) => Promise<void>;
}) {
  const [items, setItems] = useState<EligibleCaptain[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eligibleCaptainsFn()
      .then((r) => {
        if (r.ok) setItems(r.items);
        else setError(r.message);
      })
      .catch(() => setError("Could not load eligible captains."));
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return items.slice(0, 8);
    return items.filter(
      (c) =>
        (c.displayName ?? "").toLowerCase().includes(needle) ||
        (c.handle ?? "").toLowerCase().includes(needle),
    );
  }, [items, q]);

  return (
    <div className="mt-3">
      <Field label="Search members" id="cp-search" hint="Members with a public profile or a verified outcome. Sorted by verified experience.">
        <Input id="cp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or @handle" />
      </Field>
      {error ? <InlineNotice className="mt-2" tone="down">{error}</InlineNotice> : null}
      {items === null ? (
        <p className="mt-2 text-xs text-subtle">Loading members…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-2 text-xs text-muted">
          No eligible captains yet. The list fills from real members as they set up public profiles or complete verified work.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {filtered.map((c) => (
            <li key={c.userId}>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void onRun(
                    () => selectCaptainFn({ data: { parentWorkId: parentId, captainUserId: c.userId } }),
                    `${c.displayName ?? c.handle} is now the captain.`,
                  )
                }
                className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors duration-150 hover:bg-raised/70 disabled:opacity-60"
              >
                <Avatar name={c.displayName ?? c.handle} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.displayName ?? c.handle}</span>
                  <span className="block text-xs text-subtle">
                    {c.handle ? `@${c.handle} · ` : ""}{c.experience} verified outcome{c.experience === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- ChildUnits */

function ChildUnits({
  data,
  canAct,
  busy,
  onRun,
}: {
  data: DetailData;
  canAct: boolean;
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string; code?: string }>, okNote: string) => Promise<void>;
}) {
  const all = data.children;
  const titleById = useMemo(() => new Map(all.map((c) => [c.id, c.title])), [all]);
  return (
    <section aria-label="Work units">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">Work units ({all.length})</h2>
        {all.length > 0 ? <span className="text-xs text-subtle">Dependencies come from the actual allocation records.</span> : null}
      </div>
      {all.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No work units yet. {canAct ? "Activate the parent to allocate the first one." : "The captain allocates them after activation."}
        </p>
      ) : (
        <ol className="mt-4">
          {all.map((c, i) => (
            <ChildRow
              key={c.id}
              c={c}
              i={i}
              all={all}
              titleById={titleById}
              currency={data.parent.currency}
              canAct={canAct && c.state !== "COMPLETE" && c.state !== "FAILED"}
              busy={busy}
              onRun={onRun}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function ChildRow({
  c,
  i,
  all,
  titleById,
  currency,
  canAct,
  busy,
  onRun,
}: {
  c: DetailData["children"][number];
  i: number;
  all: DetailData["children"];
  titleById: Map<string, string>;
  currency: string;
  canAct: boolean;
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string; code?: string }>, okNote: string) => Promise<void>;
}) {
  const level = levelOf(c.id, all);
  const depTitles = c.depends_on.map((d) => `#${(all.findIndex((x) => x.id === d) + 1) || "?"} ${titleById.get(d) ?? d}`);
  return (
    <li className="row-line py-3.5" style={{ paddingLeft: `${level * 1.25}rem` }} data-testid="child-unit">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-snug">
            <span className="mr-2 tabular text-xs text-subtle">#{i + 1}</span>
            {c.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={c.state} />
            {c.kind ? (
              <span className="rounded-full border border-fg/10 bg-raised/60 px-2 py-0.5 text-[11px] font-medium text-muted">
                {c.kind === "BOUNTY" ? "Bounty" : "Project"}
              </span>
            ) : null}
            {depTitles.length > 0 ? (
              <span className="text-xs text-subtle">after: {depTitles.join(", ")}</span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <MoneyValue minor={Number(c.allocated_minor)} currency={currency} />
          <p className="text-[11px] text-subtle">allocated</p>
        </div>
      </div>
      {canAct && c.state !== "COMPLETE" && c.state !== "FAILED" ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {c.state === "BLOCKED" ? (
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void onRun(() => childStateFn({ data: { childWorkId: c.id, action: "mark_ready" } }), "Marked ready.")}>
              Mark ready
            </Button>
          ) : null}
          {c.state === "READY" ? (
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void onRun(() => childStateFn({ data: { childWorkId: c.id, action: "activate" } }), "Child unit active.")}>
              Activate
            </Button>
          ) : null}
          {c.state === "ACTIVE" ? (
            <>
              <Button size="sm" disabled={busy} onClick={() => void onRun(() => childStateFn({ data: { childWorkId: c.id, action: "complete" } }), "Child unit complete.")}>
                Complete
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  const reason = window.prompt("Why is this child failing?");
                  if (!reason) return;
                  await onRun(() => childStateFn({ data: { childWorkId: c.id, action: "fail", reason } }), "Child unit failed.");
                }}
              >
                Fail
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------ AllocateForm */

function AllocateForm({
  parentId,
  children,
  busy,
  onRun,
}: {
  parentId: string;
  children: DetailData["children"];
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string; code?: string }>, okNote: string) => Promise<void>;
}) {
  const [kind, setKind] = useState<"BOUNTY" | "PROJECT">("BOUNTY");
  return (
    <form
      className="mt-8 border-t border-fg/10 pt-6"
      data-testid="allocate-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        // Users type unit numbers (1,2); the engine wants child ids.
        const seqToId = new Map<number, string>(children.map((c) => [c.seq, c.id]));
        const dependsOn = String(f.get("dependsOn") ?? "")
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && seqToId.has(n))
          .map((n) => seqToId.get(n) as string);
        const category = String(f.get("specCategory") || "development");
        const deadline = String(f.get("specDeadline") || "");
        const spec =
          kind === "BOUNTY"
            ? {
                category,
                submissionDeadline: deadline ? new Date(deadline).toISOString() : new Date(Date.now() + 14 * 86400_000).toISOString(),
                participantCap: f.get("specCap") ? Number(f.get("specCap")) : undefined,
              }
            : {
                category,
                proposalDeadline: deadline ? new Date(deadline).toISOString() : null,
              };
        await onRun(
          () =>
            allocateChildWorkFn({
              data: {
                parentWorkId: parentId,
                title: String(f.get("childTitle")),
                allocatedRupees: Number(f.get("childRupees")),
                kind,
                dependsOnIds: dependsOn,
                ...(kind === "BOUNTY" ? { bountySpec: spec } : { projectSpec: spec }),
              },
            }),
          "Work unit allocated.",
        );
      }}
    >
      <h2 className="text-lg font-semibold tracking-tight">Allocate a work unit</h2>
      <p className="mt-1 text-sm text-muted">One bounded piece of the parent project, funded from the remaining budget.</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CheckRow
          type="radio"
          name="alloc-kind"
          label="Bounty"
          description="Several qualified people compete; you pick the winner."
          checked={kind === "BOUNTY"}
          onChange={() => setKind("BOUNTY")}
        />
        <CheckRow
          type="radio"
          name="alloc-kind"
          label="Project"
          description="Providers propose; you select one before work begins."
          checked={kind === "PROJECT"}
          onChange={() => setKind("PROJECT")}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Title" required id="al-title">
          <Input id="al-title" name="childTitle" required minLength={3} maxLength={140} placeholder="Landing page" />
        </Field>
        <Field label="Allocation (rupees)" required id="al-amount" hint="From the available balance; the engine refuses more than exists.">
          <Input id="al-amount" name="childRupees" type="number" required min={1} className="tabular" />
        </Field>
      </div>
      {children.length > 0 ? (
        <Field label="Depends on" hint="Comma-separated unit numbers (e.g. 1,3). Leave empty if it can start immediately." id="al-deps">
          <Input id="al-deps" name="dependsOn" placeholder="1, 2" className="tabular" />
        </Field>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Category" id="al-cat">
          <Input id="al-cat" name="specCategory" defaultValue="development" maxLength={40} list="al-cat-list" />
          <datalist id="al-cat-list">
            {["development", "design", "marketing", "research", "content", "operations"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label={kind === "BOUNTY" ? "Submission deadline" : "Proposal deadline"} id="al-deadline">
          <Input id="al-deadline" name="specDeadline" type="datetime-local" />
        </Field>
        {kind === "BOUNTY" ? (
          <Field label="Participant cap" id="al-cap">
            <Input id="al-cap" name="specCap" type="number" min={1} max={200} defaultValue={5} className="tabular" />
          </Field>
        ) : null}
      </div>
      <Button type="submit" className="mt-4" loading={busy}>
        Allocate
      </Button>
    </form>
  );
}

