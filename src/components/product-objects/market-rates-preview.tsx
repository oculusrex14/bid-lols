import { MARKET_RATE_MIN_SAMPLE } from "@/lib/marketplace/reputation";
import { formatMinor, type SupportedCurrency } from "@/lib/money";

/**
 * RC5 §23.11: the Bidthrone home Market Rates preview. It renders REAL
 * sample data from marketRateFor() (same gated source as /market-rates).
 * The progress bar width means SAMPLE COMPLETENESS ONLY — never trust,
 * ranking, or price. Below the threshold the row says "Insufficient
 * sample" and shows no price. No Bid Index language here: this is the
 * category pricing product.
 *
 * RC5.1 WS10: denominated in the viewer-default currency and labelled as
 * such. A zero-outcome USD preview stays honest ("0/10 verified"), never
 * falls back to INR numbers labelled USD.
 */
export type MarketRatePreviewRow = {
  category: string;
  sampleSize: number;
  sufficient: boolean;
  minMinor: number | null;
  medianMinor: number | null;
  maxMinor: number | null;
};

export function MarketRatesPreview({
  rows,
  currency = "INR",
}: {
  rows: MarketRatePreviewRow[];
  /** The partition these aggregates come from (RC5.1 WS10). */
  currency?: SupportedCurrency;
}) {
  const inWord = `in ${currency}`;
  if (rows.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        Market rates {inWord} publish only when a category has at least{" "}
        {MARKET_RATE_MIN_SAMPLE} verified, settled outcomes denominated in{" "}
        {currency}. Until then it shows{" "}
        <span className="font-medium">Insufficient sample</span>{" "}
        instead of inventing a price. That is the product working as
        designed.
      </p>
    );
  }
  return (
    <ul className="space-y-3" data-testid="market-rates-preview" data-currency={currency}>
      {rows.map((r) => (
        <li key={r.category} className="row-line py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{r.category}</span>
            <span className="tabular text-xs text-subtle">
              {r.sampleSize}/{MARKET_RATE_MIN_SAMPLE} verified {inWord}
            </span>
          </div>
          <div
            className="market-rate-progress mt-1.5"
            role="img"
            aria-label={`${r.category}: ${r.sampleSize} of ${MARKET_RATE_MIN_SAMPLE} verified ${currency} outcomes`}
          >
            <span
              style={{
                width: `${Math.min(r.sampleSize / MARKET_RATE_MIN_SAMPLE, 1) * 100}%`,
              }}
            />
          </div>
          {r.sufficient ? (
            <p className="tabular mt-1.5 text-xs text-muted">
              {formatMinor(r.minMinor as number, currency)} –{" "}
              {formatMinor(r.maxMinor as number, currency)} · median{" "}
              {formatMinor(r.medianMinor as number, currency)}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-muted">Insufficient sample {inWord}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
