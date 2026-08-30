import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatMinor, toSupportedCurrency, type SupportedCurrency } from "@/lib/money";

/**
 * Network Spine (RC3, S-20/S-28): data-intelligence primitives for Bidthrone
 * and anywhere dense numbers matter. Tables adapt: on narrow screens the
 * table gets its own horizontal scroll (intentional, local) rather than
 * unreadable squeezed columns.
 */

export function Metric({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-xs font-medium uppercase tracking-kicker text-subtle">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

export type DataTableColumn<T> = {
  key: string;
  header: string;
  /** className for the <th>/<td> of this column (alignment, width). */
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  testid,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  testid?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)} data-testid={testid}>
      <table className="w-full min-w-[560px] border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-fg/20">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-2 py-2 text-left text-xs font-semibold uppercase tracking-kicker text-subtle", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="row-line transition-colors duration-150 hover:bg-surface/70">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-2 py-2.5 align-top", c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={className}>
      {label ? (
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="text-muted">{label}</span>
          <span className="tabular text-subtle">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "progress"}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-250 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Stacked budget bar (RC3, S-27): every segment is REAL money in the model,
 * labeled and summed by the caller — the UI adds no arithmetic beyond
 * displaying what the ledger says. Accessible: each segment carries its
 * label in an aria list, not just a color.
 */
export type BudgetSegment = {
  key: string;
  label: string;
  minor: number;
  /** Tailwind bg class for the segment fill. */
  fill: string;
};

export function BudgetBar({
  totalMinor,
  segments,
  currency = "INR",
  testid,
  unallocatedLabel = "Unallocated",
}: {
  totalMinor: number;
  segments: BudgetSegment[];
  currency?: string;
  testid?: string;
  unallocatedLabel?: string;
}) {
  // RC5.1 WS13: coerce once; an unknown stored currency fails visibly here
  // instead of being silently assumed INR.
  const cur = toSupportedCurrency(currency);
  const sum = segments.reduce((t, s) => t + s.minor, 0);
  const unallocated = Math.max(0, totalMinor - sum);
  const all: BudgetSegment[] =
    unallocated > 0
      ? [...segments, { key: "__unallocated", label: unallocatedLabel, minor: unallocated, fill: "bg-raised" }]
      : segments;
  return (
    <div data-testid={testid}>
      <div className="flex h-3 overflow-hidden rounded-full border border-fg/10" role="img" aria-label={budgetAria(totalMinor, all, cur)}>
        {all.map((s) => (
          <div
            key={s.key}
            className={cn("h-full", s.fill)}
            style={{ width: totalMinor > 0 ? `${(s.minor / totalMinor) * 100}%` : "0%" }}
          />
        ))}
      </div>
      <ul className="mt-2 space-y-1">
        {all.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-1.5 text-muted">
              <span className={cn("size-2 shrink-0 rounded-full", s.fill)} aria-hidden="true" />
              {s.label}
            </span>
            <span className="tabular shrink-0 font-medium">{formatBudget(s.minor, cur)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatBudget(minor: number, currency: SupportedCurrency): string {
  // Budget labels use the shared money formatter (integer minors only).
  return formatMinor(minor, currency);
}

function budgetAria(totalMinor: number, segments: BudgetSegment[], currency: SupportedCurrency): string {
  const parts = segments.map((s) => `${s.label} ${formatBudget(s.minor, currency)}`);
  return `Budget ${formatBudget(totalMinor, currency)}: ${parts.join(", ")}.`;
}
