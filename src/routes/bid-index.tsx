import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { formatMinor } from "@/lib/money";
import { bidIndexFor } from "@/lib/marketplace/reputation.server";
import { BID_INDEX_MIN_SAMPLE } from "@/lib/marketplace/reputation";

/**
 * /bid-index — pricing benchmarks (Phase 04, FR-4). STRICTLY GATED: a
 * benchmark is only published when the anonymized sample meets the threshold;
 * below it the page says so honestly and stays noindex (the middleware treats
 * /bid-index as private). No individual deals are ever exposed.
 */
type Row = {
  category: string;
  sampleSize: number;
  minMinor: number | null;
  medianMinor: number | null;
  maxMinor: null | number;
  sufficient: boolean;
};
void 0;

const loadIndex = createServerFn({ method: "GET" }).handler(async () => {
  const product = await currentProductKey();
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  // Network-wide: the Bidthrone host owns this surface but holds no
  // bounties of its own, so categories and samples span the whole network
  // (same choice as the network-wide leaderboards, RC1 R8.3).
  const cats = await (await import("@/lib/db.server")).getSql().then((sql) =>
    sql.query<{ category: string }>(
      `select distinct category from (
         select category from bounties
         union
         select category from projects
       ) x order by category limit 40`,
    ),
  );
  const rows: Row[] = [];
  for (const c of cats) {
    const sample = await bidIndexFor(null, c.category);
    rows.push({
      category: c.category,
      sampleSize: sample.sampleSize,
      minMinor: sample.minMinor,
      medianMinor: sample.medianMinor,
      maxMinor: sample.maxMinor,
      sufficient: sample.sufficient,
    });
  }
  return { product, me, rows };
});

export const Route = createFileRoute("/bid-index")({
  loader: () => loadIndex(),
  component: BidIndexPage,
});

function BidIndexPage() {
  const d = Route.useLoaderData();
  const sufficient = d.rows.filter((r) => r.sufficient);
  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Bidthrone · Bid Index</p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">What the market pays</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Aggregated market rates across verified work on the Bid Network.
          A benchmark publishes only from{" "}
          <strong>{BID_INDEX_MIN_SAMPLE} or more</strong> completed work items
          in a category. Smaller samples show as "insufficient" rather than
          guessed at, and no individual deal is ever exposed.
        </p>

        {sufficient.length === 0 ? (
          <div className="mt-10 rounded-lg border-2 border-dashed border-fg/20 bg-surface p-10 text-center" data-testid="bid-index-empty">
            <h2 className="font-display-site text-xl tracking-tight">Not enough verified data yet.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              The Bid Index appears as real work completes across the network.
              Until then we publish nothing. A benchmark built on a thin sample would be misleading.
            </p>
          </div>
        ) : null}

        {d.rows.length > 0 ? (
          <div className="mt-8 overflow-x-auto rounded-lg border-2 border-fg/15">
            <table className="w-full text-sm">
              <thead className="bg-raised/50 text-left text-xs uppercase tracking-kicker text-subtle">
                <tr>
                  <th className="p-2">Category</th>
                  <th className="p-2">Samples</th>
                  <th className="p-2">Range</th>
                  <th className="p-2">Median</th>
                </tr>
              </thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.category} className="border-t-2 border-fg/10" data-testid={`bid-row-${r.category}`}>
                    <td className="p-2 font-medium">{r.category}</td>
                    <td className="p-2">{r.sampleSize}</td>
                    <td className="p-2">
                      {r.sufficient ? (
                        `${formatMinor(r.minMinor!, "INR")} – ${formatMinor(r.maxMinor!, "INR")}`
                      ) : (
                        <span className="text-muted">insufficient sample</span>
                      )}
                    </td>
                    <td className="p-2">{r.sufficient ? formatMinor(r.medianMinor!, "INR") : "no data"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </ProductShell>
  );
}