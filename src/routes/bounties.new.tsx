import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { createBountyFn, fundingPlanFn } from "@/lib/marketplace/bounties";
import { formatMinor } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/ui/market";
import { InlineNotice } from "@/components/ui/states";
import {
  StepWhat,
  StepCommissioning,
  StepBrief,
  StepDone,
  StepParticipation,
  StepReward,
  PlanRows,
  ReviewLine,
  BOUNTY_STEPS,
  CULTURE_STEPS,
  CATEGORIES_FOUNDER,
  CATEGORIES_CULTURE,
  type BountyDraft,
  type StepErrors,
} from "@/components/create/bounty-steps";

/**
 * /bounties/new — sponsor creation (Phase 01, FR-4; RC3, S-25/S-26).
 * Progressive disclosure: one step at a time, 8/4 desktop with a live
 * summary, step indicator + sticky bottom actions on mobile. The server
 * remains authoritative; per-step checks are UX, not enforcement.
 * CultureBid leads with the commissioning question (format-first).
 */
const loadCreate = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (!session) throw redirect({ to: "/signin" });
  const product = await currentProductKey();
  return {
    product,
    me: (await (await import("@/lib/shell-context")).getShellContext()).me,
    emailVerified: session.user.emailVerified,
  };
});

export const Route = createFileRoute("/bounties/new")({
  loader: () => loadCreate(),
  component: NewBountyPage,
});

const EMPTY_DRAFT: BountyDraft = {
  title: "",
  category: "",
  description: "",
  skills: "",
  deliverables: "",
  acceptanceCriteria: "",
  ipAndConfidentiality: "",
  participantCap: "10",
  qualificationMode: "SPONSOR_APPROVAL",
  applicationDeadline: "",
  submissionDeadline: "",
  rewardRupees: "",
  rewardStructure: "WINNER_TAKES_ALL",
  podiumFirst: "",
  podiumSecond: "",
  podiumThird: "",
  poolWinner: "",
  poolFinalist: "",
  poolFinalists: "3",
  formats: [],
  targetPlatform: "",
  publicPostingRequired: false,
  performanceMeasured: false,
  usageNotes: "",
};

function validateStep(step: number, d: BountyDraft, isCulture: boolean, steps: readonly string[]): StepErrors {
  const e: StepErrors = {};
  const idx = isCulture ? ["commissioning", "brief", "done", "participation", "reward", "review"] : ["what", "done", "participation", "reward", "review"];
  const name = idx[step];
  if (name === "commissioning" || name === "what") {
    if (d.title.trim().length < 8) e.title = "At least 8 characters.";
    if (name === "commissioning" && d.formats.length === 0) e.formats = "Pick at least one format.";
  }
  if (name === "what" && (d.category.trim().length < 2)) e.category = "Pick or type a category.";
  if ((name === "commissioning" && false) || name === "brief" || name === "what") {
    if (d.description.trim().length < 20) e.description = "At least 20 characters.";
  }
  if (name === "participation") {
    const cap = Number(d.participantCap);
    if (!Number.isInteger(cap) || cap < 1 || cap > 200) e.participantCap = "Between 1 and 200.";
    if (!d.submissionDeadline) e.submissionDeadline = "Required.";
    else if (Number.isNaN(new Date(d.submissionDeadline).getTime())) e.submissionDeadline = "Invalid date.";
    if (d.applicationDeadline && Number.isNaN(new Date(d.applicationDeadline).getTime())) e.applicationDeadline = "Invalid date.";
  }
  if (name === "reward") {
    const minor = Math.round(Number(d.rewardRupees) * 100);
    if (!Number.isFinite(minor) || minor < 100_000) e.reward = "Minimum 1,000 rupees.";
    else {
      const n = (v: string) => Math.round(Number(v || "0") * 100);
      if (d.rewardStructure === "PODIUM") {
        const sum = n(d.podiumFirst) + n(d.podiumSecond) + n(d.podiumThird);
        if (sum !== minor) e.allocations = "The podium split must equal the advertised reward.";
      } else if (d.rewardStructure === "FINALIST_POOL") {
        const finalists = Math.max(1, Number(d.poolFinalists) || 1);
        const sum = n(d.poolWinner) + n(d.poolFinalist) * finalists;
        if (sum !== minor) e.allocations = "The pool must equal the advertised reward.";
      }
    }
  }
  void steps;
  return e;
}

function NewBountyPage() {
  const d = Route.useLoaderData();
  const isCulture = d.product === "culturebid";
  const steps: string[] = isCulture ? [...CULTURE_STEPS] : [...BOUNTY_STEPS];
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<BountyDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<StepErrors>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<{ rewardMinor: number; feeMinor: number; totalMinor: number } | null>(null);

  const set = <K extends keyof BountyDraft>(k: K, v: BountyDraft[K]) => setDraft((p) => ({ ...p, [k]: v }));

  // Live money plan (debounced): server-computed, never client arithmetic.
  useEffect(() => {
    const minor = Math.round(Number(draft.rewardRupees) * 100);
    if (!Number.isFinite(minor) || minor <= 0) {
      setPlan(null);
      return;
    }
    const t = setTimeout(() => {
      fundingPlanFn({ data: { rewardTotalMinor: minor } })
        .then((p) => setPlan({ rewardMinor: p.rewardMinor, feeMinor: p.feeMinor, totalMinor: p.sponsorSubtotal }))
        .catch(() => setPlan(null));
    }, 400);
    return () => clearTimeout(t);
  }, [draft.rewardRupees]);

  const next = () => {
    const errs = validateStep(step, draft, isCulture, steps);
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const back = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };

  const stepBody = useMemo(() => {
    switch (step) {
      case 0:
        return isCulture ? <StepCommissioning d={draft} set={set} errors={errors} /> : <StepWhat d={draft} set={set} errors={errors} categories={CATEGORIES_FOUNDER} />;
      case 1:
        return isCulture ? <StepBrief d={draft} set={set} errors={errors} /> : <StepDone d={draft} set={set} errors={errors} />;
      case 2:
        return isCulture ? <StepDone d={draft} set={set} errors={errors} /> : <StepParticipation d={draft} set={set} errors={errors} />;
      case 3:
        return isCulture ? <StepParticipation d={draft} set={set} errors={errors} /> : <StepReward d={draft} set={set} errors={errors} plan={plan} />;
      case 4:
        return isCulture ? <StepReward d={draft} set={set} errors={errors} plan={plan} /> : <ReviewBlock d={draft} plan={plan} isCulture={isCulture} />;
      default:
        return <ReviewBlock d={draft} plan={plan} isCulture={isCulture} />;
    }
  }, [step, draft, errors, plan, isCulture, set]);

  const isReview = step === steps.length - 1;

  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="canvas-wide pb-24">
        <header className="border-b border-fg/10 py-6">
          <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">{isCulture ? "Sponsor · creative brief" : "Sponsor · bounty"}</p>
          <h1 className="mt-1 font-display-site text-3xl tracking-tight">{isCulture ? "Post a creative brief" : "Post a bounty"}</h1>
          <div className="mt-4 hidden md:block">
            <StepIndicator steps={steps} current={step} />
          </div>
        </header>

        {!d.emailVerified ? (
          <InlineNotice className="mt-6" tone="warn" >
            Money-facing actions need a verified email. Verification email delivery is not configured yet; an admin can verify manually. You can draft this now and fund it after verification.
          </InlineNotice>
        ) : null}
        {error ? (
          <div data-testid="create-error">
            <InlineNotice className="mt-6" tone="down">
              {error}
            </InlineNotice>
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8" data-testid="create-bounty-form">
            {stepBody}
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-fg/10 pt-5 md:hidden">
              <Button variant="ghost" onClick={back} disabled={step === 0}>
                Back
              </Button>
              {isReview ? null : (
                <Button onClick={next} className="flex-1">
                  Continue
                </Button>
              )}
            </div>
            <div className="mt-8 hidden items-center justify-between gap-3 md:flex">
              <Button variant="ghost" onClick={back} disabled={step === 0}>
                Back
              </Button>
              {isReview ? null : (
                <Button onClick={next}>
                  Continue
                </Button>
              )}
            </div>
          </div>
          <div className="lg:col-span-4">
            <SummaryPanel
              draft={draft}
              plan={plan}
              isCulture={isCulture}
              step={step}
              steps={steps}
              creating={creating}
              onCreate={doCreate}
            />
          </div>
        </div>

        {/* Mobile sticky bottom action */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-fg/10 bg-surface/95 p-3 backdrop-blur md:hidden">
          {isReview ? (
            <Button className="w-full" loading={creating} onClick={doCreate}>
              {creating ? "Creating…" : "Create draft"}
            </Button>
          ) : (
            <Button className="w-full" onClick={next}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </ProductShell>
  );

  async function doCreate() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createBountyFn({
        data: { ...buildCreateInput(draft), ...(isCulture ? { creative: buildCreative(draft) } : {}) },
      });
      if (result.ok) {
        window.location.assign(`/bounties/${result.id}`);
      } else {
        setError(result.message);
        setCreating(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid data.");
      setCreating(false);
    }
  }
}

function buildCreateInput(d: BountyDraft) {
  const minor = Math.round(Number(d.rewardRupees) * 100);
  let allocations: Array<{ place: number; amountMinor: number; label?: string }> = [{ place: 1, amountMinor: minor }];
  if (d.rewardStructure === "PODIUM") {
    const n = (v: string) => Math.round(Number(v || "0") * 100);
    allocations = [
      { place: 1, amountMinor: n(d.podiumFirst), label: "Winner" },
      ...(n(d.podiumSecond) > 0 ? [{ place: 2, amountMinor: n(d.podiumSecond), label: "Runner-up" }] : []),
      ...(n(d.podiumThird) > 0 ? [{ place: 3, amountMinor: n(d.podiumThird), label: "Third place" }] : []),
    ];
  } else if (d.rewardStructure === "FINALIST_POOL") {
    const n = (v: string) => Math.round(Number(v || "0") * 100);
    const finalists = Math.max(1, Number(d.poolFinalists) || 1);
    allocations = [
      { place: 1, amountMinor: n(d.poolWinner), label: "Winner premium" },
      ...Array.from({ length: finalists }, (_, i) => ({
        place: i + 2,
        amountMinor: n(d.poolFinalist),
        label: `Finalist ${i + 1}`,
      })),
    ];
  }
  return {
    title: d.title,
    description: d.description,
    category: d.category,
    skills: d.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
    deliverables: d.deliverables,
    acceptanceCriteria: d.acceptanceCriteria,
    rewardTotalMinor: minor,
    rewardStructure: d.rewardStructure,
    rewardAllocations: allocations,
    applicationDeadline: d.applicationDeadline ? new Date(d.applicationDeadline).toISOString() : null,
    submissionDeadline: new Date(d.submissionDeadline).toISOString(),
    participantCap: Math.max(1, Math.round(Number(d.participantCap) || 10)),
    qualificationMode: d.qualificationMode,
    ipAndConfidentiality: d.ipAndConfidentiality,
  };
}

function buildCreative(d: BountyDraft) {
  return {
    formats: d.formats,
    targetPlatform: d.targetPlatform || undefined,
    publicPostingRequired: d.publicPostingRequired,
    performanceMeasured: d.performanceMeasured,
    usageNotes: d.usageNotes || undefined,
  };
}

function ReviewBlock({
  d,
  plan,
  isCulture,
}: {
  d: BountyDraft;
  plan: { rewardMinor: number; feeMinor: number; totalMinor: number } | null;
  isCulture: boolean;
}) {
  return (
    <section data-testid="review-block">
      <h2 className="text-lg font-semibold tracking-tight">Review</h2>
      <p className="mt-1 text-sm text-muted">
        Check the draft before saving. Funding stays off until the platform enables it; your draft is saved and opens when funding turns on.
      </p>
      <div className="mt-4">
        <ReviewLine label="Title">{d.title}</ReviewLine>
        {isCulture ? <ReviewLine label="Formats">{d.formats.join(", ") || "not set"}</ReviewLine> : null}
        {!isCulture ? <ReviewLine label="Category">{d.category}</ReviewLine> : null}
        <ReviewLine label="Description">{d.description.slice(0, 140)}{d.description.length > 140 ? "…" : ""}</ReviewLine>
        <ReviewLine label="Participant cap">{d.participantCap}</ReviewLine>
        <ReviewLine label="Qualification">{d.qualificationMode === "SPONSOR_APPROVAL" ? "Sponsor approves each applicant" : "Application only"}</ReviewLine>
        <ReviewLine label="Submissions due">{new Date(d.submissionDeadline).toUTCString().slice(0, 22)}</ReviewLine>
        <ReviewLine label="Advertised reward">{plan ? formatMinor(plan.rewardMinor) : "not set"}</ReviewLine>
        <ReviewLine label="Structure">{d.rewardStructure.replaceAll("_", " ")}</ReviewLine>
      </div>
      {plan ? (
        <div className="mt-5 rounded-sm border border-up/30 bg-raised/40 p-4" data-testid="money-plan">
          <PlanRows plan={plan} />
        </div>
      ) : null}
      <p className="mt-4 text-xs text-subtle" data-testid="funding-off-note">
        Creating a draft is free. Funding is not enabled yet, so no payment
        will be taken. The bounty publishes when funding turns on.
      </p>
    </section>
  );
}

function SummaryPanel({
  draft,
  plan,
  isCulture,
  step,
  steps,
  creating,
  onCreate,
}: {
  draft: BountyDraft;
  plan: { rewardMinor: number; feeMinor: number; totalMinor: number } | null;
  isCulture: boolean;
  step: number;
  steps: readonly string[];
  creating: boolean;
  onCreate: () => void;
}) {
  const isReview = step === steps.length - 1;
  return (
    <aside className="space-y-4 lg:sticky lg:top-20" aria-label="Draft summary">
      <div className="rounded-md border border-fg/10 bg-surface/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Your draft</p>
        {draft.title ? (
          <p className="mt-2 text-sm font-medium leading-snug">{draft.title}</p>
        ) : (
          <p className="mt-2 text-sm text-subtle">The title you enter in step one will appear here.</p>
        )}
        <div className="mt-3 border-t border-fg/10 pt-3">
          <ReviewLine label="Step">{`${step + 1} of ${steps.length} · ${steps[step]}`}</ReviewLine>
          {draft.category ? <ReviewLine label="Category">{isCulture ? draft.formats.join(", ") || draft.category : draft.category}</ReviewLine> : null}
          {draft.rewardRupees ? <ReviewLine label="Reward">{`₹${Number(draft.rewardRupees).toLocaleString("en-IN")}`}</ReviewLine> : null}
          {plan ? <div className="mt-3 border-t border-fg/10 pt-3" data-testid="money-plan-summary"><PlanRows plan={plan} /></div> : null}
        </div>
      </div>
      {isReview ? <Button className="w-full" loading={creating} onClick={onCreate}>{creating ? "Creating…" : "Create draft"}</Button> : null}
      {!isReview ? (
        <p className="px-1 text-xs leading-relaxed text-subtle">
          Server-validated on save. You can go back and change any step.
        </p>
      ) : null}
    </aside>
  );
}
