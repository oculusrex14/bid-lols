import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { formatMinor } from "@/lib/money";

/**
 * /bidception — parent works (Phase 03). One funded problem; a team forms
 * around the money. Public surface shows funded/active parents honestly.
 */
const loadList = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const product = await currentProductKey();
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
    [product],
  );
  return { product, me, items };
});

export const Route = createFileRoute("/bidception/")({
  loader: () => loadList(),
  component: BidceptionPage,
});

function BidceptionPage() {
  const d = Route.useLoaderData();
  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Bidception</p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">Funded parent work</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          One funded problem. A captain decomposes it into funded child units —
          allocated + reserved + captain compensation can never exceed the
          funded budget. Money cannot be created by nesting.
        </p>

        {d.items.length === 0 ? (
          <div className="mt-10 rounded-lg border-2 border-dashed border-fg/20 bg-surface p-10 text-center">
            <h2 className="font-display-site text-xl tracking-tight">No funded parent work yet.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Parent work appears here once it is funded. This is the team
              marketplace — a sponsor funds, a captain decomposes, the team
              delivers. Nothing padded.
            </p>
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
                      <p className="mt-1 text-sm text-muted">{p.child_count} funded child units</p>
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
      </div>
    </ProductShell>
  );
}