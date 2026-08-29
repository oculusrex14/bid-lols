import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { PageHeader } from "@/components/ui/layout";
import { EmptyState, InlineNotice } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";

/**
 * /settings/trust — the private score report (RC4 §52): everything public
 * plus why the score moved (true marginal impacts), the active hard cap and
 * its recovery schedule, and the appeal/correction path. Private evidence
 * and affected amounts stay on this authenticated surface.
 */
type RoleReport = {
  role: string;
  status: string;
  score: number | null;
  band: string;
  confidence: number;
  confidenceLabel: string;
  pillars: Record<string, number>;
  primaryOutcomes: number;
  uniqueCounterparties: number;
  capApplied: number | null;
  uncappedScore: number | null;
};

type TrustReportView = {
  modelVersion: string;
  overall: { status: string; score: number | null; band: string; capApplied: number | null } | null;
  roles: Array<RoleReport>;
  impacts: Array<{ role: string; workKey: string; severity: string; impactPoints: number }>;
};

const loadReport = createServerFn({ method: "GET" }).handler(async () => {
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  const session = await (await import("@/lib/authz")).getSession();
  if (!session || !me) {
    throw redirect({ href: "/signin" });
  }
  const { trustReportFor, marginalImpactsForRole } = await import("@/lib/trust/score.server");
  const report = await trustReportFor(session.user.id);
  const impacts: TrustReportView["impacts"] = [];
  for (const r of report.roles) {
    const list = await marginalImpactsForRole(session.user.id, r.role).catch(() => []);
    for (const item of list) impacts.push({ role: r.role, ...item });
  }
  return { me: report ? me : me, roles: report.roles, overall: report.overall, modelVersion: report.modelVersion, impacts, product: await currentProductKey() };
});

export const Route = createFileRoute("/settings/trust")({
  loader: () => loadReport(),
  component: TrustSettingsPage,
});

function TrustSettingsPage() {
  const d = Route.useLoaderData();
  const overall = d.overall;
  const scored = d.roles.filter((r) => r.status === "SCORED");
  return (
    <ProductShell site={d.product as ProductKey} me={d.me}>
      <div className="canvas-app pb-16">
        <PageHeader
          kicker="Private report"
          title="Your trust report"
          lead="Everything the public profile shows, plus why your score moved, any active cap, and the appeal path. Private deal amounts and dispute evidence stay here; the public page only ever shows aggregates."
        />

        {!overall ? (
          <EmptyState
            className="mt-2"
            title="NR: not enough history."
            body="A role first becomes scoreable at two completed outcomes with two independent counterparties. Complete real work on the network and this report fills with facts, not guesses."
            action={
              <ButtonLink href="/bid-index" variant="secondary" size="sm">
                How the Bid Index works
              </ButtonLink>
            }
          />
        ) : (
          <div className="mt-6 rounded-md border border-fg/15 bg-surface p-5" data-testid="trust-report">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
                Overall Bid Index · model {d.modelVersion}
              </p>
              {overall.capApplied != null ? (
                <p className="text-xs font-medium text-warn" data-testid="trust-cap">
                  Active hard cap: maximum {overall.capApplied} until the recovery schedule clears it.
                </p>
              ) : null}
            </div>
            <p className="mt-1 font-display-site text-4xl tracking-tight">
              {overall.score ?? "NR"} <span className="text-sm font-normal text-muted">{overall.score != null ? overall.band : "Not enough history"}</span>
            </p>

            <h2 className="mt-6 text-sm font-semibold">Role reports</h2>
            <div className="mt-2 space-y-3">
              {d.roles.map((r) => (
                <div key={r.role} className="rounded-md border border-fg/15 bg-raised/40 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{roleLabel(r.role)}</p>
                    <p className="text-sm tabular">
                      {r.status === "SCORED" ? r.score : r.status === "RESTRICTED" ? "Restricted" : "NR"}
                      {r.capApplied != null && r.status === "SCORED" && r.uncappedScore != null && r.uncappedScore !== r.score ? (
                        <span className="ml-2 text-xs text-warn">(uncapped {r.uncappedScore}; capped to {r.score})</span>
                      ) : null}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-subtle">
                    {r.primaryOutcomes} verified outcome{r.primaryOutcomes === 1 ? "" : "s"} across{" "}
                    {r.uniqueCounterparties} independent counterparty{r.uniqueCounterparties === 1 ? "" : "s"} ·{" "}
                    confidence {r.confidenceLabel}
                  </p>
                  {r.status === "SCORED" ? <PillarList pillars={r.pillars} /> : null}
                </div>
              ))}
            </div>

            <h2 className="mt-6 text-sm font-semibold">Why your score moved</h2>
            {d.impacts.length === 0 ? (
              <p className="mt-1 text-sm text-muted">
                No adjudicated adverse events on your record. Positive events form
                the base confidence of your score.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm" data-testid="trust-impacts">
                {d.impacts.map((i) => (
                  <li key={`${i.role}:${i.workKey}`} className="flex items-center justify-between gap-3">
                    <span className="text-muted">
                      {severityLabel(i.severity)} on <span className="font-mono text-xs">{shortWork(i.workKey)}</span>
                    </span>
                    <span className="tabular shrink-0 font-medium text-danger">
                      {i.impactPoints > 0 ? "+" : ""}
                      {i.impactPoints}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <InlineNotice className="mt-8">
          Something in the underlying facts wrong? Open an appeal from your
          trust report interface or contact the team through{" "}
          <a className="underline underline-offset-2" href="/contact">the contact page</a>.
          Corrections always happen through audited reversal events followed by
          a rebuild; no one can type a preferred score.
        </InlineNotice>

        {scored.length > 0 ? (
          <div className="mt-4">
            <ButtonLink href={`/profile/${d.me?.handle ?? ""}`} variant="secondary" size="sm">
              See your public profile
            </ButtonLink>
          </div>
        ) : null}
      </div>
    </ProductShell>
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

function severityLabel(severity: string): string {
  switch (severity) {
    case "ATTRIBUTABLE_CANCELLATION":
      return "Attributable cancellation";
    case "ABANDONMENT_OR_NONPERFORMANCE":
      return "Abandonment or non-performance";
    case "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK":
      return "Payment default or abusive chargeback";
    case "FRAUD_OR_COLLUSION_CONFIRMED":
      return "Confirmed fraud or collusion";
    default:
      return severity;
  }
}

function shortWork(workKey: string): string {
  return workKey.length > 24 ? `${workKey.slice(0, 24)}…` : workKey;
}

function PillarList({ pillars }: { pillars: Record<string, number> }) {
  const entries = Object.entries(pillars);
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
      {entries.map(([pillar, value]) => (
        <div key={pillar} className="flex items-center justify-between">
          <dt className="text-subtle">{pillarLabel(pillar)}</dt>
          <dd className="tabular font-medium">{Math.round(value * 100)}</dd>
        </div>
      ))}
    </dl>
  );
}

function pillarLabel(pillar: string): string {
  const lower = pillar.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
