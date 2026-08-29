import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { formatMinor } from "@/lib/money";
import { bidIndexFor } from "@/lib/marketplace/reputation.server";
import { BID_INDEX_MIN_SAMPLE } from "@/lib/marketplace/reputation";
import { PageHeader } from "@/components/ui/layout";
import { DataTable } from "@/components/ui/data";
import { EmptyState, InlineNotice } from "@/components/ui/states";

/**
 * /bid-index — pricing benchmarks (Phase 04, FR-4; RC3, S-28). STRICTLY
 * GATED: a benchmark publishes only when the anonymized sample meets the
 * threshold; below it the cell says "Insufficient sample" and the page
 * stays noindex (the middleware treats /bid-index as private). No
 * individual deal is ever exposed, and a zero is never shown as a price.
 */
type Row = {
  category: string;
  sampleSize: number;
  minMinor: number | null;
  medianMinor: number | null;
  maxMinor: number | null;
  sufficient: boolean;
};

const loadIndex = createServerFn({ method: "GET" }).handler(async () => {
  const product = await currentProductKey();
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  // Network-wide: the Bidthrone host owns this surface but holds no
  // bounties of its own, so categories and samples span the whole network
  // (same choice as the network-wide leaderboards, RC1 R8.3).
  const sql = await (await import("@/lib/db.server")).getSql();
  const cats = await sql.query<{ category: string }>(
    `select distinct category from (
       select category from bounties
       union
       select category from projects
     ) x order by category limit 40`,
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
    <ProductShell site={d.product as ProductKey} me={d.me}>
      <div className="canvas-wide pb-16">
        <PageHeader
          kicker="Bidthrone · Bid Index"
          title="What the market pays"
          lead={`Aggregated market rates across verified work on the Bid Network. A benchmark publishes only from ${BID_INDEX_MIN_SAMPLE} or more completed work items in a category. Smaller samples show as insufficient rather than guessed at, and no individual deal is ever exposed.`}
        />

        {sufficient.length === 0 ? (
          <EmptyState
            className="mt-2"
            title="Not enough verified data yet."
            body="The Bid Index appears as real work completes across the network. Until then we publish nothing. A benchmark built on a thin sample would be misleading."
          />
        ) : (
          <p className="mt-6 text-xs text-subtle">
            Each row is a category with at least {BID_INDEX_MIN_SAMPLE}{" "}
            verified, settled outcomes. Samples are private: only the
            aggregate is shown.
          </p>
        )}

        {d.rows.length > 0 ? (
          <div className="mt-4" data-testid="bid-index-table">
            <DataTable
              caption="Market rates by category"
              columns={[
                { key: "category", header: "Category", render: (r: Row) => <span className="font-medium">{r.category}</span> },
                {
                  key: "sample",
                  header: "Sample",
                  className: "tabular",
                  render: (r: Row) => r.sampleSize,
                },
                {
                  key: "range",
                  header: "Range",
                  render: (r: Row) =>
                    r.sufficient ? (
                      `${formatMinor(r.minMinor as number, "INR")} – ${formatMinor(r.maxMinor as number, "INR")}`
                    ) : (
                      <span className="text-muted">Insufficient sample</span>
                    ),
                },
                {
                  key: "median",
                  header: "Median",
                  className: "tabular",
                  render: (r: Row) =>
                    r.sufficient ? formatMinor(r.medianMinor as number, "INR") : <span className="text-muted">Insufficient sample</span>,
                },
              ]}
              rows={d.rows}
              rowKey={(r) => r.category}
            />
          </div>
        ) : null}

        <InlineNotice className="mt-8">
          No trend is calculated when the sample is below the threshold. Rates
          come from completed work only: created or unfunded opportunities
          never count as price points.
        </InlineNotice>
      </div>
    </ProductShell>
  );
}