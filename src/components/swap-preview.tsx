import { useMemo, useState } from "react";
import { Field, Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/format";
import { quoteSwapFee } from "@/lib/sites";

export function SwapPreview() {
  const [dollars, setDollars] = useState("1000");
  const [rank, setRank] = useState("12");
  const [swapNumber, setSwapNumber] = useState("1");

  const bidCents = Math.round(Math.max(0, Number(dollars) || 0) * 100);
  const r = Math.max(1, Number(rank) || 1);
  const n = Math.min(8, Math.max(1, Number(swapNumber) || 1));

  const quote = useMemo(
    () => quoteSwapFee({ bidCents, rank: r, swapCount: n - 1 }),
    [bidCents, r, n],
  );

  const schedule = useMemo(
    () =>
      [1, 2, 3].map((swapN) => ({
        swapN,
        quote: quoteSwapFee({ bidCents, rank: r, swapCount: swapN - 1 }),
      })),
    [bidCents, r],
  );

  return (
    <div className="mt-6 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <h3 className="text-sm font-medium">Fee preview</h3>
      <p className="mt-1 text-xs text-subtle">
        Each swap is the full rate of that number, of the current bid. Never the
        difference between rates.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Field label="Bid $">
          <Input
            inputMode="numeric"
            value={dollars}
            onChange={(e) => setDollars(e.target.value.replace(/[^\d]/g, ""))}
          />
        </Field>
        <Field label="Rank">
          <Input
            inputMode="numeric"
            value={rank}
            onChange={(e) => setRank(e.target.value.replace(/[^\d]/g, ""))}
          />
        </Field>
        <Field label="Swap #">
          <Input
            inputMode="numeric"
            value={swapNumber}
            onChange={(e) => setSwapNumber(e.target.value.replace(/[^\d]/g, ""))}
          />
        </Field>
      </div>

      <ol className="mt-4 overflow-hidden rounded-lg bg-raised text-sm shadow-[var(--shadow-border)]">
        {schedule.map((row) => {
          const active = row.swapN === n;
          const q = row.quote;
          return (
            <li
              key={row.swapN}
              className={
                active
                  ? "flex items-baseline justify-between gap-3 px-3 py-2.5 text-fg"
                  : "flex items-baseline justify-between gap-3 px-3 py-2.5 text-muted"
              }
            >
              <span>
                {row.swapN === 1 ? "1st" : row.swapN === 2 ? "2nd" : "3rd"} swap
                {q.allowed ? (
                  <span className="text-subtle">
                    {" "}
                    · full {Math.round(q.rate * 100)}%
                  </span>
                ) : null}
              </span>
              <span className="tabular">
                {q.allowed ? formatUsd(q.feeCents) : "spent"}
                {active ? " ← this" : ""}
              </span>
            </li>
          );
        })}
      </ol>

      {quote.allowed ? (
        <p className="mt-4 text-sm text-muted">
          This swap charges{" "}
          <span className="tabular text-fg">{formatUsd(quote.feeCents)}</span>
          {" — "}
          full {Math.round(quote.rate * 100)}% of {formatUsd(bidCents)}, not a
          remainder. {quote.note}
        </p>
      ) : (
        <p className="mt-4 text-sm text-danger">{quote.reason}</p>
      )}
    </div>
  );
}
