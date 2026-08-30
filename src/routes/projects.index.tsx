import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, product, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { listOpenProjects } from "@/lib/marketplace/queries.server";
import { formatMinor } from "@/lib/money";
import { statusLabel } from "@/lib/marketplace/status-labels";
import { deadlinePhrase } from "@/lib/reltime";
import { JsonLd } from "@/components/seo";
import { itemListSchema } from "@/lib/schema";
import { PageHeader } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";

/**
 * /projects — public project listing (Phase 01, FR-3; RC3, S-24).
 * Providers propose first, the sponsor selects one, delivery runs through
 * the published milestones. Budget range is the decision data, surfaced
 * like a reward.
 */
const loadProjects = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const productKey = await currentProductKey();
  const { me, funding } = await (await import("@/lib/shell-context")).getShellContext();
  const result = await listOpenProjects(sql, productKey, { limit: 20 });
  return { ...result, product: productKey, me, funding };
});

export const Route = createFileRoute("/projects/")({
  loader: () => loadProjects(),
  component: ProjectsPage,
});

function budgetText(p: Awaited<ReturnType<typeof loadProjects>>["items"][number]): string {
  if (p.budget_min_minor && p.budget_max_minor) {
    return `${formatMinor(Number(p.budget_min_minor), String(p.currency))} – ${formatMinor(Number(p.budget_max_minor), String(p.currency))}`;
  }
  if (p.budget_min_minor) return `from ${formatMinor(Number(p.budget_min_minor), String(p.currency))}`;
  return "Open brief";
}

function ProjectsPage() {
  const data = Route.useLoaderData();
  const pKey = data.product as ProductKey;

  return (
    <ProductShell site={pKey} me={data.me} funding={data.funding}>
      <div className="canvas-wide pb-16">
        <PageHeader
          kicker={product(pKey).name}
          title="Open projects"
          lead="Larger work, run proposal first. Providers describe their approach, evidence, and milestones before doing any deliverable work. The sponsor selects one provider, funds the project, and delivery runs through the published milestones."
          actions={
            <ButtonLink href="/projects/new" variant="secondary">
              Post a project
            </ButtonLink>
          }
        />

        {data.items.length === 0 ? (
          <EmptyState
            title="No open projects yet."
            body="A project is bounded work with one selected provider: proposals come in, the sponsor picks one, and the work is funded before it begins. The first live projects will appear here."
            action={
              <>
                <ButtonLink href="/projects/new" size="sm">
                  Post a project
                </ButtonLink>
                <ButtonLink href="/blog/bounty-or-project" variant="secondary" size="sm">
                  Bounty or project: how the two modes differ
                </ButtonLink>
              </>
            }
          />
        ) : (
          <div className="mt-6">
            {data.items.map((p) => (
              <Link
                key={String(p.id)}
                to="/projects/$id"
                params={{ id: String(p.id) }}
                className="row-line group flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-4 transition-colors duration-150 hover:bg-surface/70"
              >
                <span className="w-40 shrink-0 tabular text-base font-semibold text-accent">{budgetText(p)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold group-hover:underline group-hover:underline-offset-4">
                    {String(p.title)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {String(p.category)} · {statusLabel(String(p.status))}
                    {p.proposal_deadline ? ` · proposals ${deadlinePhrase(String(p.proposal_deadline))}` : ""}
                  </span>
                </span>
                <StatusBadge status={String(p.status)} className="sm:hidden" />
              </Link>
            ))}
          </div>
        )}

        {data.items.length > 0 ? (
          <JsonLd
            data={itemListSchema(
              pKey,
              data.items.map((p) => ({
                name: String(p.title),
                url: `${seoOrigin(pKey)}/projects/${String(p.id)}`,
              })),
            )}
          />
        ) : null}
      </div>
    </ProductShell>
  );
}
