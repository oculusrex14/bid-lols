import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { createBountyFn, fundingPlanFn } from "@/lib/marketplace/bounties";
import { formatMinor } from "@/lib/money";
import { categoriesFor } from "@/lib/marketplace/categories";

/**
 * /bounties/new — sponsor bounty creation (Phase 01, FR-4). The full spec is
 * required up front; the money preview shows the honest decomposition
 * (advertised reward + platform fee) BEFORE anything is committed. Funding
 * completion lives on the bounty page after creation.
 */
const loadCreate = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (!session) throw redirect({ to: "/signin" });
  const product = await currentProductKey();
  return { product, me: (await (await import("@/lib/shell-context")).getShellContext()).me, emailVerified: session.user.emailVerified, categories: categoriesFor(product) };
});

export const Route = createFileRoute("/bounties/new")({
  loader: () => loadCreate(),
  component: NewBountyPage,
});

const field =
  "w-full rounded-md border-2 border-fg/20 bg-surface px-3 py-2.5 text-sm outline-none focus:border-fg/60";
const label = "mb-1.5 block text-sm font-medium";

function NewBountyPage() {
  const d = Route.useLoaderData();
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "creating" }
    | { state: "error"; message: string }
    | { state: "created"; id: string }
  >({ state: "idle" });
  const [plan, setPlan] = useState<{
    rewardMinor: number;
    platformFeeMinor: number;
    sponsorSubtotalMinor: number;
  } | null>(null);

  async function refreshPlan(rewardRupees: string) {
    const minor = Math.round(Number(rewardRupees) * 100);
    if (!Number.isFinite(minor) || minor <= 0) {
      setPlan(null);
      return;
    }
    const p = await fundingPlanFn({ data: { rewardTotalMinor: minor } });
    setPlan({
      rewardMinor: p.rewardMinor,
      platformFeeMinor: p.feeMinor,
      sponsorSubtotalMinor: p.sponsorSubtotal,
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.state === "creating") return;
    const f = new FormData(e.currentTarget);
    const rewardMinor = Math.round(Number(f.get("rewardRupees")) * 100);
    const structure = String(f.get("rewardStructure"));
    const minor = rewardMinor;
    let allocations: Array<{ place: number; amountMinor: number; label?: string }> = [];
    if (structure === "WINNER_TAKES_ALL") {
      allocations = [{ place: 1, amountMinor: minor }];
    } else if (structure === "PODIUM") {
      const first = Math.round(Number(f.get("podiumFirst")) * 100);
      const second = Math.round(Number(f.get("podiumSecond")) * 100);
      const third = Number(f.get("podiumThird") || 0);
      allocations = [
        { place: 1, amountMinor: first, label: "Winner" },
        ...(second > 0 ? [{ place: 2, amountMinor: second, label: "Runner-up" }] : []),
        ...(third > 0 ? [{ place: 3, amountMinor: Math.round(third * 100), label: "Third place" }] : []),
      ];
    } else {
      const winner = Math.round(Number(f.get("poolWinner")) * 100);
      const perFinalist = Math.round(Number(f.get("poolFinalist")) * 100);
      const finalists = Math.max(1, Number(f.get("poolFinalists")));
      allocations = [
        { place: 1, amountMinor: winner, label: "Winner premium" },
        ...Array.from({ length: finalists }, (_, i) => ({
          place: i + 2,
          amountMinor: perFinalist,
          label: `Finalist ${i + 1}`,
        })),
      ];
    }
    setStatus({ state: "creating" });
    try {
      const result = await createBountyFn({
        data: {
          title: String(f.get("title")),
          description: String(f.get("description")),
          category: String(f.get("category")),
          skills: String(f.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
          deliverables: String(f.get("deliverables") ?? ""),
          acceptanceCriteria: String(f.get("acceptanceCriteria") ?? ""),
          rewardTotalMinor: minor,
          rewardStructure: structure as never,
          rewardAllocations: allocations,
          applicationDeadline: f.get("applicationDeadline")
            ? new Date(String(f.get("applicationDeadline"))).toISOString()
            : null,
          submissionDeadline: new Date(String(f.get("submissionDeadline"))).toISOString(),
          participantCap: Math.max(1, Math.round(Number(f.get("participantCap") || 10))),
          qualificationMode: (String(f.get("qualificationMode")) || "SPONSOR_APPROVAL") as never,
          ipAndConfidentiality: String(f.get("ipAndConfidentiality") ?? ""),
        },
      });
      if (result.ok) {
        setStatus({ state: "created", id: result.id });
        void navigate({ to: "/bounties/$id", params: { id: result.id } });
      } else {
        setStatus({ state: "error", message: result.message });
      }
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Invalid data." });
    }
  }

  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Sponsor</p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">Post a bounty</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          A bounty is bounded work with a fixed reward. It opens to
          applications only once the reward is funded, and the advertised
          reward is exactly what the winner receives. The platform fee is
          charged to you on top of the reward, and the split is shown here
          before you commit to anything.
        </p>

        {!d.emailVerified ? (
          <div className="mt-6 rounded-md border-2 border-warn/40 bg-raised/40 p-4 text-sm" data-testid="unverified-note">
            Money-facing actions need a verified email. Verification email
            delivery is not configured yet. An admin can verify manually.
            You can draft the bounty now and fund it after verification.
          </div>
        ) : null}

        <form onSubmit={onSubmit} noValidate className="mt-6" data-testid="create-bounty-form">
          <div className="rounded-lg border-2 border-fg/20 bg-surface p-5">
            <div className="grid gap-4">
              <div>
                <label htmlFor="bn-title" className={label}>Title</label>
                <input id="bn-title" name="title" required minLength={8} maxLength={140} placeholder="Design a landing page for our launch" className={field} />
              </div>
              <div>
                <label htmlFor="bn-desc" className={label}>What needs to happen?</label>
                <textarea id="bn-desc" name="description" rows={5} required minLength={20} maxLength={20000} className="w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="bn-cat" className={label}>Category</label>
                  <input id="bn-cat" name="category" required maxLength={40} list="bn-cat-list" placeholder={d.categories[0] ?? "design"} className={field} />
                  <datalist id="bn-cat-list">
                    {(d.categories ?? []).map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label htmlFor="bn-skills" className={label}>Skills (comma-separated)</label>
                  <input id="bn-skills" name="skills" placeholder="figma, tailwind" className={field} />
                </div>
              </div>
              <div>
                <label htmlFor="bn-deliv" className={label}>Deliverables</label>
                <textarea id="bn-deliv" name="deliverables" rows={3} maxLength={8000} className="w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
              </div>
              <div>
                <label htmlFor="bn-accept" className={label}>Acceptance criteria</label>
                <textarea id="bn-acc" name="acceptanceCriteria" rows={3} maxLength={8000} className="w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border-2 border-fg/20 bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Money, explicit and honest</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="bn-reward" className={label}>Advertised reward (₹)</label>
                <input
                  id="bn-reward" name="rewardRupees" type="number" required min={1000} step={1}
                  onChange={(e) => void refreshPlan(e.target.value)}
                  className={field} data-testid="reward-input"
                />
                <p className="mt-1 text-xs text-subtle">Winners receive exactly this amount.</p>
              </div>
              <div>
                <label htmlFor="bn-struct" className={label}>Reward structure</label>
                <select id="bn-struct" name="rewardStructure" className={field} defaultValue="WINNER_TAKES_ALL">
                  <option value="WINNER_TAKES_ALL">Winner takes all</option>
                  <option value="PODIUM">Podium (top 3)</option>
                  <option value="FINALIST_POOL">Finalist pool + winner premium</option>
                </select>
              </div>
            </div>

            {plan ? (
              <div className="mt-4 rounded-md border-2 border-up/30 bg-raised/40 p-4 text-sm" data-testid="money-plan">
                <p className="font-medium">You will pay: {formatMinor(plan.sponsorSubtotalMinor)}</p>
                <p className="mt-1 text-sm text-muted">
                  = reward {formatMinor(plan.rewardMinor)} + platform fee{" "}
                  {formatMinor(plan.platformFeeMinor)} (charged to you, never deducted from the reward).
                </p>
              </div>
            ) : null}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="bn-sub-deadline" className={label}>Submission deadline</label>
                <input id="bn-sub-deadline" name="submissionDeadline" type="datetime-local" required className={field} />
              </div>
              <div>
                <label htmlFor="bn-app-deadline" className={label}>Application deadline (optional)</label>
                <input id="bn-app-deadline" name="applicationDeadline" type="datetime-local" className={field} />
              </div>
              <div>
                <label htmlFor="bn-cap" className={label}>Participant cap</label>
                <input id="bn-cap" name="participantCap" type="number" min={1} max={200} defaultValue={10} className={field} />
              </div>
              <div>
                <label htmlFor="bn-qual" className={label}>Who can work?</label>
                <select id="bn-qual" name="qualificationMode" className={field} defaultValue="SPONSOR_APPROVAL">
                  <option value="SPONSOR_APPROVAL">I approve each applicant</option>
                  <option value="APPLICATION_ONLY">Anyone under the cap (application-only)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="bn-p1" className={label}>Podium: 1st (₹)</label>
                <input id="bn-p1" name="podiumFirst" type="number" min={0} className={field} />
              </div>
              <div>
                <label htmlFor="bn-p2" className={label}>2nd (₹)</label>
                <input id="bn-p2" name="podiumSecond" type="number" min={0} className={field} />
              </div>
              <div>
                <label htmlFor="bn-p3" className={label}>3rd (₹)</label>
                <input id="bn-p3" name="podiumThird" type="number" min={0} className={field} />
              </div>
              <div>
                <label htmlFor="bn-pw" className={label}>Pool: winner premium (₹)</label>
                <input id="bn-pw" name="poolWinner" type="number" min={0} className={field} />
              </div>
              <div>
                <label htmlFor="bn-pf" className={label}>Pool: per finalist (₹)</label>
                <input id="bn-pfr" name="poolFinalist" type="number" min={0} className={field} />
              </div>
              <div>
                <label htmlFor="bn-pfn" className={label}>Pool: finalist count</label>
                <input id="bn-pfn" name="poolFinalists" type="number" min={1} max={199} className={field} />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border-2 border-fg/20 bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Rules</p>
            <div className="mt-3">
              <label htmlFor="bn-ip" className={label}>IP & confidentiality rules</label>
              <textarea
                id="bn-ip" name="ipAndConfidentiality" rows={3} maxLength={4000}
                placeholder="e.g. The winning deliverable's IP transfers to us after the reward is paid. Non-winning entries stay with their authors."
                className="w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60"
              />
            </div>
          </div>

          {status.state === "error" ? (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">{status.message}</p>
          ) : null}

          <button
            type="submit"
            disabled={status.state === "creating"}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status.state === "creating" ? "Creating…" : "Create bounty (draft)"}
          </button>
          <p className="mt-2 text-xs text-subtle">
            Creating a draft is free. A bounty publishes only after its reward
            is funded. Funding is not enabled yet, so your draft is saved here
            and opens the moment funding turns on.
          </p>
        </form>
      </div>
    </ProductShell>
  );
}