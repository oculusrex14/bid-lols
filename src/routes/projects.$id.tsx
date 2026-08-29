import { useState } from "react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey, product as productInfo, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { entityRedirectFor } from "@/lib/marketplace/capabilities.server";
import { JsonLd } from "@/components/seo";
import { breadcrumbSchema } from "@/lib/schema";
import {
  publishProjectFn,
  submitProposalFn,
  selectProposalFn,
  fundProjectFn,
} from "@/lib/marketplace/projects";
import { formatMinor } from "@/lib/money";
import { statusLabel } from "@/lib/marketplace/status-labels";
import { deadlinePhrase, absoluteDate } from "@/lib/reltime";
import { StatusBadge } from "@/components/ui/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { StickyPanel } from "@/components/ui/market";
import { ProgressBar } from "@/components/ui/data";
import { InlineNotice } from "@/components/ui/states";

/**
 * /projects/:id — public project detail (Phase 01, FR-5; RC3, S-24).
 * 8/4: brief + proposals in the main column; the decision panel (budget,
 * stage, milestones, primary action) sticky on the right.
 */
type ProjectPublic = {
  id: string; product: string; title: string; slug: string; description: string; category: string;
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
      `select p.id, p.product, p.title, p.slug, p.description, p.status, p.currency,
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
    if (!project) throw notFound();
    const product = await currentProductKey();
    const entityUrl = entityRedirectFor(String(project.product), product, `/projects/${data.id}`);
    if (entityUrl) throw redirect({ to: entityUrl });
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
      me: (await (await import("@/lib/shell-context")).getShellContext()).me,
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
  return <ProjectDetailBody key={String(data.project.id)} data={data} />;
}

type Data = NonNullable<Awaited<ReturnType<typeof loadDetail>>>;

function ProjectDetailBody({ data }: { data: Data }) {
  const p = data.project;
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPropose, setShowPropose] = useState(false);

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

  const status = String(p.status);
  const origin = seoOrigin(data.product as ProductKey);
  const paidMilestones = data.milestones.filter((m) => m.status === "PAID_OUT").length;

  return (
    <ProductShell site={data.product as ProductKey} me={data.me}>
      <div className="canvas-wide pb-16">
        <nav aria-label="Breadcrumb" className="pt-6 text-sm text-subtle">
          <Link to="/" className="hover:underline hover:underline-offset-4">
            {productInfo(data.product as ProductKey).name}
          </Link>
          <span aria-hidden="true"> / </span>
          <Link to="/projects" className="hover:underline hover:underline-offset-4">
            Open projects
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-muted">{String(p.title).slice(0, 40)}{String(p.title).length > 40 ? "…" : ""}</span>
        </nav>

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-xs text-subtle">{String(p.category)}</span>
          </div>
          <h1 className="mt-2 max-w-3xl font-display-site text-3xl tracking-tight sm:text-4xl">{String(p.title)}</h1>
          <p className="mt-2 text-sm text-muted">
            Posted by {String(p.sponsor_company || p.sponsor_name || "a member")}
            {p.sponsor_handle ? ` (@${p.sponsor_handle})` : ""}
          </p>
        </header>

        {message ? (
          <InlineNotice className="mt-5">{message}</InlineNotice>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <section aria-labelledby="h-brief">
              <h2 id="h-brief" className="text-sm font-semibold uppercase tracking-kicker text-subtle">The brief</h2>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{String(p.description)}</p>
            </section>

            {data.proposals.length > 0 ? (
              <section className="mt-10">
                <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">Proposals ({data.proposals.length})</h2>
                <ul className="mt-4 space-y-4">
                  {data.proposals.map((pr) => (
                    <li key={pr.id} className="rounded-md border border-fg/10 bg-surface/60 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="tabular text-sm font-semibold">{formatMinor(Number(pr.quoted_minor))} · {pr.timeline_weeks ?? "?"} wk</p>
                        <p className="text-xs text-subtle">
                          {pr.display_name ?? "provider"}
                          {pr.handle ? ` (@${pr.handle})` : ""} · {statusLabel(pr.status)}
                        </p>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{pr.approach}</p>
                      {data.isSponsor && pr.status === "SUBMITTED" && status === "OPEN_FOR_PROPOSALS" ? (
                        <Button
                          size="sm"
                          className="mt-3"
                          disabled={busy}
                          onClick={async () => {
                            await run(() => selectProposalFn({ data: { projectId: String(p.id), proposalId: pr.id } }), "Proposal selected. Funding is next.");
                          }}
                        >
                          Select this provider
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {showPropose && !data.isSponsor ? <ProposalBox projectId={String(p.id)} onDone={(m) => { setMessage(m); setShowPropose(false); }} /> : null}
          </div>

          <div className="lg:col-span-4">
            <StickyPanel>
              <div className="rounded-md border border-fg/10 bg-surface/60 p-4">
                <p className="text-xs uppercase tracking-kicker text-subtle">Budget</p>
                <p className="tabular mt-1 text-xl font-semibold text-accent">
                  {p.selected_quoted_minor != null ? formatMinor(Number(p.selected_quoted_minor), String(p.currency)) : "Set by the selected proposal"}
                </p>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs uppercase tracking-kicker text-subtle">Stage</dt>
                    <dd className="font-medium">{statusLabel(status)}</dd>
                  </div>
                  {p.proposal_deadline ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs uppercase tracking-kicker text-subtle">Proposals due</dt>
                      <dd className="tabular" title={absoluteDate(String(p.proposal_deadline))}>{deadlinePhrase(String(p.proposal_deadline))}</dd>
                    </div>
                  ) : null}
                  {p.funding_payment_id ? (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs uppercase tracking-kicker text-subtle">Funding</dt>
                      <dd className="font-medium text-up">Funded</dd>
                    </div>
                  ) : null}
                </dl>

                {data.isSponsor && status === "DRAFT" ? (
                  <div className="mt-4 border-t border-fg/10 pt-4">
                    <p className="text-xs text-subtle">Draft. Open it for proposals when the brief is final.</p>
                    <Button
                      className="mt-2 w-full"
                      disabled={busy}
                      onClick={async () => {
                        await run(async () => publishProjectFn({ data: { projectId: String(p.id) } }), "Project is open for proposals.");
                      }}
                    >
                      Open for proposals
                    </Button>
                  </div>
                ) : null}

                {data.isSponsor && status === "PROPOSAL_SELECTED" ? (
                  <div className="mt-4 border-t border-fg/10 pt-4" data-testid="sponsor-fund">
                    <p className="text-xs text-subtle">
                      {data.milestones[0]
                        ? `Quoted ${formatMinor(Number(p.selected_quoted_minor))} across ${data.milestones.length} milestones.`
                        : "Funding starts the checkout."}
                    </p>
                    <Button
                      className="mt-2 w-full"
                      disabled={busy}
                      onClick={async () => {
                        await run(async () => fundProjectFn({ data: { projectId: String(p.id) } }), "Funding checkout started.");
                      }}
                    >
                      Fund project
                    </Button>
                  </div>
                ) : null}

                {!data.isSponsor && status === "OPEN_FOR_PROPOSALS" ? (
                  <div className="mt-4 border-t border-fg/10 pt-4">
                    {data.mine ? (
                      <p className="text-sm">Your proposal: {statusLabel(data.mine.status)}</p>
                    ) : (
                      <>
                        <Button className="mt-0 w-full" onClick={() => setShowPropose((v) => !v)}>
                          Submit a proposal
                        </Button>
                        <p className="mt-2 text-xs text-subtle">
                          Proposals describe approach + evidence + milestone plan. Never submit the finished work.
                        </p>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              {data.milestones.length > 0 ? (
                <div className="mt-4 rounded-md border border-fg/10 bg-surface/60 p-4" data-testid="milestones">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-sm font-semibold">Milestones</h2>
                    <span className="tabular text-xs text-subtle">{paidMilestones}/{data.milestones.length} paid</span>
                  </div>
                  <ProgressBar value={paidMilestones} max={data.milestones.length} className="mt-2" label="" />
                  <ul className="mt-3 space-y-2">
                    {data.milestones.map((m) => (
                      <li key={m.id} className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">
                          <span className="text-subtle">#{m.seq}</span> {m.title}
                        </span>
                        <span className="shrink-0">
                          <span className="tabular mr-2 font-medium">{formatMinor(Number(m.amount_minor), m.currency)}</span>
                          <StatusBadge status={m.status} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </StickyPanel>
          </div>
        </div>

        <JsonLd
          data={breadcrumbSchema(data.product as ProductKey, [
            { name: productInfo(data.product as ProductKey).name, url: origin },
            { name: "Open projects", url: `${origin}/projects` },
            { name: String(p.title), url: `${origin}/projects/${String(p.id)}` },
          ])}
        />
      </div>
    </ProductShell>
  );
}

function ProposalBox({ projectId, onDone }: { projectId: string; onDone: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-10 rounded-md border border-fg/10 bg-surface/60 p-4"
      data-testid="proposal-form"
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
      <h2 className="text-lg font-semibold tracking-tight">Your proposal</h2>
      <div className="mt-3 space-y-3">
        <Field label="Approach" required id="pr-approach">
          <Textarea id="pr-approach" name="approach" required minLength={20} maxLength={8000} rows={4} placeholder="How would you approach this?" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Quote (₹)" required id="pr-quote">
            <Input id="pr-quote" name="quotedRupees" type="number" required min={1} className="tabular" />
          </Field>
          <Field label="Timeline (weeks)" id="pr-timeline">
            <Input id="pr-timeline" name="timelineWeeks" type="number" min={1} max={52} className="tabular" />
          </Field>
        </div>
        <Field label="Relevant experience" id="pr-exp">
          <Textarea id="pr-exp" name="experience" rows={2} maxLength={4000} />
        </Field>
        <Field label="Milestones" hint="One per line: title and amount. EXAMPLE format, not real numbers: Design system + screens 15000 / Frontend build 25000 / QA handoff 5000.">
          <Textarea name="milestones" rows={4} placeholder={"Milestones, one per line (title + amount)"} className="mt-3 w-full rounded-sm border border-fg/20 bg-surface p-3 text-sm" />
        </Field>
      </div>
      <Button type="submit" loading={busy} className="mt-4">
        {busy ? "Sending…" : "Send proposal"}
      </Button>
    </form>
  );
}
