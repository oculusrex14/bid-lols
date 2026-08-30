import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { createProjectFn } from "@/lib/marketplace/projects";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { formatMajor } from "@/lib/money";
import { FormSection } from "@/components/ui/layout";
import { StepIndicator } from "@/components/ui/market";
import { InlineNotice } from "@/components/ui/states";
import { CATEGORIES_FOUNDER } from "@/components/create/bounty-steps";

/**
 * /projects/new — sponsor project creation (Mode B; RC3, S-24).
 * Two steps: the work, then budget + rules. Live summary on the right.
 * Proposals come pre-work; funding happens after one provider is selected.
 */
const loadCreate = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (!session) throw redirect({ to: "/signin" });
  const shellContext = await (await import("@/lib/shell-context")).getShellContext();
    return {
      product: await currentProductKey(),
      me: shellContext.me,
      funding: shellContext.funding,
      // RC5.1 WS8: the form's default currency (viewer region).
      viewerCurrency: shellContext.viewerCurrency,
    };
});

export const Route = createFileRoute("/projects/new")({
  loader: () => loadCreate(),
  component: NewProjectPage,
});

type Draft = {
  title: string;
  description: string;
  category: string;
  skills: string;
  budgetMin: string;
  budgetMax: string;
  /** RC5.1 WS8: the project's currency (major-unit budget fields). */
  currency: "INR" | "USD";
  proposalDeadline: string;
  ipAndConfidentiality: string;
};

function NewProjectPage() {
  const d = Route.useLoaderData();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    description: "",
    category: "",
    skills: "",
    budgetMin: "",
    budgetMax: "",
    currency: d.viewerCurrency,
    proposalDeadline: "",
    ipAndConfidentiality: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((p) => ({ ...p, [k]: v }));

  function validate(only: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (only === 0) {
      if (draft.title.trim().length < 8) e.title = "At least 8 characters.";
      if (draft.category.trim().length < 2) e.category = "Pick or type a category.";
      if (draft.description.trim().length < 20) e.description = "At least 20 characters.";
    }
    if (only === 1) {
      const min = draft.budgetMin ? Number(draft.budgetMin) : 0;
      const max = draft.budgetMax ? Number(draft.budgetMax) : 0;
      if (min > 0 && max > 0 && max < min) e.budgetMax = "Budget to must be at least budget from.";
      if (draft.proposalDeadline && Number.isNaN(new Date(draft.proposalDeadline).getTime())) e.proposalDeadline = "Invalid date.";
    }
    return e;
  }

  const next = () => {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => s + 1);
  };

  async function doCreate() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const result = await createProjectFn({
        data: {
          title: draft.title,
          description: draft.description,
          category: draft.category,
          skills: draft.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
          budgetMin: draft.budgetMin ? Number(draft.budgetMin) : undefined,
          budgetMax: draft.budgetMax ? Number(draft.budgetMax) : undefined,
          currency: draft.currency,
          proposalDeadline: draft.proposalDeadline
            ? new Date(draft.proposalDeadline).toISOString()
            : undefined,
          ipAndConfidentiality: draft.ipAndConfidentiality,
        },
      });
      if (result.ok) {
        void navigate({ to: "/projects/$id", params: { id: result.id } });
      } else {
        setError(result.message);
        setCreating(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid data.");
      setCreating(false);
    }
  }

  return (
    <ProductShell site={d.product} me={d.me} funding={d.funding}>
      <div className="canvas-wide pb-16">
        <header className="border-b border-fg/10 py-6">
          <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Sponsor · project</p>
          <h1 className="mt-1 font-display-site text-3xl tracking-tight">Post a project</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Providers respond with an approach, evidence and a milestone plan, not with finished deliverables. You select one provider, then fund the work.
          </p>
          <div className="mt-4 hidden md:block">
            <StepIndicator steps={["The work", "Budget & rules"]} current={step} />
          </div>
        </header>

        {error ? (
          <div data-testid="create-error" className="mt-6">
            <InlineNotice tone="down">{error}</InlineNotice>
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12" data-testid="create-project-form">
          <div className="lg:col-span-8">
            {step === 0 ? (
              <ProjectBriefFields draft={draft} set={set} errors={errors} />
            ) : (
              <ProjectRulesForm draft={draft} set={set} errors={errors} />
            )}
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-fg/10 pt-5">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                Back
              </Button>
              {step === 0 ? (
                <Button onClick={next}>Continue</Button>
              ) : (
                <Button loading={creating} onClick={doCreate}>
                  {creating ? "Creating…" : "Create project (draft)"}
                </Button>
              )}
            </div>
          </div>
          <div className="lg:col-span-4">
            <ProjectSummary draft={draft} />
          </div>
        </div>
      </div>
    </ProductShell>
  );
}

/** Step 1: the work. */
function ProjectBriefFields({
  draft,
  set,
  errors,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  errors: Record<string, string>;
}) {
  return (
              <FormSection title="What needs doing?" description="One piece of work with a clear scope. If several people should compete on a bounded task, that is a bounty instead.">
                <Field label="Title" required error={errors.title} id="pr-title">
                  <Input id="pr-title" value={draft.title} invalid={Boolean(errors.title)} onChange={(e) => set("title", e.target.value)} required minLength={8} maxLength={140} placeholder="Build an MVP billing dashboard" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Category" required error={errors.category} id="pr-cat">
                    <Input id="pr-cat" value={draft.category} invalid={Boolean(errors.category)} onChange={(e) => set("category", e.target.value)} required maxLength={40} list="pr-cat-list" placeholder={CATEGORIES_FOUNDER[0]} />
                    <datalist id="pr-cat-list">
                      {CATEGORIES_FOUNDER.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Skills (comma-separated)" id="pr-skills">
                    <Input id="pr-skills" value={draft.skills} onChange={(e) => set("skills", e.target.value)} placeholder="postgres, tailwind" />
                  </Field>
                </div>
                <Field label="The brief" required error={errors.description} id="pr-desc">
                  <Textarea id="pr-desc" value={draft.description} invalid={Boolean(errors.description)} onChange={(e) => set("description", e.target.value)} rows={6} required minLength={20} maxLength={30000} />
                </Field>
              </FormSection>
  );
}

/** Step 2: budget + rules. */
function ProjectRulesForm({
  draft,
  set,
  errors,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  errors: Record<string, string>;
}) {
  return (
              <FormSection title="Budget & rules" description="The budget range guides proposals; the final amount is the quote you select.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={`Budget from (${draft.currency}, optional)`} id="pr-bmin">
                    <Input id="pr-bmin" value={draft.budgetMin} onChange={(e) => set("budgetMin", e.target.value)} type="number" min={0} className="tabular" />
                  </Field>
                  <Field label={`Budget to (${draft.currency}, optional)`} error={errors.budgetMax} id="pr-bmax">
                    <Input id="pr-bmax" value={draft.budgetMax} invalid={Boolean(errors.budgetMax)} onChange={(e) => set("budgetMax", e.target.value)} type="number" min={0} className="tabular" />
                  </Field>
                  {/* RC5.1 WS8: the project's currency. Changing it changes
                      the denomination, never the numbers (no FX). */}
                  <Field label="Currency" required id="pr-currency" hint="Fixed when the project is created.">
                    <Select
                      id="pr-currency"
                      name="currency"
                      value={draft.currency}
                      onChange={(e) => set("currency", e.target.value as Draft["currency"])}
                      data-testid="project-currency"
                    >
                      <option value="INR">₹ Indian rupee (INR)</option>
                      <option value="USD">$ US dollar (USD)</option>
                    </Select>
                  </Field>
                  <Field label="Proposal deadline (optional)" error={errors.proposalDeadline} id="pr-dl">
                    <Input id="pr-dl" value={draft.proposalDeadline} invalid={Boolean(errors.proposalDeadline)} onChange={(e) => set("proposalDeadline", e.target.value)} type="datetime-local" />
                  </Field>
                </div>
                <Field label="IP & confidentiality" id="pr-ip">
                  <Textarea id="pr-ip" value={draft.ipAndConfidentiality} onChange={(e) => set("ipAndConfidentiality", e.target.value)} rows={2} maxLength={4000} />
                </Field>
              </FormSection>
  );
}
/** Live draft summary (RC3, S-24). */
function ProjectSummary({ draft }: { draft: Draft }) {
  return (
            <aside className="space-y-4 lg:sticky lg:top-20" aria-label="Draft summary">
              <div className="rounded-md border border-fg/10 bg-surface/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Your draft</p>
                {draft.title ? <p className="mt-2 text-sm font-medium leading-snug">{draft.title}</p> : <p className="mt-2 text-sm text-subtle">The title will appear here.</p>}
                <dl className="mt-3 space-y-2 border-t border-fg/10 pt-3 text-sm">
                  {draft.category ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-xs uppercase tracking-kicker text-subtle">Category</dt>
                      <dd>{draft.category}</dd>
                    </div>
                  ) : null}
                  {draft.budgetMin || draft.budgetMax ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-xs uppercase tracking-kicker text-subtle">Budget</dt>
                      <dd className="tabular">
                        {draft.budgetMin ? formatMajor(Number(draft.budgetMin), draft.currency) : ""}
                        {draft.budgetMin && draft.budgetMax ? " – " : ""}
                        {draft.budgetMax ? formatMajor(Number(draft.budgetMax), draft.currency) : ""}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
              <p className="px-1 text-xs leading-relaxed text-subtle">
                Creating a draft is free. Projects are funded only after you select a provider, when funding is enabled.
              </p>
            </aside>
  );
}
