import type { ReactNode } from "react";
import {
  formatMinor,
  formatMinorTrimmed,
  toSupportedCurrency,
} from "@/lib/money";
import { cn } from "@/lib/cn";

/**
 * Network Spine (RC3, S-30): the ONE money presentation primitive.
 * Integer minor units in, locale-grouped tabular figures out. Every money
 * figure on every product is rendered through these components, so the
 * advertised reward, the platform fee and the sponsor total can never drift
 * apart in style (or in arithmetic — callers pass integer minors only).
 *
 * RC5.1 WS13: the currency is the record's OWN persisted currency. Unknown
 * values fail visibly (toSupportedCurrency throws) — they are never silently
 * assumed INR.
 */

export function MoneyValue({
  minor,
  currency = "INR",
  size = "md",
  className,
  title,
  trimZeroDecimals = false,
}: {
  minor: number;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  title?: string;
  /** RC5 §29 / RC5.1 WS4: marketing/display mode. When minor units are
   *  exactly zero the ".00" is omitted (visual only; accounting stays
   *  precise). */
  trimZeroDecimals?: boolean;
}) {
  const cur = toSupportedCurrency(currency);
  return (
    <span
      className={cn(
        "tabular font-medium",
        size === "sm" && "text-sm",
        size === "md" && "text-base",
        size === "lg" && "text-lg sm:text-xl",
        size === "xl" && "text-2xl sm:text-3xl",
        className,
      )}
      title={title}
    >
      {trimZeroDecimals ? formatMinorTrimmed(minor, cur) : formatMinor(minor, cur)}
    </span>
  );
}

/**
 * Reward / fee / sponsor-total decomposition, visually distinct rows.
 * `fundingNote` renders when provided (e.g. the funding-off statement) —
 * never a fake "paid" state.
 */
export function MoneyBreakdown({
  rewardMinor,
  feeMinor,
  totalMinor,
  currency = "INR",
  fundingNote,
  className,
}: {
  rewardMinor: number;
  feeMinor: number;
  totalMinor: number;
  currency?: string;
  fundingNote?: ReactNode;
  className?: string;
}) {
  void toSupportedCurrency(currency); // fail visibly on unknown currencies
  const rows: Array<{ label: string; value: number; emphasis?: boolean }> = [
    { label: "Reward", value: rewardMinor },
    { label: "Platform fee", value: feeMinor },
    { label: "Sponsor total", value: totalMinor, emphasis: true },
  ];
  return (
    <div className={cn("space-y-1.5", className)} data-testid="money-breakdown">
      {rows.map((r) => (
        <div
          key={r.label}
          className={cn(
            "flex items-baseline justify-between gap-4 text-sm",
            r.emphasis ? "border-t border-fg/20 pt-1.5 font-semibold" : "text-muted",
          )}
        >
          <span>{r.label}</span>
          <MoneyValue minor={r.value} currency={currency} size={r.emphasis ? "md" : "sm"} />
        </div>
      ))}
      {fundingNote ? <p className="pt-1 text-xs text-subtle">{fundingNote}</p> : null}
    </div>
  );
}
