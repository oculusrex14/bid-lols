import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { PageHeader } from "@/components/ui/layout";
import { InlineNotice } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";

/**
 * /bid-index — the Bid Index methodology surface (RC4 §3.2/§58). Logged out:
 * what the score measures, the bands, the eligibility rule, and why an
 * honest network starts empty. Logged in: the member's own report (roles,
 * confidence, pillars) plus the link to the private explanation
 * (/settings/trust). No fake scores: NR until real evidence exists.
 */
type RoleView = {
  role: string;
  status: string;
  score: number | null;
  band: string;
  confidence: number;
  confidenceLabel: string;
  pillars: Record<string, number>;
  primaryOutcomes: number;
  uniqueCounterparties: number;
};

type OverallView = {
  status: string;
  score: number | null;
  band: string;
  confidence: number;
  confidenceLabel: string;
} | null;

const loadIndex = createServerFn({ method: "GET" }).handler(async () => {
  const product = await currentProductKey();
  const { me, funding } = await (await import("@/lib/shell-context")).getShellContext();
  let trust: Awaited<ReturnType<typeof loadTrustBlock>> | null = null;
  if (me) {
    trust = await loadTrustBlock(me.id).catch(() => null);
  }
  return { product, me, funding, trust };
});

async function loadTrustBlock(userId: string): Promise<{
  overall: OverallView;
  roles: Array<RoleView>;
  modelVersion: string;
}> {
  const { publicTrustFor } = await import("@/lib/trust/score.server");
  const block = await publicTrustFor(userId);
  return {
    overall: block.overall,
    roles: block.roles,
    modelVersion: block.modelVersion,
  };
}

export const Route = createFileRoute("/bid-index")({
  loader: () => loadIndex(),
  component: BidIndexPage,
});

function BidIndexPage() {
  const d = Route.useLoaderData();
  return (
    <ProductShell site={d.product as ProductKey} me={d.me} funding={d.funding}>
      <div className="canvas-wide pb-16">
        <PageHeader
          kicker="Bidthrone · Bid Index"
          title="Reputation built from completed work."
          lead="The Bid Index is a marketplace trust score based on verified outcomes on the Bid Network. It is not a credit score and does not use credit-bureau information. It answers one question: how much evidence is there that this person honours the commitments they make here?"
        />

        {d.trust?.overall ? <PersonalReport trust={d.trust} /> : null}
        {d.trust && !d.trust.overall ? <PersonalNRBlock trust={d.trust} /> : null}

        <section className="mt-10" data-testid="bid-index-methodology">
          <h2 className="text-base font-semibold tracking-tight">How it works</h2>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <MethodCard title="What it measures">
              One identity, three role scores: <strong>Provider</strong> (did the work),{" "}
              <strong>Sponsor</strong> (funded and decided fairly), <strong>Captain</strong>
              {" "} (carried a team project). Bidthrone itself creates no work; it reads
              the marketplace record across foundersbid.lol, culturebid.lol and bidception.lol.
            </MethodCard>
            <MethodCard title="When you get a number">
              A role first becomes scoreable at <strong>two completed outcomes with two
              independent counterparties</strong>. Before that the profile shows NR:
              Not enough history. One large project, however large, cannot buy a
              score, and two quick jobs with the same person cannot either.
            </MethodCard>
            <MethodCard title="What the evidence weighs">
              Completed work of larger size counts somewhat more, with a hard
              logarithmic cap; objectively structured work complexity adds a
              bounded amount; recent work carries a small premium that never
              erodes old history. Repeated jobs with the same counterparty
              count less and less, and self-dealing counts for nothing.
            </MethodCard>
            <MethodCard title="What disputes do">
              Nothing until responsibility is finally adjudicated. An open
              dispute has zero effect, and complaining costs nothing. Losing a
              bounty never hurts a builder. At-fault findings feed the failure
              evidence; vindicated parties are untouched.
            </MethodCard>
            <MethodCard title="Confidence, not certainty">
              Every score carries a confidence tier, Provisional, Supported or
              High, from the effective number of independent verified
              outcomes. A provisional number and an established one are
              displayed as different evidence strengths.
            </MethodCard>
            <MethodCard title="Hard caps">
              A serious recent default caps the displayed score (649 for the
              first 180 days, then a two-year recovery), no matter how long
              the clean history behind it. Confirmed fraud suspends the
              numeric score entirely while the account is restricted.
            </MethodCard>
          </div>
        </section>

        <section className="mt-10" data-testid="bid-index-bands">
          <h2 className="text-base font-semibold tracking-tight">Bands (model {d.trust?.modelVersion ?? "BI-1.0"})</h2>
          <dl className="mt-4 grid gap-x-10 gap-y-1 text-sm sm:grid-cols-2">
            {[
              ["NR", "Not enough history"],
              ["300–499", "Critical observed risk"],
              ["500–599", "High observed risk"],
              ["600–679", "Caution"],
              ["680–739", "Building"],
              ["740–799", "Established"],
              ["800–849", "Strong"],
              ["850–900", "Exceptional"],
            ].map(([range, label]) => (
              <div key={range} className="row-line flex items-center justify-between py-1.5">
                <dt className="tabular font-medium">{range}</dt>
                <dd className="text-muted">{label}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-subtle">
            These are descriptive bands of historical behavioural evidence,
            not guarantees about future conduct. The full methodology, priors,
            and formulas are published in the network documentation, and the
            model is versioned: BI-1.0.
          </p>
        </section>

        <InlineNotice className="mt-10">
          Score appeal: facts can be challenged and corrected through the
          appeal process; corrections go through audited reversal events, and
          no one can set a score by hand. Paid verification, if introduced
          later, earns zero Bid Index effect.
        </InlineNotice>

        {!d.me ? (
          <div className="mt-6">
            <ButtonLink href="/signup" variant="secondary" size="sm">
              Create an account to see your own report
            </ButtonLink>
          </div>
        ) : null}
      </div>
    </ProductShell>
  );
}

function MethodCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-fg/15 bg-raised/40 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function PersonalReport({ trust }: { trust: { overall: OverallView; roles: Array<RoleView>; modelVersion: string } }) {
  const overall = trust.overall;
  if (!overall) return null;
  return (
    <div className="mt-8 rounded-md border border-fg/15 bg-surface p-5" data-testid="bid-index-report">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Your Bid Index</h2>
        <p className="text-xs text-subtle">Model {trust.modelVersion}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-6">
        <div>
          <p className="font-display-site text-5xl tracking-tight">
            {overall.score ?? "NR"}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {overall.score != null ? bandText(overall.band) : "Not enough history"}
          </p>
        </div>
        <p className="pb-1 text-xs text-subtle">
          Confidence: {overall.confidenceLabel} ({Math.round(overall.confidence * 100) / 100}).
          Scores are built from verified outcomes, never from followers or
          spending.
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {trust.roles.map((r) => (
          <div key={r.role} className="rounded-md border border-line bg-raised/40 p-3">
            <p className="text-xs uppercase tracking-kicker text-subtle">{roleLabel(r.role)}</p>
            <p className="tabular mt-1 font-display-site text-2xl tracking-tight">{r.score ?? "NR"}</p>
            <p className="text-xs text-muted">
              {r.score != null
                ? `${r.band} · ${r.primaryOutcomes} verified outcome${r.primaryOutcomes === 1 ? "" : "s"} · ${r.uniqueCounterparties} independent counterparty${r.uniqueCounterparties === 1 ? "" : "ies"}`
                : `${r.primaryOutcomes} verified outcome${r.primaryOutcomes === 1 ? "" : "s"} · not enough history`}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <ButtonLink href="/settings/trust" variant="secondary" size="sm">
          Why your score is what it is
        </ButtonLink>
      </div>
    </div>
  );
}

function PersonalNRBlock({ trust }: { trust: { roles: Array<RoleView>; modelVersion: string } }) {
  return (
    <div className="mt-8 rounded-md border border-fg/15 bg-surface p-5" data-testid="bid-index-report-nr">
      <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Your Bid Index</h2>
      <p className="mt-2 font-display-site text-4xl tracking-tight">NR</p>
      <p className="mt-1 text-sm text-muted">Not enough history.</p>
      <ul className="mt-3 space-y-1 text-sm text-muted">
        {trust.roles.map((r) => (
          <li key={r.role}>
            {roleLabel(r.role)}: {r.primaryOutcomes} verified outcome{r.primaryOutcomes === 1 ? "" : "s"},
            {` ${r.uniqueCounterparties}`} independent counterparty{r.uniqueCounterparties === 1 ? "" : "s"}.
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-subtle">
        A role first scores at two completed outcomes with two independent
        counterparties. One five-star review or one large project will never
        produce a score on its own.
      </p>
    </div>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case "PROVIDER":
      return "Provider Index";
    case "SPONSOR":
      return "Sponsor Index";
    case "CAPTAIN":
      return "Captain Index";
    default:
      return role;
  }
}

function bandText(band: string): string {
  return band;
}
