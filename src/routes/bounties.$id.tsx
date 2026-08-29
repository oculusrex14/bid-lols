import { useState } from "react";
import { createFileRoute, Link, useNavigate, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey, product as productInfo, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { getBountyDetail, listApplicationsForSponsor } from "@/lib/marketplace/queries.server";
import { JsonLd } from "@/components/seo";
import { breadcrumbSchema } from "@/lib/schema";
import {
  applyToBountyFn,
  startWorkFn,
  submitWorkFn,
  publishBountyFn,
  cancelBountyFn,
  withdrawApplicationFn,
} from "@/lib/marketplace/bounties";
import { getSession } from "@/lib/authz";
import { entityRedirectFor } from "@/lib/marketplace/capabilities.server";
import { statusLabel } from "@/lib/marketplace/status-labels";
import { deadlinePhrase, absoluteDate } from "@/lib/reltime";
import { formatMinor } from "@/lib/money";
import { MoneyValue } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { StickyPanel } from "@/components/ui/market";
import { InlineNotice } from "@/components/ui/states";
import { ReviewBox } from "@/components/ui/review";

/**
 * /bounties/:id — public bounty detail (Phase 01, FR-3/FR-4; RC3, S-24).
 * 8/4 morphology: decision-critical data in a sticky panel, the work itself
 * in the main column. Authority-gated actions render from the
 * server-resolved viewer context; every action goes back through the engine.
 */
const loadDetail = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => z.object({ id: z.string().trim().min(4).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const session = await getSession();
    const detail = await getBountyDetail(sql, data.id, session?.user.id ?? null);
    if (!detail) throw notFound();
    // Entity-aware capability redirect (RC1, R4): a bounty belongs to the
    // product that hosts it; the wrong host 301s to its origin.
    const product = await currentProductKey();
    const me = (await (await import("@/lib/shell-context")).getShellContext()).me;
    const entityUrl = entityRedirectFor(detail.bounty.product, product, `/bounties/${data.id}`);
    if (entityUrl) throw redirect({ to: entityUrl });
    let applications: Awaited<ReturnType<typeof listApplicationsForSponsor>> = [];
    if (detail.viewer?.isSponsor) {
      applications = await listApplicationsForSponsor(sql, data.id, session?.user.id ?? "");
    }
    return {
      product,
      me,
      detail,
      applications,
      emailVerified: session?.user.emailVerified ?? false,
    };
  });

export const Route = createFileRoute("/bounties/$id")({
  loader: (ctx) => loadDetail({ data: { id: ctx.params.id } }),
  component: BountyDetailPage,
});

function BountyDetailPage() {
  const data = Route.useLoaderData();
  return <BountyDetailBody key={data.detail.bounty.id as string} data={data} />;
}

type DetailData = {
  product: ProductKey;
  me: import("@/lib/shell-context").ShellMe;
  detail: NonNullable<Awaited<ReturnType<typeof loadDetail>>>["detail"];
  applications: Array<{ id: string; status: string; message: string; created_at: string; handle: string | null; display_name: string | null }>;
  emailVerified: boolean;
};

function BountyDetailBody({ data }: { data: DetailData }) {
  const { detail, product, me } = data;
  const b = detail.bounty;
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const viewer = detail.viewer;

  const status = String(b.status);
  const isCulture = product === "culturebid";
  const origin = seoOrigin(product);
  const listTitle = isCulture ? "Creative bounties" : "Open bounties";

  async function run(fn: () => Promise<{ ok: boolean; message?: string; code?: string }>, okNote: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await fn();
      setMessage(r.ok ? okNote : r.message ?? r.code ?? "Something went wrong.");
      if (r.ok) {
        await new Promise((res) => setTimeout(res, 600));
        void navigate({ reloadDocument: true });
      }
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    await run(async () => {
      const r = await publishBountyFn({
        data: { bountyId: String(b.id), returnUrl: window.location.href },
      });
      if (!r.ok) return r;
      // Provider checkout handoff: publication happens ONLY when the verified
      // webhook + provider check settle the payment — never from this page.
      if (r.checkout.checkoutUrl) {
        window.location.assign(r.checkout.checkoutUrl);
      }
      return r;
    }, "Funding checkout started. The bounty opens once the payment verifies.");
  }

  const fundingState = b.funding_payment_id ? "Funded" : status === "DRAFT" ? "Not funded yet" : "Funding pending";

  return (
    <ProductShell site={product} me={me}>
      <div className="canvas-wide pb-16">
        <nav aria-label="Breadcrumb" className="pt-6 text-sm text-subtle">
          <Link to="/" className="hover:underline hover:underline-offset-4">
            {productInfo(product).name}
          </Link>
          <span aria-hidden="true"> / </span>
          <Link to="/bounties" className="hover:underline hover:underline-offset-4">
            {listTitle}
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-muted">{String(b.title).slice(0, 40)}{String(b.title).length > 40 ? "…" : ""}</span>
        </nav>

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-xs text-subtle">{String(b.category)}</span>
            <span className="text-xs text-subtle">·</span>
            <span className="text-xs text-subtle">{statusLabel(String(b.reward_structure))}</span>
          </div>
          <h1 className="mt-2 max-w-3xl font-display-site text-3xl tracking-tight sm:text-4xl">{String(b.title)}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span>
              Posted by {String(b.sponsor_company || b.sponsor_name || "a member")}
              {b.sponsor_handle ? ` (@${b.sponsor_handle})` : ""}
            </span>
            <span title={absoluteDate(b.submission_deadline)}>{deadlinePhrase(b.submission_deadline)}</span>
          </div>
        </header>

        {message ? (
          <InlineNotice className="mt-5" tone="neutral">
            {message}
          </InlineNotice>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Main column (8/12): the work. */}
          <div className="lg:col-span-8">
            <BountyMain detail={detail} status={status} viewer={viewer} showSubmit={showSubmit} onCloseSubmit={() => setShowSubmit(false)} onDone={(m) => setMessage(m)} />
          </div>

          {/* Sticky panel (4/12): the decision data + the action. */}
          <div className="lg:col-span-4">
            <StickyPanel>
              <BountyPanel
                b={b}
                data={data}
                status={status}
                fundingState={fundingState}
                busy={busy}
                onPublish={onPublish}
                onRun={run}
                onToggleSubmit={() => setShowSubmit((v) => !v)}
                onDone={(m) => setMessage(m)}
              />
            </StickyPanel>
          </div>
        </div>

        <JsonLd
          data={breadcrumbSchema(product, [
            { name: productInfo(product).name, url: origin },
            { name: listTitle, url: `${origin}/bounties` },
            { name: String(b.title), url: `${origin}/bounties/${b.id}` },
          ])}
        />
      </div>
    </ProductShell>
  );
}

function PanelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-kicker text-subtle">{label}</dt>
      <dd className="tabular text-right font-medium">{children}</dd>
    </div>
  );
}

/** The work itself: overview, deliverables, IP, submissions, reviews (RC3 S-24). */
function BountyMain({
  detail,
  status,
  viewer,
  showSubmit,
  onCloseSubmit,
  onDone,
}: {
  detail: DetailData["detail"];
  status: string;
  viewer: DetailData["detail"]["viewer"];
  showSubmit: boolean;
  onCloseSubmit: () => void;
  onDone: (m: string) => void;
}) {
  const b = detail.bounty;
  return (
    <>
      <section aria-labelledby="h-problem">
        <h2 id="h-problem" className="text-sm font-semibold uppercase tracking-kicker text-subtle">
          The problem
        </h2>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{String(b.description)}</p>
      </section>
      {b.deliverables ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">Deliverables</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{String(b.deliverables)}</p>
        </section>
      ) : null}
      {b.acceptance_criteria ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">Acceptance criteria</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{String(b.acceptance_criteria)}</p>
        </section>
      ) : null}
      {b.creative && (b.creative.formats?.length || b.creative.targetPlatform || b.creative.publicPostingRequired != null || b.creative.usageNotes) ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">Creative brief</h2>
          <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed">
            {b.creative.formats && b.creative.formats.length > 0 ? <li>Formats: {b.creative.formats.join(", ")}</li> : null}
            {b.creative.targetPlatform ? <li>Platform / use: {b.creative.targetPlatform}</li> : null}
            {b.creative.publicPostingRequired != null ? <li>Public posting required: {b.creative.publicPostingRequired ? "yes" : "no"}</li> : null}
            {b.creative.performanceMeasured != null ? <li>Performance measured: {b.creative.performanceMeasured ? "yes (self-reported unless an API integration exists)" : "no"}</li> : null}
            {b.creative.usageNotes ? <li>Usage / licensing: {b.creative.usageNotes}</li> : null}
          </ul>
        </section>
      ) : null}
      {b.ip_and_confidentiality ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">IP & confidentiality</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{String(b.ip_and_confidentiality)}</p>
        </section>
      ) : null}

      {detail.submissions.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">
            Submissions ({detail.submissions.length})
          </h2>
          <ul className="mt-4 space-y-4">
            {detail.submissions.map((s) => (
              <li key={s.id} className="rounded-md border border-fg/10 bg-surface/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    {s.place ? `#${s.place} ` : ""}
                    {s.title}
                  </p>
                  <p className="text-xs text-subtle">
                    {s.display_name ?? "member"}
                    {s.handle ? ` (@${s.handle})` : ""}
                  </p>
                </div>
                {s.body ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{s.body}</p> : null}
                {s.links.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {s.links.map((l) => (
                      <li key={l}>
                        <a href={l} rel="nofollow ugc" className="text-sm text-accent underline underline-offset-2">
                          {safeHost(l)}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {status === "COMPLETED" && viewer && (viewer.isSponsor || viewer.participant) ? (
        <ReviewBox
          workType="BOUNTY"
          workId={String(b.id)}
          direction={viewer.isSponsor ? "SPONSOR_TO_PROVIDER" : "PROVIDER_TO_SPONSOR"}
          onDone={onDone}
        />
      ) : null}

      {showSubmit && viewer?.participant ? (
        <SubmitBox
          bountyId={String(b.id)}
          onDone={(m) => {
            onDone(m);
            onCloseSubmit();
          }}
        />
      ) : null}
    </>
  );
}

/** The decision panel: money facts, viewer controls, sponsor controls, awards. */
function BountyPanel({
  b,
  data,
  status,
  fundingState,
  busy,
  onPublish,
  onRun,
  onToggleSubmit,
  onDone,
}: {
  b: DetailData["detail"]["bounty"];
  data: DetailData;
  status: string;
  fundingState: string;
  busy: boolean;
  onPublish: () => Promise<void>;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string; code?: string }>, okNote: string) => Promise<void>;
  onToggleSubmit: () => void;
  onDone: (m: string) => void;
}) {
  const viewer = data.detail.viewer;
  return (
    <>
      <div className="rounded-md border border-fg/10 bg-surface/60 p-4">
        <MoneyValue minor={Number(b.reward_total_minor)} currency={String(b.currency)} size="xl" className="text-accent" title={String(b.currency)} />
        <p className="mt-0.5 text-xs text-subtle" data-testid="reward-amount-label">
          advertised reward, paid in full
        </p>
        <dl className="mt-4 space-y-2.5 text-sm">
          <PanelRow label="Funding">
            <span data-testid="funding-state">{fundingState}</span>
          </PanelRow>
          <PanelRow label="Structure">{statusLabel(String(b.reward_structure))}</PanelRow>
          <PanelRow label="Participants">
            {Number(b.participants ?? 0)} / {Number(b.participant_cap)}
          </PanelRow>
          {b.application_deadline ? (
            <PanelRow label="Applications due">
              <span title={absoluteDate(b.application_deadline)}>{deadlinePhrase(b.application_deadline)}</span>
            </PanelRow>
          ) : null}
          <PanelRow label="Submissions due">
            <span title={absoluteDate(b.submission_deadline)}>{deadlinePhrase(b.submission_deadline)}</span>
          </PanelRow>
        </dl>
      </div>

      {!viewer?.isSponsor ? (
        <section className="mt-4 rounded-md border border-fg/10 bg-surface/60 p-4" data-testid="viewer-actions">
          <h2 className="text-sm font-semibold">Your status</h2>
          <ViewerActions
            b={b}
            viewer={viewer}
            status={status}
            busy={busy}
            onRun={onRun}
            onToggleSubmit={onToggleSubmit}
            onDone={onDone}
          />
        </section>
      ) : null}

      {viewer?.isSponsor ? (
        <section className="mt-4 rounded-md border border-fg/10 bg-surface/60 p-4" data-testid="sponsor-panel">
          <h2 className="text-sm font-semibold">Manage</h2>
          {status === "DRAFT" ? (
            <div className="mt-3" data-testid="sponsor-publish">
              <p className="text-sm text-muted">
                {data.emailVerified
                  ? "Publishing starts the funding checkout. The bounty opens to applications once the payment is verified."
                  : "Verify your email first (admin can verify manually while email delivery is unconfigured)."}
              </p>
              <Button className="mt-3 w-full" disabled={busy || !data.emailVerified} onClick={() => void onPublish()}>
                Fund & publish
              </Button>
            </div>
          ) : null}
          {data.applications.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {data.applications.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <span className="truncate">{a.display_name ?? `@${a.handle ?? "member"}`}</span>
                  <span className="shrink-0 text-xs text-subtle">{statusLabel(a.status)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {(status === "SUBMISSION" || status === "JUDGING") ? (
            <p className="mt-2 text-xs text-subtle">Judging: pick winners from the submissions list.</p>
          ) : null}
          {["DRAFT", "OPEN", "APPLICATION_CLOSED"].includes(status) ? (
            <Button
              variant="danger"
              size="sm"
              className="mt-3"
              disabled={busy}
              onClick={async () => {
                const reason = window.prompt("Why are you cancelling? (shown in the audit trail)");
                if (!reason) return;
                await onRun(() => cancelBountyFn({ data: { bountyId: String(b.id), reason } }), "Bounty cancelled.");
              }}
            >
              Cancel bounty
            </Button>
          ) : null}
        </section>
      ) : null}

      <AwardsList awards={data.detail.awards} />
    </>
  );
}

function AwardsList({ awards }: { awards: DetailData["detail"]["awards"] }) {
  if (awards.length === 0) return null;
  return (
    <section className="mt-4 rounded-md border border-fg/10 bg-surface/60 p-4" data-testid="awards">
      <h2 className="text-sm font-semibold">Awards</h2>
      <ul className="mt-2.5 space-y-1.5 text-sm">
        {awards.map((a) => (
          <li key={a.place} className="flex justify-between gap-2">
            <span>
              #{a.place} {a.handle ? `@${a.handle}` : ""}
            </span>
            <span className="tabular shrink-0 font-medium">
              {formatMinor(a.amount_minor)} · {statusLabel(a.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ViewerActions({
  b,
  viewer,
  status,
  busy,
  onRun,
  onToggleSubmit,
  onDone,
}: {
  b: DetailData["detail"]["bounty"];
  viewer: DetailData["detail"]["viewer"];
  status: string;
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string; code?: string }>, okNote: string) => Promise<void>;
  onToggleSubmit: () => void;
  onDone: (m: string) => void;
}) {
  if (!viewer || (!viewer.application && !viewer.participant)) {
    return status === "OPEN" ? (
      <ApplyBox bountyId={String(b.id)} onDone={onDone} />
    ) : (
      <p className="mt-2 text-sm text-muted">
        Applications are closed (this bounty is {statusLabel(status)}).
      </p>
    );
  }
  return (
    <div className="mt-2 text-sm">
      {viewer.application ? <p className="text-muted">Application: {statusLabel(viewer.application.status)}</p> : null}
      {viewer.participant ? <p className="text-muted">Participation: {statusLabel(viewer.participant.status)}</p> : null}
      {viewer.participant?.status === "APPROVED" ? (
        <Button
          className="mt-3 w-full"
          disabled={busy}
          onClick={async () => {
            await onRun(async () => startWorkFn({ data: { bountyId: String(b.id) } }), "Work started. Deliver before the deadline.");
          }}
        >
          Start work
        </Button>
      ) : null}
      {viewer.participant && ["WORK_STARTED", "SUBMITTED"].includes(viewer.participant.status) ? (
        <button
          type="button"
          onClick={onToggleSubmit}
          className="mt-3 block text-sm font-medium text-accent underline underline-offset-2"
        >
          {viewer.participant.status === "SUBMITTED" ? "Update submission" : "Submit work"}
        </button>
      ) : null}
      {viewer.application?.status === "PENDING" ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            await onRun(
              () => withdrawApplicationFn({ data: { applicationId: viewer.application!.id } }) as never,
              "Application withdrawn.",
            );
          }}
          className="mt-3 block text-sm text-muted underline underline-offset-2"
        >
          Withdraw application
        </button>
      ) : null}
    </div>
  );
}

function ApplyBox({ bountyId, onDone }: { bountyId: string; onDone: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  // RC3: feedback renders HERE. The POST serverFn invalidates the route and
  // a remount drops parent state, so a parent-held message could silently
  // disappear right after a successful application.
  const [feedback, setFeedback] = useState<string | null>(null);
  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await applyToBountyFn({ data: { bountyId, message: note } });
          if (r.ok) {
            onDone("Application sent.");
            setFeedback("Application sent. Refreshing…");
            await new Promise((res) => setTimeout(res, 600));
            location.reload();
          } else {
            setBusy(false);
            setFeedback(r.message ?? "Application failed. Please try again.");
            onDone(r.message ?? "Application failed.");
          }
        } catch (err) {
          setBusy(false);
          setFeedback(err instanceof Error ? err.message : "Application failed. Please try again.");
          onDone(err instanceof Error ? err.message : "Application failed.");
        }
      }}
    >
      <Field label="Why are you the right fit?" hint="Never do unpaid deliverable work in an application." id="apply-note">
        <Textarea id="apply-note" rows={3} maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {feedback ? (
        <div data-testid="apply-feedback">
          <InlineNotice>{feedback}</InlineNotice>
        </div>
      ) : null}
      <Button type="submit" loading={busy} className="w-full">
        Apply
      </Button>
    </form>
  );
}

function SubmitBox({ bountyId, onDone }: { bountyId: string; onDone: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  // RC3: feedback renders locally (serverFn invalidation remounts the route;
  // a parent-held message would be dropped right after a successful submit).
  const [feedback, setFeedback] = useState<string | null>(null);
  return (
    <form
      className="mt-8 rounded-md border border-fg/10 bg-surface/60 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        const r = await submitWorkFn({
          data: {
            bountyId,
            title: String(f.get("title")),
            body: String(f.get("body") ?? ""),
            links: String(f.get("links") ?? "")
              .split(/[\s,]+/)
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 10),
          },
        });
        setBusy(false);
        if (r.ok) {
          setFeedback("Submission saved. Refreshing…");
          onDone("Submission saved.");
          await new Promise((res) => setTimeout(res, 600));
          location.reload();
        } else {
          setFeedback(r.message ?? "Could not save the submission.");
          onDone(r.message ?? "Could not save the submission.");
        }
      }}
    >
      <h2 className="text-lg font-semibold tracking-tight">Your submission</h2>
      <div className="mt-3 space-y-3">
        <Field label="Title" required id="sub-title">
          <Input id="sub-title" name="title" required minLength={3} maxLength={140} placeholder="What you delivered" />
        </Field>
        <Field label="What you did and how to verify it" id="sub-body">
          <Textarea id="sub-body" name="body" rows={5} maxLength={50000} />
        </Field>
        <Field label="Links" hint="https:// links, comma-separated" id="sub-links">
          <Input id="sub-links" name="links" placeholder="https://…" />
        </Field>
      </div>
      {feedback ? (
        <div className="mt-4" data-testid="submit-feedback">
          <InlineNotice>{feedback}</InlineNotice>
        </div>
      ) : null}
      <Button type="submit" loading={busy} className="mt-4">
        {busy ? "Saving…" : "Save submission"}
      </Button>
    </form>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}
