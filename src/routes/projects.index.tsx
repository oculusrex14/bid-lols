import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { listOpenProjects } from "@/lib/marketplace/queries.server";
import { formatMinor } from "@/lib/money";

/** /projects — public project listing (Phase 01, FR-3). */
const loadProjects = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const product = await currentProductKey();
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  const result = await listOpenProjects(sql, product, { limit: 20 });
  return { ...result, product, me };
});

export const Route = createFileRoute("/projects/")({
  loader: () => loadProjects(),
  component: ProjectsPage,
});

function ProjectsPage() {
  const data = Route.useLoaderData();
  return (
    <ProductShell site={data.product} me={data.me}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">FoundersBid</p>
            <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">Open projects</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Larger client work. Providers propose an approach, quote and
              milestones — the sponsor selects one provider, funds the project,
              and milestones run to completion. No unpaid completed work, ever.
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
            <h2 className="font-display-site text-xl tracking-tight">No open projects yet.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              The first project briefs will appear here as sponsors post them.
              This page shows only real, live work.
            </p>
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
      </div>
    </ProductShell>
  );
}