import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, product, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { formatMinor } from "@/lib/money";
import { JsonLd } from "@/components/seo";
import { itemListSchema } from "@/lib/schema";

/**
 * /graveyard — abandoned startup assets (Phase 01B, FR-5). The idea: good
 * code shouldn't die with the startup. Founders hand on projects they no
 * longer work on; the transfer happens off-platform between the parties.
 */
const loadGraveyard = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const productKey = await currentProductKey();
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  const items = await sql.query<{
    id: string; title: string; slug: string; status: string;
    asking_price_minor: number | null; currency: string; created_at: string;
  }>(
    `select id, slug, title, asking_price_minor, currency, created_at, status
     from graveyard_listings
     where product = $1 and status in ('LISTED','UNDER_OFFER','TRANSFERRED')
     order by created_at desc limit 50`,
    [productKey],
  );
  return { product: productKey, me, items };
});

export const Route = createFileRoute("/graveyard/")({
  loader: () => loadGraveyard(),
  component: GraveyardPage,
});

function GraveyardPage() {
  const d = Route.useLoaderData();
  const pKey = d.product as ProductKey;

  return (
    <ProductShell site={pKey} me={d.me}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
              {product(pKey).name}
            </p>
            <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">
              The Graveyard
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Good code shouldn't die with the startup. Founders list the
              projects they no longer have time for: what is included, what
              went wrong, and what they are asking. Buyers make offers, and
              the transfer happens directly between the two of them. The
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
            <h2 className="font-display-site text-xl tracking-tight">
              No assets up for transfer yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              When a founder lists an abandoned project, it appears here with
              the details: what is included, why it was paused, and the price
              or an open-offers note. This page shows only real assets.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/graveyard/new" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg">
                List the first asset
              </Link>
              <Link to="/" className="inline-flex h-10 items-center rounded-md border-2 border-fg/20 px-4 text-sm font-medium">
                What the Graveyard is for
              </Link>
            </div>
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
                      <h2 className="mt-1 truncate font-display-site text-lg tracking-tight">{l.title}</h2>
                    </div>
                    <div className="text-right">
                      {l.asking_price_minor != null ? (
                        <p className="font-display-site text-lg tracking-tight text-accent">
                          {formatMinor(Number(l.asking_price_minor), l.currency)}
                        </p>
                      ) : (
                        <p className="text-xs text-subtle">open to offers</p>
                      )}
                    </div>
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
              d.items.map((l) => ({
                name: l.title,
                url: `${seoOrigin(pKey)}/graveyard/${l.id}`,
              })),
            )}
          />
        ) : null}
      </div>
    </ProductShell>
  );
}
