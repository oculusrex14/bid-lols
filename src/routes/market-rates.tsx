import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { formatMinor, type SupportedCurrency } from "@/lib/money";
import { marketRateFor } from "@/lib/marketplace/reputation.server";
import { MARKET_RATE_MIN_SAMPLE } from "@/lib/marketplace/reputation";
import { PageHeader } from "@/components/ui/layout";
import { DataTable } from "@/components/ui/data";
import { EmptyState, InlineNotice } from "@/components/ui/states";
import { cn } from "@/lib/cn";

/**
 * /market-rates — aggregate pricing (RC4 §3/§56; formerly the /bid-index
 * pricing page). STRICTLY GATED: a rate publishes only when the anonymized
 * sample meets the threshold; below it the cell says "Insufficient sample"
 * and the page stays noindex. No individual deal is ever exposed, and a
 * zero is never shown as a price.
 *
 * RC5.1 WS10: the currency is part of the aggregate identity. The page is
 * URL-addressable per currency (?currency=INR|USD); an unknown value
 * normalizes to the viewer's default currency (documented behavior — never
 * a 404, never a guessed partition). Each partition only ever sees its own
 * currency's verified outcomes.
 */
type Row = {
  category: string;
  sampleSize: number;
  minMinor: number | null;
  medianMinor: number | null;
  maxMinor: number | null;
  sufficient: boolean;
};

const loadRates = createServerFn({ method: "GET" })
  .validator(
    z.object({ requestedCurrency: z.string().max(8).optional() }),
  )
  .handler(async ({ data }) => {
    const requestedCurrency = data.requestedCurrency;
    const product = await currentProductKey();
    const shellContext = await (await import("@/lib/shell-context")).getShellContext();
    // Unknown/absent value -> the viewer default (safe normalization).
    const currency: SupportedCurrency =
      requestedCurrency === "INR" || requestedCurrency === "USD"
        ? requestedCurrency
        : shellContext.viewerCurrency;
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
      const sample = await marketRateFor(null, c.category, currency);
      rows.push({
        category: c.category,
        sampleSize: sample.sampleSize,
        minMinor: sample.minMinor,
        medianMinor: sample.medianMinor,
        maxMinor: sample.maxMinor,
        sufficient: sample.sufficient,
      });
    }
    return { product, me: shellContext.me, funding: shellContext.funding, viewerCurrency: shellContext.viewerCurrency, currency, rows };
  },
);

export const Route = createFileRoute("/market-rates")({
  // URL-addressable currency partition: /market-rates?currency=INR|USD.
  validateSearch: z.object({ currency: z.string().max(8).optional() }),
  loaderDeps: ({ search }) => [search.currency],
  loader: ({ deps }) => loadRates({ data: { requestedCurrency: deps[0] } }),
  component: MarketRatesPage,
});

function MarketRatesPage() {
  const d = Route.useLoaderData();
  const sufficient = d.rows.filter((r) => r.sufficient);
  const symbol = d.currency === "INR" ? "₹" : "$";

  return (
    <ProductShell site={d.product as ProductKey} me={d.me} funding={d.funding}>
      <div className="canvas-wide pb-16">
        <PageHeader
          kicker="Bidthrone · Market rates"
          title="What the market pays"
          lead={`Aggregated market rates in ${d.currency} across verified work on the Bid Network. A benchmark publishes only from ${MARKET_RATE_MIN_SAMPLE} or more completed work items in a category, in that currency. Smaller samples show as insufficient rather than guessed at, and no individual deal is ever exposed.`}
        />

        <div className="mt-6 flex items-center gap-2" data-testid="market-rates-currency" role="group" aria-label="Market rates currency">
          <span className="text-xs font-semibold uppercase tracking-kicker text-subtle">Currency</span>
          {(["INR", "USD"] as const).map((code) => (
            <a
              key={code}
              href={`/market-rates?currency=${code}`}
              aria-current={d.currency === code ? "true" : undefined}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-sm font-medium",
                d.currency === code
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-fg/15 text-muted hover:text-fg",
              )}
            >
              {code === "INR" ? "₹ INR" : "$ USD"}
            </a>
          ))}
        </div>

        {sufficient.length === 0 ? (
          <EmptyState
            className="mt-2"
            title={`Not enough verified ${symbol} data yet.`}
            body={`Market rates in ${d.currency} appear as real ${d.currency} work completes across the network. Until then we publish nothing in this currency. A benchmark built on a thin sample would be misleading.`}
          />
        ) : (
          <p className="mt-6 text-xs text-subtle">
            Each row is a category with at least {MARKET_RATE_MIN_SAMPLE}{" "}
            verified, settled outcomes denominated in {d.currency}. Samples are
            private: only the aggregate is shown.
          </p>
        )}

        {d.rows.length > 0 ? (
          <div className="mt-4" data-testid="market-rates-table">
            <DataTable
              caption={`Market rates by category in ${d.currency}`}
              columns={[
                { key: "category", header: "Category", render: (r: Row) => <span className="font-medium">{r.category}</span> },
                {
                  key: "sample",
                  header: `Sample (${d.currency})`,
                  className: "tabular",
                  render: (r: Row) => (
                    <div className="min-w-28">
                      <span className="text-xs">{r.sampleSize}/{MARKET_RATE_MIN_SAMPLE}</span>
                      <div
                        className="market-rate-progress mt-1"
                        role="img"
                        aria-label={`${r.category}: ${r.sampleSize} of ${MARKET_RATE_MIN_SAMPLE} verified ${d.currency} outcomes`}
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
                      `${formatMinor(r.minMinor as number, d.currency)} – ${formatMinor(r.maxMinor as number, d.currency)}`
                    ) : (
                      <span className="text-muted">Insufficient sample</span>
                    ),
                },
                {
                  key: "median",
                  header: "Median",
                  className: "tabular",
                  render: (r: Row) =>
                    r.sufficient ? (
                      formatMinor(r.medianMinor as number, d.currency)
                    ) : (
                      <span className="text-muted">Insufficient sample</span>
                    ),
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
          never count as price points. One currency per aggregate: INR and USD
          outcomes are never mixed. Market rates describe the work, not any
          person's trustworthiness; that is the Bid Index.
        </InlineNotice>
      </div>
    </ProductShell>
  );
}
