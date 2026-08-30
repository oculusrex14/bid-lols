import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, product, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { JsonLd } from "@/components/seo";
import { itemListSchema } from "@/lib/schema";
import { PageHeader } from "@/components/ui/layout";
import { StatusBadge } from "@/components/ui/status";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { MoneyValue } from "@/components/ui/money";

/**
 * /bidception — team projects (Phase 03; RC3, S-31). One funded parent, a
 * captain who splits it into funded work packages. The public list shows
 * only projects that exist as funded or active work; drafts stay private
 * until funding happens.
 */
const loadList = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const productKey = await currentProductKey();
  const { me, funding } = await (await import("@/lib/shell-context")).getShellContext();
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
  return { product: productKey, me, funding, items };
});

export const Route = createFileRoute("/bidception/")({
  loader: () => loadList(),
  component: BidceptionPage,
});

function BidceptionPage() {
  const d = Route.useLoaderData();
  const pKey = d.product as ProductKey;

  return (
    <ProductShell site={pKey} me={d.me} funding={d.funding}>
      <div className="canvas-wide pb-16">
        <PageHeader
          kicker={product(pKey).name}
          title="Team projects"
          lead="One funded project, one budget, a captain, and work packages drawn from that budget. Allocations, the captain's fee, and any reserve always add up to the funded total; the engine refuses to go past it."
          actions={
            <ButtonLink href="/bidception/new" variant="secondary">
              Start a project
            </ButtonLink>
          }
        />

        {d.items.length === 0 ? (
          <EmptyState
            title="No funded team projects yet."
            body="A team project appears here once its full budget is funded: a sponsor sets the total, a captain splits it into work packages, and specialists take the parts they are good at. Drafts stay private until funding happens."
            action={
              <>
                <ButtonLink href="/bidception/new" size="sm">
                  Start a project
                </ButtonLink>
                <ButtonLink href="/blog/building-a-project-with-multiple-freelancers" variant="secondary" size="sm">
                  How a funded team project works
                </ButtonLink>
              </>
            }
          />
        ) : (
          <div className="mt-6">
            {d.items.map((p) => (
              <Link
                key={p.id}
                to="/bidception/$id"
                params={{ id: p.id }}
                className="row-line group flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-4 transition-colors duration-150 hover:bg-surface/70"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold group-hover:underline group-hover:underline-offset-4">{p.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {p.child_count} work package{p.child_count === 1 ? "" : "s"} funded from the parent budget
                  </span>
                </span>
                {p.funded_budget_minor != null ? (
                  <MoneyValue minor={Number(p.funded_budget_minor)} currency={p.currency} size="sm" className="text-accent" />
                ) : null}
                <StatusBadge status={p.status} />
              </Link>
            ))}
          </div>
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