import { useMemo, useState } from "react";
import { Field, Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/format";
import { quoteSwapFee } from "@/lib/sites";

export function SwapPreview() {
  const [dollars, setDollars] = useState("200");
  const [rank, setRank] = useState("12");
  const [swapNumber, setSwapNumber] = useState("1");

  const quote = useMemo(() => {
    const bid = Math.max(0, Number(dollars) || 0);
    const r = Math.max(1, Number(rank) || 1);
    const n = Math.min(8, Math.max(1, Number(swapNumber) || 1));
    return quoteSwapFee({
      bidCents: Math.round(bid * 100),
      rank: r,
      swapCount: n - 1,
    });
  }, [dollars, rank, swapNumber]);

  return (
    <div className="mt-6 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <h3 className="text-sm font-medium">Fee preview</h3>
      <p className="mt-1 text-xs text-subtle">
        Same math the manage page uses. Rank is checked again at payment.
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
      {quote.allowed ? (
        <p className="mt-4 text-sm text-muted">
          <span className="tabular text-fg">{formatUsd(quote.feeCents)}</span>
          {" · "}
          {Math.round(quote.rate * 100)}% · {quote.note}
        </p>
      ) : (
        <p className="mt-4 text-sm text-danger">{quote.reason}</p>
      )}
    </div>
  );
}
