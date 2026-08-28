import { useState } from "react";
import { createFileRoute, Link, useNavigate, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey, product as productInfo, seoOrigin, type ProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { getBountyDetail, listApplicationsForSponsor } from "@/lib/marketplace/queries.server";
import { formatMinor } from "@/lib/money";
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
import { createReviewFn } from "@/lib/marketplace/reviews";

/**
 * /bounties/:id — public bounty detail (Phase 01, FR-3/FR-4). Authority-gated
 * actions render from the server-resolved viewer context; every action goes
 * back through the engine's authorization.
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
  const b = detail.bounty as Record<string, unknown> & {
    creative?: { formats?: string[]; targetPlatform?: string; publicPostingRequired?: boolean; performanceMeasured?: boolean; usageNotes?: string } | null;
  };
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const viewer = detail.viewer;

  const status = String(b.status);

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

  const isCulture = product === "culturebid";
  const origin = seoOrigin(product);
  const listTitle = isCulture ? "Creative bounties" : "Open bounties";
  const canonicalUrl = `${origin}/bounties/${String(b.id)}`;

  return (
    <ProductShell site={product} me={me}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-subtle">
          <a href="/" className="underline-offset-4 hover:underline">
            {productInfo(product).name}
          </a>
          <span aria-hidden="true"> / </span>
          <a href="/bounties" className="underline-offset-4 hover:underline">
            {listTitle}
          </a>
        </nav>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
              {String(b.category)} · {String(b.reward_structure).replaceAll("_", " ").toLowerCase()} · {status}
            </p>
            <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">{String(b.title)}</h1>
            <p className="mt-1 text-sm text-muted">
              {Number(b.participants ?? 0)}/{Number(b.participant_cap)} participants ·
              submissions due {new Date(String(b.submission_deadline)).toISOString().slice(0, 10)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display-site text-2xl tracking-tight text-accent" data-testid="reward-amount">
              {formatMinor(Number(b.reward_total_minor), String(b.currency))}
            </p>
            <p className="text-xs text-subtle">advertised reward, paid in full</p>
          </div>
        </div>

        {/* Money state: visually explicit, always */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border-2 border-fg/15 bg-surface p-3">
            <p className="text-xs uppercase tracking-kicker text-subtle">Funding</p>
            <p className="mt-1 text-sm font-medium" data-testid="funding-state">
              {b.funding_payment_id ? "Funded" : status === "DRAFT" ? "Not funded yet" : "Funding pending"}
            </p>
          </div>
          <div className="rounded-md border-2 border-fg/15 bg-surface p-3">
            <p className="text-xs uppercase tracking-kicker text-subtle">Structure</p>
            <p className="mt-1 text-sm font-medium">{String(b.reward_structure).replaceAll("_", " ").toLowerCase()}</p>
          </div>
          <div className="rounded-md border-2 border-fg/15 bg-surface p-3">
            <p className="text-xs uppercase tracking-kicker text-subtle">Sponsor</p>
            <p className="mt-1 truncate text-sm font-medium">
              {String(b.sponsor_company || b.sponsor_name || "Sponsor")}
            </p>
          </div>
        </div>

        {viewer?.isSponsor && status === "DRAFT" ? (
          <div className="mt-6 rounded-lg border-2 border-accent/40 bg-raised/40 p-4" data-testid="sponsor-publish">
            <p className="text-sm font-medium">Publish this bounty</p>
            <p className="mt-1 text-sm text-muted">
              {data.emailVerified
                ? "Publishing starts the funding checkout. The bounty opens to applications once the payment is verified."
                : "Verify your email first (admin can verify manually while email delivery is unconfigured)."}
            </p>
            <button
              type="button"
              disabled={busy || !data.emailVerified}
              onClick={() => void onPublish()}
              className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-60"
            >
              Fund & publish ({formatMinor(Number(b.reward_total_minor))} + fee)
            </button>
          </div>
        ) : null}

        {message ? (
          <p role="status" aria-live="polite" className="mt-4 rounded-md border-2 border-fg/15 bg-surface p-3 text-sm" data-testid="action-message">
            {message}
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <section className="rounded-lg border-2 border-fg/15 bg-surface p-5">
              <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">The problem</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{String(b.description)}</p>
              {b.deliverables ? (
                <>
                  <h2 className="mt-5 text-xs font-medium uppercase tracking-kicker text-subtle">Deliverables</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{String(b.deliverables)}</p>
                </>
              ) : null}
              {b.creative && (b.creative.formats?.length || b.creative.targetPlatform || b.creative.publicPostingRequired != null) ? (
                <>
                  <h2 className="mt-5 text-xs font-medium uppercase tracking-kicker text-subtle">Creative brief</h2>
                  <ul className="mt-2 space-y-1 text-sm">
                    {b.creative.formats && b.creative.formats.length > 0 ? <li>• Formats: {b.creative.formats.join(", ")}</li> : null}
                    {b.creative.targetPlatform ? <li>• Platform/channel: {b.creative.targetPlatform}</li> : null}
                    {b.creative.publicPostingRequired != null ? <li>• Public posting required: {b.creative.publicPostingRequired ? "yes" : "no"}</li> : null}
                    {b.creative.performanceMeasured != null ? <li>• Performance measured: {b.creative.performanceMeasured ? "yes (self-reported unless an API integration exists)" : "no"}</li> : null}
                    {b.creative.usageNotes ? <li>• Usage/licensing: {b.creative.usageNotes}</li> : null}
                  </ul>
                </>
              ) : null}
              {b.acceptance_criteria ? (
                <>
                  <h2 className="mt-5 text-xs font-medium uppercase tracking-kicker text-subtle">Acceptance criteria</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{String(b.acceptance_criteria)}</p>
                </>
              ) : null}
              {b.ip_and_confidentiality ? (
                <>
                  <h2 className="mt-5 text-xs font-medium uppercase tracking-kicker text-subtle">IP & confidentiality</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{String(b.ip_and_confidentiality)}</p>
                </>
              ) : null}
            </section>

            {detail.submissions.length > 0 ? (
              <section className="mt-6 rounded-lg border-2 border-fg/15 bg-surface p-5">
                <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">
                  Submissions ({detail.submissions.length})
                </h2>
                <ul className="mt-3 space-y-4">
                  {detail.submissions.map((s) => (
                    <li key={s.id} className="rounded-md border-2 border-fg/10 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">
                          {s.place ? `#${s.place} ` : ""}{s.title}
                        </p>
                        <p className="text-xs text-subtle">
                          {s.display_name ?? "member"}{s.handle ? ` (@${s.handle})` : ""}
                        </p>
                      </div>
                      {s.body ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{s.body}</p> : null}
                      {s.links.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {s.links.map((l) => (
                            <li key={l}>
                              <a href={l} rel="nofollow ugc" className="text-sm underline underline-offset-2">{safeHost(l)}</a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="space-y-6">
            {/* Viewer actions */}
            {!viewer?.isSponsor ? (
              <section className="rounded-lg border-2 border-fg/15 bg-surface p-5" data-testid="viewer-actions">
                <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Your status</h2>
                {!viewer?.application && !viewer?.participant ? (
                  status === "OPEN" ? (
                    <ApplyBox bountyId={String(b.id)} onDone={(m) => setMessage(m)} />
                  ) : (
                    <p className="mt-2 text-sm text-muted">Applications are closed (bounty is {status}).</p>
                  )
                ) : (
                  <div className="mt-2 text-sm">
                    {viewer?.application ? <p>Application: {viewer.application.status}</p> : null}
                    {viewer?.participant ? <p>Participation: {viewer.participant.status}</p> : null}
                    {viewer?.application?.status === "APPROVED" && !viewer?.participant ? null : null}
                    {viewer?.participant?.status === "APPROVED" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          await run(async () => {
                            const r = await startWorkFn({ data: { bountyId: String(b.id) } });
                            return r;
                          }, "Work started. Deliver before the deadline.");
                        }}
                        className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
                      >
                        Start work
                      </button>
                    ) : null}
                    {viewer?.participant && ["WORK_STARTED", "SUBMITTED"].includes(viewer.participant.status) ? (
                      <button
                        type="button"
                        onClick={() => setShowSubmit((v) => !v)}
                        className="mt-3 block text-sm font-medium underline underline-offset-2"
                      >
                        {viewer.participant.status === "SUBMITTED" ? "Update submission" : "Submit work"}
                      </button>
                    ) : null}
                    {viewer?.application?.status === "PENDING" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          await run(
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
                )}
              </section>
            ) : null}

            {viewer?.isSponsor ? (
              <section className="rounded-lg border-2 border-fg/15 bg-surface p-5" data-testid="sponsor-panel">
                <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Manage</h2>
                {detail.participants.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm">
                    {detail.participants.map((p, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">{p.display_name ?? "member"}</span>
                        <span className="text-subtle">{p.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {status === "SUBMISSION" || status === "JUDGING" ? (
                  <p className="mt-2 text-xs text-subtle">
                    Judging: pick winners from the submissions list on the left.
                  </p>
                ) : null}
                {["DRAFT", "OPEN", "APPLICATION_CLOSED"].includes(status) ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const reason = window.prompt("Why are you cancelling? (shown in the audit trail)");
                      if (!reason) return;
                      await run(() => cancelBountyFn({ data: { bountyId: String(b.id), reason } }), "Bounty cancelled.");
                    }}
                    className="mt-3 inline-flex h-9 items-center rounded-md border-2 border-danger/40 px-3 text-sm font-medium text-danger"
                  >
                    Cancel bounty
                  </button>
                ) : null}
              </section>
            ) : null}

            {detail.participants.length > 0 ? (
              <section className="rounded-lg border-2 border-fg/15 bg-surface p-5">
                <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Participants</h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {detail.participants.map((p, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{p.display_name ?? "member"}</span>
                      <span className="text-xs text-subtle">{p.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {detail.awards.length > 0 ? (
              <section className="rounded-lg border-2 border-fg/15 bg-surface p-5" data-testid="awards">
                <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Awards</h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {detail.awards.map((a) => (
                    <li key={a.place} className="flex justify-between gap-2">
                      <span>#{a.place} {a.handle ? `@${a.handle}` : ""}</span>
                      <span className="font-medium">{formatMinor(a.amount_minor)} · {a.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        {status === "COMPLETED" && viewer && (viewer.isSponsor || viewer.participant) ? (
          <ReviewBox
            workType="BOUNTY"
            workId={String(b.id)}
            direction={viewer.isSponsor ? "SPONSOR_TO_PROVIDER" : "PROVIDER_TO_SPONSOR"}
            onDone={(m) => setMessage(m)}
          />
        ) : null}

        {showSubmit && viewer?.participant ? (
          <SubmitBox
            bountyId={String(b.id)}
            onDone={(m) => {
              setMessage(m);
              setShowSubmit(false);
            }}
          />
        ) : null}

        <JsonLd
          data={breadcrumbSchema(product, [
            { name: productInfo(product).name, url: origin },
            { name: listTitle, url: `${origin}/bounties` },
            { name: String(b.title), url: canonicalUrl },
          ])}
        />
      </div>
    </ProductShell>
  );
}

function ApplyBox({ bountyId, onDone }: { bountyId: string; onDone: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3">
      <textarea
        placeholder="Tell the sponsor why you're the right fit (never do unpaid deliverable work in an application)."
        rows={3}
        maxLength={4000}
        className="w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60"
      />
      <button
        type="button"
        disabled={busy}
        onClick={async (e) => {
          setBusy(true);
          const textarea = (e.currentTarget.previousElementSibling as HTMLTextAreaElement | null)?.value ?? "";
          const r = await applyToBountyFn({ data: { bountyId, message: textarea } });
          setBusy(false);
          onDone(r.ok ? "Application sent." : r.message);
        }}
        className="mt-2 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-60"
      >
        Apply
      </button>
    </div>
  );
}

function SubmitBox({ bountyId, onDone }: { bountyId: string; onDone: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 rounded-lg border-2 border-fg/20 bg-surface p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        const r = await submitWorkFn({
          data: {
            bountyId,
            title: String(f.get("title")),
            body: String(f.get("body") ?? ""),
            links: String(f.get("links") ?? "").split(/[\s,]+/).map((s) => s.trim()).filter(Boolean).slice(0, 10),
          },
        });
        setBusy(false);
        onDone(r.ok ? "Submission saved." : r.message);
      }}
    >
      <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Your submission</h2>
      <input name="title" required minLength={3} maxLength={140} placeholder="Submission title" className="mt-2 w-full rounded-md border-2 border-fg/20 bg-surface px-3 py-2.5 text-sm outline-none focus:border-fg/60" />
      <textarea name="body" rows={5} maxLength={50000} placeholder="What you did and how to verify it" className="mt-3 w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
      <input name="links" placeholder="https:// links, comma-separated" className="mt-3 w-full rounded-md border-2 border-fg/20 bg-surface px-3 py-2.5 text-sm outline-none focus:border-fg/60" />
      <button
        type="submit"
        disabled={busy}
        className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save submission"}
      </button>
    </form>
  );
}

function ReviewBox({
  workType,
  workId,
  direction,
  onDone,
}: {
  workType: "BOUNTY" | "PROJECT";
  workId: string;
  direction: "SPONSOR_TO_PROVIDER" | "PROVIDER_TO_SPONSOR";
  onDone: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return null;
  return (
    <form
      className="mt-6 rounded-lg border-2 border-fg/20 bg-surface p-5"
      data-testid="review-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const num = (k: string) => {
          const v = Number(f.get(k));
          return v >= 1 && v <= 5 ? v : undefined;
        };
        setBusy(true);
        const r = await createReviewFn({
          data: {
            workType,
            workId,
            direction,
            quality: num("quality"),
            communication: num("communication"),
            timeliness: num("timeliness"),
            clarity: num("clarity"),
            body: String(f.get("body") ?? ""),
          },
        });
        setBusy(false);
        if (r.ok) {
          onDone("Review saved. Thank you.");
          setDone(true);
        } else {
          onDone(r.message);
        }
      }}
    >
      <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">
        {direction === "SPONSOR_TO_PROVIDER" ? "Review the winning builder" : "Review the sponsor"}
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        {["quality", "communication", "timeliness", "clarity"].map((k) => (
          <div key={k}>
            <label htmlFor={`rv-${k}`} className="mb-1 block text-xs font-medium capitalize">{k} (1–5)</label>
            <input id={`rv-${k}`} name={k} type="number" min={1} max={5} className="h-10 w-full rounded-md border-2 border-fg/20 bg-surface px-2 text-sm outline-none focus:border-fg/60" />
          </div>
        ))}
      </div>
      <textarea name="body" rows={3} maxLength={4000} placeholder="How did the work go?" className="mt-3 w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
      <button type="submit" disabled={busy} className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-60">
        {busy ? "Saving…" : "Submit review"}
      </button>
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