import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { formatMinor } from "@/lib/money";

/** /graveyard — abandoned startup assets (Phase 01B, FR-5). Honest list. */
const loadGraveyard = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const product = await currentProductKey();
  const { me } = await shellContext();
  const items = await sql.query<{
    id: string; title: string; slug: string; status: string;
    asking_price_minor: number | null; currency: string; created_at: string;
  }>(
    `select id, slug, title, asking_price_minor, currency, created_at
     from graveyard_listings
     where product = $1 and status in ('LISTED','UNDER_OFFER','TRANSFERRED')
     order by created_at desc limit 50`,
    [product],
  );
  return { product, me, items };
});

export const Route = createFileRoute("/graveyard/")({
  loader: () => loadGraveyard(),
  component: GraveyardPage,
});

function GraveyardPage() {
  const d = Route.useLoaderData();
  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">FoundersBid</p>
            <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">The Graveyard</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Abandoned digital startups, looking for a second life. Sellers
              list what is included and what went wrong; buyers make offers.
              Transactions are completed directly between the parties — the
              platform never holds funds or credentials.
            </p>
          </div>
          <Link
            to="/graveyard/new"
            className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
          >
            List an asset
          </Link>
        </div>

        {d.items.length === 0 ? (
          <div className="mt-10 rounded-lg border-2 border-dashed border-fg/20 bg-surface p-10 text-center">
            <h2 className="font-display-site text-xl tracking-tight">No assets in the graveyard yet.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              When founders list abandoned projects, they appear here. This page
              shows only real assets — an empty graveyard is an honest one.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {d.items.map((l) => (
              <li key={l.id}>
                <Link
                  to="/graveyard/$id"
                  params={{ id: l.id }}
                  className="block rounded-lg border-2 border-fg/15 bg-surface p-4 transition-colors hover:border-fg/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-kicker text-subtle">{l.status}</p>
                      <h2 className="mt-1 truncate font-display-site text-lg tracking-tight">{l.slug.split("-").slice(0, -1).join("-")}</h2>
                    </div>
                    <div className="text-right">
                      {l.asking_price_minor != null ? (
                        <p className="font-display-site text-lg tracking-tight text-accent">
                          {formatMinor(Number(l.asking_price_minor), l.currency)}
                        </p>
                      ) : (
                        <p className="text-xs text-subtle">make an offer</p>
                      )}
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