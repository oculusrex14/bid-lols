import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import {
  publishProjectFn,
  submitProposalFn,
  selectProposalFn,
  decideMilestoneFn,
  submitMilestoneFn,
  projectFundingPlanFn,
  fundProjectFn,
} from "@/lib/marketplace/projects";
import { formatMinor } from "@/lib/money";

/**
 * /projects/:id — public project detail (Phase 01, FR-5). Sponsor publishes,
 * providers propose, sponsor selects one provider, funding follows,
 * milestones run.
 */
type ProjectPublic = {
  id: string; title: string; slug: string; description: string; category: string;
  status: string; currency: string; sponsor_user_id: string;
  selected_quoted_minor: number | null; funding_payment_id: string | null;
  proposal_deadline: string | null; published_at: string | null; created_at: string;
  sponsor_name: string | null; sponsor_handle: string | null; sponsor_company: string | null;
};

const loadDetail = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => z.object({ id: z.string().trim().min(4).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const { getSession } = await import("@/lib/authz");
    const session = await getSession();
    const rows = await sql.query<ProjectPublic>(
      `select p.id, p.title, p.slug, p.description, p.status, p.currency,
              p.sponsor_user_id, p.selected_quoted_minor, p.funding_payment_id,
              p.proposal_deadline, p.published_at, p.created_at,
              u.display_name as sponsor_name, pr.handle as sponsor_handle,
              pr.company_name as sponsor_company
       from projects p
       join users u on u.id = p.sponsor_user_id
       left join profiles pr on pr.user_id = p.sponsor_user_id
       where p.id = $1`,
      [data.id],
    );
    const project = rows[0];
    if (!project) return null;
    const proposals = session && project.sponsor_user_id === session.user.id
      ? await sql.query<{ id: string; approach: string; quoted_minor: number; timeline_weeks: number | null; status: string; milestones_proposed: Array<{ title: string; amountMinor: number }>; handle: string | null; display_name: string | null }>(
          `select pp.id, pp.approach, pp.quoted_minor, pp.timeline_weeks, pp.status,
                  pp.milestones_proposed, pr.handle, u.display_name
           from project_proposals pp
           join users u on u.id = pp.provider_user_id
           left join profiles pr on pr.user_id = pp.provider_user_id
           where pp.project_id = $1 order by pp.created_at asc`,
          [data.id],
        )
      : [];
    const milestones = await sql.query<{ id: string; seq: number; title: string; amount_minor: number; status: string; currency: string; due_at: string | null }>(
      "select id, seq, title, amount_minor, status, currency, due_at from project_milestones where project_id = $1 order by seq",
      [data.id],
    );
    const mine = session
      ? (await sql.query<{ id: string; status: string }>(
          "select id, status from project_proposals where project_id = $1 and provider_user_id = $2",
          [data.id, session.user.id],
        ))[0] ?? null
      : null;
    return {
      product: await currentProductKey(),
      project,
      proposals,
      milestones,
      emailVerified: session?.user.emailVerified ?? false,
      isSponsor: Boolean(session && project.sponsor_user_id === session.user.id),
      mine: mine,
    };
  });

export const Route = createFileRoute("/projects/$id")({
  loader: (ctx) => loadDetail({ data: { id: ctx.params.id } }),
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const data = Route.useLoaderData();
  if (!data) {
    return (
      <ProductShell site="foundersbid">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-display-site text-2xl tracking-tight">Project not found</h1>
          <Link to="/projects" className="mt-4 inline-block text-sm underline underline-offset-2">← Back to projects</Link>
        </div>
      </ProductShell>
    );
  }
  return <ProjectDetailBody key={String(data.project.id)} data={data} />;
}

type Data = NonNullable<Awaited<ReturnType<typeof loadDetail>>>;

function ProjectDetailBody({ data }: { data: Data }) {
  const p = data.project as Record<string, unknown>;
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPropose, setShowPropose] = useState(false);

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

  const status = String(p.status);

  return (
    <ProductShell site={data.product}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link to="/projects" className="text-sm text-subtle underline underline-offset-2">← All projects</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
              {String(p.category)} · {status}
            </p>
            <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">{String(p.title)}</h1>
          </div>
        </div>

        {message ? (
          <p role="status" aria-live="polite" className="mt-4 rounded-md border-2 border-fg/15 bg-surface p-3 text-sm">{message}</p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <section className="rounded-lg border-2 border-fg/15 bg-surface p-5">
              <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">The brief</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{String(p.description)}</p>
            </section>

            {data.proposals.length > 0 ? (
              <section className="mt-6 rounded-lg border-2 border-fg/15 bg-surface p-5">
                <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Proposals ({data.proposals.length})</h2>
                <ul className="mt-3 space-y-4">
                  {data.proposals.map((pr) => (
                    <li key={pr.id} className="rounded-md border-2 border-fg/10 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{formatMinor(Number(pr.quoted_minor))} · {pr.timeline_weeks ?? "?"} wk</p>
                        <p className="text-xs text-subtle">{pr.display_name ?? "provider"}{pr.handle ? ` (@${pr.handle})` : ""} · {pr.status}</p>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{pr.approach}</p>
                      {data.isSponsor && pr.status === "SUBMITTED" && status === "OPEN_FOR_PROPOSALS" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            await run(() => selectProposalFn({ data: { projectId: String(p.id), proposalId: pr.id } }), "Proposal selected — funding is next.");
                          }}
                          className="mt-2 inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-fg"
                        >
                          Select this provider
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="space-y-6">
            {data.isSponsor && status === "DRAFT" ? (
              <section className="rounded-lg border-2 border-accent/40 bg-raised/40 p-4">
                <p className="text-sm font-medium">Publish this project</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    await run(async () => publishProjectFn({ data: { projectId: String(p.id) } }), "Project is open for proposals.");
                  }}
                  className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
                >
                  Open for proposals
                </button>
              </section>
            ) : null}

            {data.isSponsor && status === "PROPOSAL_SELECTED" ? (
              <section className="rounded-lg border-2 border-accent/40 bg-raised/40 p-4" data-testid="sponsor-fund">
                <p className="text-sm font-medium">Fund the selected proposal</p>
                <p className="mt-1 text-sm text-muted">
                  {data.milestones[0] ? `Quoted: ${formatMinor(Number(p.selected_quoted_minor))} across ${data.milestones.length} milestones.` : ""}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    await run(
                      async () => {
                        const r = await fundProjectFn({ data: { projectId: String(p.id) } });
                        if (r.ok && r.checkoutUrl) window.location.assign(r.checkoutUrl);
                        return r;
                      },
                      "Funding checkout started.",
                    );
                  }}
                  className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
                >
                  Fund ({formatMinor(Number(p.selected_quoted_minor))} + fee)
                </button>
              </section>
            ) : null}

            {status === "ACTIVE" || data.milestones.length > 0 ? (
              <section className="rounded-lg border-2 border-fg/15 bg-surface p-5" data-testid="milestones">
                <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Milestones</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {data.milestones.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 rounded-md border-2 border-fg/10 p-2">
                      <span className="min-w-0">
                        <span className="text-subtle">#{m.seq}</span> {m.title}
                        <span className="ml-2 font-medium">{formatMinor(Number(m.amount_minor), m.currency)}</span>
                      </span>
                      <span className="text-xs text-subtle">{m.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {!data.isSponsor && status === "OPEN_FOR_PROPOSALS" ? (
              <section className="rounded-lg border-2 border-fg/15 bg-surface p-5">
                {data.proposals.length > 0 && data.milestones.length === 0 ? null : null}
                {data.mine ? (
                  <p className="text-sm">Your proposal: {data.mine.status}</p>
                ) : (
                  <>
                    <button
                      type="button"
                      className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
                      onClick={() => setShowPropose((v) => !v)}
                    >
                      Submit a proposal
                    </button>
                    <p className="mt-2 text-xs text-subtle">
                      Proposals describe approach + evidence + milestone plan. Never submit the finished work.
                    </p>
                  </>
                )}
              </section>
            ) : null}
          </div>
        </div>

        {showPropose && !data.isSponsor ? <ProposalBox projectId={String(p.id)} onDone={(m) => { setMessage(m); setShowPropose(false); }} /> : null}
      </div>
    </ProductShell>
  );
}

function ProposalBox({ projectId, onDone }: { projectId: string; onDone: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 rounded-lg border-2 border-fg/20 bg-surface p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const ms = String(f.get("milestones") ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
        const milestones = ms.map((l, i) => {
          const m = l.match(/^(.*?)[\s-]*₹?([\d,]+(?:\.\d+)?)$/);
          return m
            ? { title: m[1].trim().slice(0, 100), amountMinor: Math.round(Number(m[2]) * 100) }
            : { title: `Milestone ${i + 1}`, amountMinor: 0 };
        });
        setBusy(true);
        const r = await submitProposalFn({
          data: {
            projectId,
            approach: String(f.get("approach")),
            experience: String(f.get("experience") ?? ""),
            quotedMinor: Math.round(Number(f.get("quotedRupees")) * 100),
            timelineWeeks: f.get("timelineWeeks") ? Number(f.get("timelineWeeks")) : undefined,
            milestonesProposed: milestones,
            notes: String(f.get("notes") ?? ""),
          },
        });
        setBusy(false);
        onDone(r.ok ? "Proposal sent." : r.message);
      }}
    >
      <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Your proposal</h2>
      <textarea name="approach" required minLength={20} maxLength={8000} rows={4} placeholder="How would you approach this? (20–8000 chars)" className="mt-2 w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
      <input name="quotedRupees" type="number" required min={1} placeholder="Quote (₹)" className="mt-3 w-full rounded-md border-2 border-fg/20 bg-surface px-3 py-2.5 text-sm outline-none focus:border-fg/60" />
      <input name="timelineWeeks" type="number" min={1} max={52} placeholder="Timeline (weeks)" className="mt-3 w-full rounded-md border-2 border-fg/20 bg-surface px-3 py-2.5 text-sm outline-none focus:border-fg/60" />
      <textarea name="experience" rows={2} maxLength={4000} placeholder="Relevant experience" className="mt-3 w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
      <textarea name="milestones" rows={4} placeholder={"Milestones, one per line:\nDesign system + screens ₹15000\nFrontend build ₹25000\nQA handoff ₹5000"} className="mt-3 w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
      <button type="submit" disabled={busy} className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-60">
        {busy ? "Sending…" : "Send proposal"}
      </button>
    </form>
  );
}