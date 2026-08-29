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
 * /graveyard — abandoned startup assets (Phase 01B, FR-5; RC3, S-31).
 * Good code shouldn't die with the startup: founders list what is included,
 * what went wrong, and what they are asking. Offers are commitments, never
 * payments; the transfer happens between the two parties.
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
      <div className="canvas-wide pb-16">
        <PageHeader
          kicker={product(pKey).name}
          title="The Graveyard"
          lead="Good code shouldn't die with the startup. Founders list the projects they no longer have time for: what is included, what went wrong, and what they are asking. Buyers make offers, and the transfer happens directly between the two of them. The platform never holds funds or credentials."
          actions={
            <ButtonLink href="/graveyard/new" variant="secondary">
              List an asset
            </ButtonLink>
          }
        />

        {d.items.length === 0 ? (
          <EmptyState
            title="No assets up for transfer yet."
            body="When a founder lists an abandoned project, it appears here with the details: what is included, why it was paused, and the price or an open-offers note. This page shows only real assets."
            action={
              <>
                <ButtonLink href="/graveyard/new" size="sm">
                  List the first asset
                </ButtonLink>
                <ButtonLink href="/" variant="secondary" size="sm">
                  What the Graveyard is for
                </ButtonLink>
              </>
            }
          />
        ) : (
          <div className="mt-6">
            {d.items.map((l) => (
              <Link
                key={l.id}
                to="/graveyard/$id"
                params={{ id: l.id }}
                className="row-line group flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-4 transition-colors duration-150 hover:bg-surface/70"
              >
                {l.asking_price_minor != null ? (
                  <MoneyValue minor={Number(l.asking_price_minor)} currency={l.currency} className="w-28 shrink-0 text-accent" />
                ) : (
                  <span className="w-28 shrink-0 text-xs text-subtle">open to offers</span>
                )}
                <span className="min-w-0 flex-1 truncate text-[15px] font-semibold group-hover:underline group-hover:underline-offset-4">
                  {l.title}
                </span>
                <StatusBadge status={l.status} />
              </Link>
            ))}
          </div>
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
