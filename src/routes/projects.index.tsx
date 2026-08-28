import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, product, seoOrigin, type ProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { listOpenProjects } from "@/lib/marketplace/queries.server";
import { formatMinor } from "@/lib/money";
import { JsonLd } from "@/components/seo";
import { itemListSchema } from "@/lib/schema";

/**
 * /projects — public project listing (Phase 01, FR-3). Providers propose
 * first, the sponsor selects one, then delivery runs through milestones.
 */
const loadProjects = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const productKey = await currentProductKey();
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  const result = await listOpenProjects(sql, productKey, { limit: 20 });
  return { ...result, product: productKey, me };
});

export const Route = createFileRoute("/projects/")({
  loader: () => loadProjects(),
  component: ProjectsPage,
});

function ProjectsPage() {
  const data = Route.useLoaderData();
  const pKey = data.product as ProductKey;

  return (
    <ProductShell site={pKey} me={data.me}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
              {product(pKey).name}
            </p>
            <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">
              Open projects
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Larger work, run proposal first. Providers describe their
              approach, evidence, and milestones before doing any deliverable
              work. The sponsor selects one provider, funds the project, and
              delivery runs through the published milestones.
            </p>
          </div>
          <Link
            to="/projects/new"
            className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
          >
            Post a project
          </Link>
        </div>

        {data.items.length === 0 ? (
          <div className="mt-10 rounded-lg border-2 border-dashed border-fg/20 bg-surface p-10 text-center">
            <h2 className="font-display-site text-xl tracking-tight">
              No open projects yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              A project is bounded work with one selected provider: proposals
              come in, the sponsor picks one, and the work is funded before it
              begins. The first live projects will appear here.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/projects/new" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg">
                Post a project
              </Link>
              <Link to="/blog/$slug" params={{ slug: "bounty-or-project" }} className="inline-flex h-10 items-center rounded-md border-2 border-fg/20 px-4 text-sm font-medium">
                Bounty or project: how the two modes differ
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {data.items.map((p) => (
              <li key={String(p.id)}>
                <Link
                  to="/projects/$id"
                  params={{ id: String(p.id) }}
                  className="block rounded-lg border-2 border-fg/15 bg-surface p-4 transition-colors hover:border-fg/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
                        {String(p.category)} · {String(p.status)}
                      </p>
                      <h2 className="mt-1 truncate font-display-site text-lg tracking-tight">{String(p.title)}</h2>
                      {p.proposal_deadline ? (
                        <p className="mt-1 text-sm text-muted">
                          proposals due {new Date(String(p.proposal_deadline)).toISOString().slice(0, 10)}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="font-display-site text-lg tracking-tight text-accent">
                        {p.budget_min_minor && p.budget_max_minor
                          ? `${formatMinor(Number(p.budget_min_minor), String(p.currency))} – ${formatMinor(Number(p.budget_max_minor), String(p.currency))}`
                          : p.budget_min_minor
                            ? `from ${formatMinor(Number(p.budget_min_minor), String(p.currency))}`
                            : "Open brief"}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
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
