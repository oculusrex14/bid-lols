import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { formatMinor } from "@/lib/money";
import { marketRateFor } from "@/lib/marketplace/reputation.server";
import { MARKET_RATE_MIN_SAMPLE } from "@/lib/marketplace/reputation";
import { PageHeader } from "@/components/ui/layout";
import { DataTable } from "@/components/ui/data";
import { EmptyState, InlineNotice } from "@/components/ui/states";

/**
 * /market-rates — aggregate pricing (RC4 §3/§56; formerly the /bid-index
 * pricing page). STRICTLY GATED: a rate publishes only when the anonymized
 * sample meets the threshold; below it the cell says "Insufficient sample"
 * and the page stays noindex. No individual deal is ever exposed, and a
 * zero is never shown as a price.
 */
type Row = {
  category: string;
  sampleSize: number;
  minMinor: number | null;
  medianMinor: number | null;
  maxMinor: number | null;
  sufficient: boolean;
};

const loadRates = createServerFn({ method: "GET" }).handler(async () => {
  const product = await currentProductKey();
  const { me, funding } = await (await import("@/lib/shell-context")).getShellContext();
  // Network-wide: the Bidthrone host owns this surface but holds no
  // bounties of its own, so samples span the whole network (same choice as
  // the network-wide leaderboards, RC1 R8.3).
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
    const sample = await marketRateFor(null, c.category);
    rows.push({
      category: c.category,
      sampleSize: sample.sampleSize,
      minMinor: sample.minMinor,
      medianMinor: sample.medianMinor,
      maxMinor: sample.maxMinor,
      sufficient: sample.sufficient,
    });
  }
  return { product, me, funding, rows };
});

export const Route = createFileRoute("/market-rates")({
  loader: () => loadRates(),
  component: MarketRatesPage,
});

function MarketRatesPage() {
  const d = Route.useLoaderData();
  const sufficient = d.rows.filter((r) => r.sufficient);

  return (
    <ProductShell site={d.product as ProductKey} me={d.me} funding={d.funding}>
      <div className="canvas-wide pb-16">
        <PageHeader
          kicker="Bidthrone · Market rates"
          title="What the market pays"
          lead={`Aggregated market rates across verified work on the Bid Network. A benchmark publishes only from ${MARKET_RATE_MIN_SAMPLE} or more completed work items in a category. Smaller samples show as insufficient rather than guessed at, and no individual deal is ever exposed.`}
        />

        {sufficient.length === 0 ? (
          <EmptyState
            className="mt-2"
            title="Not enough verified data yet."
            body="Market rates appear as real work completes across the network. Until then we publish nothing. A benchmark built on a thin sample would be misleading."
          />
        ) : (
          <p className="mt-6 text-xs text-subtle">
            Each row is a category with at least {MARKET_RATE_MIN_SAMPLE}{" "}
            verified, settled outcomes. Samples are private: only the
            aggregate is shown.
          </p>
        )}

        {d.rows.length > 0 ? (
          <div className="mt-4" data-testid="market-rates-table">
            <DataTable
              caption="Market rates by category"
              columns={[
                { key: "category", header: "Category", render: (r: Row) => <span className="font-medium">{r.category}</span> },
                {
                  key: "sample",
                  header: "Sample",
                  className: "tabular",
                  render: (r: Row) => (
                    <div className="min-w-28">
                      <span className="text-xs">{r.sampleSize}/{MARKET_RATE_MIN_SAMPLE}</span>
                      <div
                        className="market-rate-progress mt-1"
                        role="img"
                        aria-label={`${r.category}: ${r.sampleSize} of ${MARKET_RATE_MIN_SAMPLE} verified outcomes`}
                      >
                        <span
                          style={{
                            width: `${Math.min(r.sampleSize / MARKET_RATE_MIN_SAMPLE, 1) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="sr-only">
                        Sample completeness only: this bar never means trust,
                        ranking, or price.
                      </p>
                    </div>
                  ),
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
          never count as price points. Market rates describe the work, not any
          person's trustworthiness; that is the Bid Index.
        </InlineNotice>
      </div>
    </ProductShell>
  );
}
