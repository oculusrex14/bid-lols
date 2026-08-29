import type { ReactNode } from "react";
import { Camera, Mic, PenTool, Tag, Type, Users, Video, Wrench } from "lucide-react";
import { FormSection } from "@/components/ui/layout";
import { Field, Input, Textarea, Select, CheckRow } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatMinor } from "@/lib/money";

/**
 * Bounty creation steps (RC3, S-25/S-26). The shared creation framework:
 * FoundersBid walks five steps (what / done / participation / reward /
 * review); CultureBid leads with the format question and adds the brief
 * step. Reward structure fields are CONDITIONAL: winner-takes-all renders
 * no split fields, podium renders only podium fields, pool only pool
 * fields. The server remains authoritative; this is disclosure, not rules.
 */

export type BountyDraft = {
  title: string;
  category: string;
  description: string;
  skills: string;
  deliverables: string;
  acceptanceCriteria: string;
  ipAndConfidentiality: string;
  participantCap: string;
  qualificationMode: "SPONSOR_APPROVAL" | "APPLICATION_ONLY";
  applicationDeadline: string;
  submissionDeadline: string;
  rewardRupees: string;
  rewardStructure: "WINNER_TAKES_ALL" | "PODIUM" | "FINALIST_POOL";
  podiumFirst: string;
  podiumSecond: string;
  podiumThird: string;
  poolWinner: string;
  poolFinalist: string;
  poolFinalists: string;
  // CultureBid brief
  formats: string[];
  targetPlatform: string;
  publicPostingRequired: boolean;
  performanceMeasured: boolean;
  usageNotes: string;
};

export type StepErrors = Record<string, string>;

export const CATEGORIES_FOUNDER: string[] = [
  "development", "design", "research", "copy", "automation", "data", "marketing", "debugging", "audit",
];
export const CATEGORIES_CULTURE: string[] = [
  "ugc", "video", "photography", "design", "writing", "naming", "social content", "music", "memes", "brand challenge",
];

export const BOUNTY_STEPS = ["What needs doing", "What done means", "Participation", "Reward", "Review"] as const;
export const CULTURE_STEPS = ["Commissioning", "The brief", "What done means", "Participation", "Reward", "Review"] as const;

const FORMAT_LABELS: Array<{ label: string; value: string; icon: typeof Camera }> = [
  { label: "UGC", value: "ugc", icon: Users },
  { label: "Short video", value: "video", icon: Video },
  { label: "Photography", value: "photography", icon: Camera },
  { label: "Design", value: "design", icon: PenTool },
  { label: "Writing", value: "writing", icon: Type },
  { label: "Naming", value: "naming", icon: Tag },
  { label: "Social content", value: "social content", icon: Users },
  { label: "Music", value: "music", icon: Mic },
  { label: "Memes", value: "memes", icon: Type },
  { label: "Brand challenge", value: "brand challenge", icon: Wrench },
];

/** Step 1 (Founders): the work itself. */
export function StepWhat({
  d,
  set,
  errors,
  categories,
}: {
  d: BountyDraft;
  set: <K extends keyof BountyDraft>(k: K, v: BountyDraft[K]) => void;
  errors: StepErrors;
  categories: string[];
}) {
  return (
    <FormSection
      title="What needs doing?"
      description="One bounded piece of work. If it needs several people working for months, that is a project or a team project, not a bounty."
    >
      <Field label="Title" required error={errors.title} id="bn-title">
        <Input
          id="bn-title"
          value={d.title}
          invalid={Boolean(errors.title)}
          onChange={(e) => set("title", e.target.value)}
          required
          minLength={8}
          maxLength={140}
          placeholder="Fix onboarding drop-off for our B2B SaaS"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" required error={errors.category} id="bn-cat">
          <Input
            id="bn-cat"
            value={d.category}
            invalid={Boolean(errors.category)}
            onChange={(e) => set("category", e.target.value)}
            required
            maxLength={40}
            list="bn-cat-list"
            placeholder={categories[0] ?? "development"}
          />
          <datalist id="bn-cat-list">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Skills (comma-separated)" hint="Optional, helps the right people find it." id="bn-skills">
          <Input id="bn-skills" value={d.skills} onChange={(e) => set("skills", e.target.value)} placeholder="figma, tailwind" />
        </Field>
      </div>
      <Field label="Description" required error={errors.description} id="bn-desc">
        <Textarea
          id="bn-desc"
          value={d.description}
          invalid={Boolean(errors.description)}
          onChange={(e) => set("description", e.target.value)}
          rows={5}
          required
          minLength={20}
          maxLength={20000}
          placeholder="Context, constraints, and anything a participant should know before starting."
        />
      </Field>
    </FormSection>
  );
}

/** CultureBid lead-in: "What are you commissioning?" — format first. */
export function StepCommissioning({
  d,
  set,
  errors,
}: {
  d: BountyDraft;
  set: <K extends keyof BountyDraft>(k: K, v: BountyDraft[K]) => void;
  errors: StepErrors;
}) {
  const toggleFormat = (v: string) => {
    set("formats", d.formats.includes(v) ? d.formats.filter((f) => f !== v) : [...d.formats, v]);
  };
  return (
    <FormSection
      title="What are you commissioning?"
      description="Pick the format first. The format sets what the brief asks and how the work will be judged."
    >
      <div role="radiogroup" aria-label="Creative format" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FORMAT_LABELS.map((f) => {
          const active = d.formats.includes(f.value);
          return (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => toggleFormat(f.value)}
              className={cn(
                "flex items-center gap-2.5 rounded-sm border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150",
                active ? "border-accent bg-accent-soft text-accent" : "border-fg/15 bg-surface text-muted hover:border-fg/40",
              )}
            >
              <f.icon className="size-4 shrink-0" aria-hidden="true" />
              {f.label}
            </button>
          );
        })}
      </div>
      {errors.formats ? <p className="mt-2 text-xs font-medium text-danger">{errors.formats}</p> : null}
      <div className="mt-4">
        <Field label="Title" required error={errors.title} id="bn-title">
          <Input
            id="bn-title"
            value={d.title}
            invalid={Boolean(errors.title)}
            onChange={(e) => set("title", e.target.value)}
            required
            minLength={8}
            maxLength={140}
            placeholder="Three 15-second Reels for a skincare launch"
          />
        </Field>
      </div>
    </FormSection>
  );
}

/** CultureBid brief details (formats -> structured brief fields). */
export function StepBrief({
  d,
  set,
  errors,
}: {
  d: BountyDraft;
  set: <K extends keyof BountyDraft>(k: K, v: BountyDraft[K]) => void;
  errors: StepErrors;
}) {
  return (
    <FormSection
      title="The brief"
      description="What the creator must deliver, where it will run, and how the winning work is licensed. All of it is public before anyone starts."
    >
      <Field label="Description" required error={errors.description} id="bn-desc">
        <Textarea
          id="bn-desc"
          value={d.description}
          invalid={Boolean(errors.description)}
          onChange={(e) => set("description", e.target.value)}
          rows={5}
          required
          minLength={20}
          maxLength={20000}
          placeholder="The ask, the tone, references, and anything else a creator needs."
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Platform / channel" hint="Where the work will live." id="bn-platform">
          <Input
            id="bn-platform"
            value={d.targetPlatform}
            onChange={(e) => set("targetPlatform", e.target.value)}
            maxLength={120}
            placeholder="Instagram Reels"
          />
        </Field>
        <Field label="Usage / licensing" hint="Who owns the winning work, and how it may be used." id="bn-usage">
          <Input
            id="bn-usage"
            value={d.usageNotes}
            onChange={(e) => set("usageNotes", e.target.value)}
            maxLength={2000}
            placeholder="Paid amplification for 90 days, no edits"
          />
        </Field>
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        <CheckRow
          type="checkbox"
          checked={d.publicPostingRequired}
          onChange={(v) => set("publicPostingRequired", v)}
          label="Creator must post publicly"
          description="The winning work is posted on the creator's own account."
        />
        <CheckRow
          type="checkbox"
          checked={d.performanceMeasured}
          onChange={(v) => set("performanceMeasured", v)}
          label="Performance matters"
          description="Reach/engagement is part of judging (self-reported unless an API integration exists)."
        />
      </div>
    </FormSection>
  );
}

/** Step 2 (Founders): what "done" means. */
export function StepDone({
  d,
  set,
}: {
  d: BountyDraft;
  set: <K extends keyof BountyDraft>(k: K, v: BountyDraft[K]) => void;
}) {
  return (
    <FormSection
      title="What does “done” mean?"
      description="Deliverables, acceptance criteria, and IP rules are published with the bounty. A participant should be able to tell, before starting, exactly what they are making and who owns it."
    >
      <Field label="Deliverables" hint="What will exist when the work is finished." id="bn-deliv">
        <Textarea id="bn-deliv" value={d.deliverables} onChange={(e) => set("deliverables", e.target.value)} rows={3} maxLength={8000} />
      </Field>
      <Field label="Acceptance criteria" hint="How you will know the work is right." id="bn-acc">
        <Textarea id="bn-acc" value={d.acceptanceCriteria} onChange={(e) => set("acceptanceCriteria", e.target.value)} rows={3} maxLength={8000} />
      </Field>
      <Field label="IP & confidentiality" id="bn-ip">
        <Textarea
          id="bn-ip"
          value={d.ipAndConfidentiality}
          onChange={(e) => set("ipAndConfidentiality", e.target.value)}
          rows={3}
          maxLength={4000}
          placeholder="e.g. The winning deliverable's IP transfers to us after the reward is paid. Non-winning entries stay with their authors."
        />
      </Field>
    </FormSection>
  );
}

/** Step 3: who participates and when. */
export function StepParticipation({
  d,
  set,
  errors,
}: {
  d: BountyDraft;
  set: <K extends keyof BountyDraft>(k: K, v: BountyDraft[K]) => void;
  errors: StepErrors;
}) {
  return (
    <FormSection
      title="Participation"
      description="The cap bounds the field; the qualification mode decides who gets in."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Participant cap" required error={errors.participantCap} id="bn-cap" hint="How many people can take part. Bounded, never unlimited.">
          <Input
            id="bn-cap"
            type="number"
            min={1}
            max={200}
            value={d.participantCap}
            invalid={Boolean(errors.participantCap)}
            onChange={(e) => set("participantCap", e.target.value)}
            className="tabular"
          />
        </Field>
        <Field label="Who can work?" required id="bn-qual">
          <Select
            id="bn-qual"
            name="qualificationMode"
            value={d.qualificationMode}
            onChange={(e) => set("qualificationMode", e.target.value as BountyDraft["qualificationMode"])}
          >
            <option value="SPONSOR_APPROVAL">I approve each applicant</option>
            <option value="APPLICATION_ONLY">Anyone under the cap (application-only)</option>
          </Select>
        </Field>
        <Field label="Application deadline" hint="Optional. When applications stop." error={errors.applicationDeadline} id="bn-app-deadline">
          <Input
            id="bn-app-deadline"
            type="datetime-local"
            value={d.applicationDeadline}
            invalid={Boolean(errors.applicationDeadline)}
            onChange={(e) => set("applicationDeadline", e.target.value)}
          />
        </Field>
        <Field label="Submission deadline" required error={errors.submissionDeadline} id="bn-sub-deadline">
          <Input
            id="bn-sub-deadline"
            type="datetime-local"
            required
            value={d.submissionDeadline}
            invalid={Boolean(errors.submissionDeadline)}
            onChange={(e) => set("submissionDeadline", e.target.value)}
          />
        </Field>
      </div>
    </FormSection>
  );
}

/**
 * Step 4: the reward — conditional fields only. Winner-takes-all renders no
 * split fields; podium renders podium; pool renders pool. The allocation
 * must sum exactly to the advertised reward (validated here AND by the
 * engine — the engine wins).
 */
export function StepReward({
  d,
  set,
  errors,
  plan,
}: {
  d: BountyDraft;
  set: <K extends keyof BountyDraft>(k: K, v: BountyDraft[K]) => void;
  errors: StepErrors;
  plan: { rewardMinor: number; feeMinor: number; totalMinor: number } | null;
}) {
  const num = (v: string) => (v === "" ? 0 : Math.round(Number(v) * 100));
  const allocated =
    d.rewardStructure === "PODIUM"
      ? num(d.podiumFirst) + num(d.podiumSecond) + num(d.podiumThird)
      : d.rewardStructure === "FINALIST_POOL"
        ? num(d.poolWinner) + num(d.poolFinalist) * Math.max(1, Number(d.poolFinalists) || 1)
        : num(d.rewardRupees);
  const rewardMinor = num(d.rewardRupees);
  const mismatch =
    rewardMinor > 0 && (d.rewardStructure !== "WINNER_TAKES_ALL" && allocated !== rewardMinor);

  return (
    <FormSection
      title="Reward"
      description="The advertised reward is exactly what winners receive. The platform fee is charged to you on top, and the split is shown before you commit to anything."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Advertised reward (rupees)" required error={errors.reward} id="bn-reward" hint="Minimum 1,000 rupees. Winners receive exactly this amount.">
          <Input
            id="bn-reward"
            name="rewardRupees"
            type="number"
            min={1000}
            step={1}
            value={d.rewardRupees}
            invalid={Boolean(errors.reward)}
            onChange={(e) => set("rewardRupees", e.target.value)}
            data-testid="reward-input"
            className="tabular"
          />
        </Field>
        <Field label="Reward structure" required id="bn-struct">
          <Select
            id="bn-struct"
            name="rewardStructure"
            value={d.rewardStructure}
            onChange={(e) => set("rewardStructure", e.target.value as BountyDraft["rewardStructure"])}
          >
            <option value="WINNER_TAKES_ALL">Winner takes all</option>
            <option value="PODIUM">Podium (top 3)</option>
            <option value="FINALIST_POOL">Finalist pool + winner premium</option>
          </Select>
        </Field>
      </div>

      {d.rewardStructure === "PODIUM" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="1st place (₹)" id="bn-p1">
            <Input id="bn-p1" name="podiumFirst" type="number" min={0} value={d.podiumFirst} onChange={(e) => set("podiumFirst", e.target.value)} className="tabular" />
          </Field>
          <Field label="2nd place (₹)" id="bn-p2">
            <Input id="bn-p2" name="podiumSecond" type="number" min={0} value={d.podiumSecond} onChange={(e) => set("podiumSecond", e.target.value)} className="tabular" />
          </Field>
          <Field label="3rd place (₹)" id="bn-p3">
            <Input id="bn-p3" name="podiumThird" type="number" min={0} value={d.podiumThird} onChange={(e) => set("podiumThird", e.target.value)} className="tabular" />
          </Field>
          {mismatch ? (
            <p className="text-xs font-medium text-danger sm:col-span-3">
              The split must add up to the advertised reward. ({formatMinor(allocated)} of {formatMinor(rewardMinor)} allocated.)
            </p>
          ) : null}
        </div>
      ) : null}

      {d.rewardStructure === "FINALIST_POOL" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Winner premium (₹)" id="bn-pw">
            <Input id="bn-pw" name="poolWinner" type="number" min={0} value={d.poolWinner} onChange={(e) => set("poolWinner", e.target.value)} className="tabular" />
          </Field>
          <Field label="Per finalist (₹)" id="bn-pfr">
            <Input id="bn-pfr" name="poolFinalist" type="number" min={0} value={d.poolFinalist} onChange={(e) => set("poolFinalist", e.target.value)} className="tabular" />
          </Field>
          <Field label="Finalists" id="bn-pfn">
            <Input id="bn-pfn" name="poolFinalists" type="number" min={1} max={199} value={d.poolFinalists} onChange={(e) => set("poolFinalists", e.target.value)} className="tabular" />
          </Field>
          {mismatch ? (
            <p className="text-xs font-medium text-danger sm:col-span-3">
              The pool must add up to the advertised reward. ({formatMinor(allocated)} of {formatMinor(rewardMinor)} allocated.)
            </p>
          ) : null}
        </div>
      ) : null}

      {plan ? (
        <div className="mt-5 rounded-sm border border-up/30 bg-raised/40 p-4" data-testid="money-plan">
          <PlanRows plan={plan} />
        </div>
      ) : null}
    </FormSection>
  );
}

/** Reward / fee / total, the shared decomposition (never floats, never hidden). */
export function PlanRows({ plan }: { plan: { rewardMinor: number; feeMinor: number; totalMinor: number } }) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-muted">You will pay</dt>
        <dd className="tabular font-semibold">{formatMinor(plan.totalMinor)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-xs text-subtle">Advertised reward</dt>
        <dd className="tabular text-sm">{formatMinor(plan.rewardMinor)}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-xs text-subtle">Platform fee (charged to you, never deducted from the reward)</dt>
        <dd className="tabular text-sm">{formatMinor(plan.feeMinor)}</dd>
      </div>
    </dl>
  );
}

export function ReviewLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="row-line flex items-baseline justify-between gap-4 px-1 py-2 text-sm">
      <span className="text-xs uppercase tracking-kicker text-subtle">{label}</span>
      <span className="min-w-0 text-right font-medium">{children}</span>
    </div>
  );
}
