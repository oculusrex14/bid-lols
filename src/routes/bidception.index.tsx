import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, product, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { formatMinor } from "@/lib/money";
import { JsonLd } from "@/components/seo";
import { itemListSchema } from "@/lib/schema";

/**
 * /bidception — team projects (Phase 03). One funded parent, a captain who
 * splits it into funded work packages, specialists who take the parts. The
 * public list shows only projects that exist as funded or active work.
 */
const loadList = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const productKey = await currentProductKey();
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  const items = await sql.query<{
    id: string; title: string; slug: string; status: string;
    funded_budget_minor: number | null; currency: string;
    captain_user_id: string | null; child_count: number;
  }>(
    `select pw.id, pw.title, pw.slug, pw.status, pw.funded_budget_minor, pw.currency,
            pw.captain_user_id, (select count(*)::int from child_works cw where cw.parent_work_id = pw.id) as child_count
     from parent_works pw
     where pw.product = $1 and pw.status in ('FUNDED','ACTIVE','COMPLETING','COMPLETED')
     order by pw.created_at desc limit 50`,
    [productKey],
  );
  return { product: productKey, me, items };
});

export const Route = createFileRoute("/bidception/")({
  loader: () => loadList(),
  component: BidceptionPage,
});

function BidceptionPage() {
  const d = Route.useLoaderData();
  const pKey = d.product as ProductKey;

  return (
    <ProductShell site={pKey} me={d.me}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
          {product(pKey).name}
        </p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">
          Team projects
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
          One funded project, one budget, a captain, and work packages drawn
          from that budget. Allocations, the captain's fee, and any reserve
          always add up to the funded total; the engine refuses to go past it.
        </p>

        {d.items.length === 0 ? (
          <div className="mt-10 rounded-lg border-2 border-dashed border-fg/20 bg-surface p-10 text-center">
            <h2 className="font-display-site text-xl tracking-tight">
              No funded team projects yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              A team project appears here once its full budget is funded: a
              sponsor sets the total, a captain splits it into work packages,
              and specialists take the parts they are good at. Drafts stay
              private until funding happens.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/bidception/new" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg">
                Start a project
              </Link>
              <Link to="/blog/$slug" params={{ slug: "building-a-project-with-multiple-freelancers" }} className="inline-flex h-10 items-center rounded-md border-2 border-fg/20 px-4 text-sm font-medium">
                How a funded team project works
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {d.items.map((p) => (
              <li key={p.id}>
                <Link
                  to="/bidception/$id"
                  params={{ id: p.id }}
                  className="block rounded-lg border-2 border-fg/15 bg-surface p-4 transition-colors hover:border-fg/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-kicker text-subtle">{p.status}</p>
                      <h2 className="mt-1 font-display-site text-lg tracking-tight">{p.title}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {p.child_count} work package{p.child_count === 1 ? "" : "s"} funded from the parent budget
                      </p>
                    </div>
                    {p.funded_budget_minor != null ? (
                      <p className="font-display-site text-lg tracking-tight text-accent">
                        {formatMinor(Number(p.funded_budget_minor), p.currency)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {d.items.length > 0 ? (
          <JsonLd
            data={itemListSchema(
              pKey,
              d.items.map((p) => ({
                name: p.title,
                url: `${seoOrigin(pKey)}/bidception/${p.id}`,
              })),
            )}
          />
        ) : null}
      </div>
    </ProductShell>
  );
}
