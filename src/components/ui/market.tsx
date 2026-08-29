import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Network Spine (RC3, S-20/S-23): marketplace browse primitives.
 * Rows (not cards-per-item) for dense scanning: one hairline-separated
 * line per entity, money left-aligned tabular, status right.
 */

export function MarketplaceRow({
  href,
  money,
  moneyLabel,
  title,
  sub,
  chips,
  status,
  trailing,
  className,
}: {
  href: string;
  money?: ReactNode;
  moneyLabel?: string;
  title: ReactNode;
  sub?: ReactNode;
  chips?: ReactNode;
  status?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  const moneyBlock = money ? (
    <div>
      <p className="tabular text-base font-semibold text-accent">{money}</p>
      {moneyLabel ? <p className="text-[11px] text-subtle">{moneyLabel}</p> : null}
    </div>
  ) : null;
  return (
    <a
      href={href}
      className={cn("row-line group flex gap-4 px-1 py-4 transition-colors duration-150 hover:bg-surface/70", className)}
    >
      {money ? <div className="hidden w-32 shrink-0 sm:block">{moneyBlock}</div> : null}
      <div className="min-w-0 flex-1">
        {money ? <div className="mb-1.5 sm:hidden">{moneyBlock}</div> : null}
        <p className="truncate text-[15px] font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
          {title}
        </p>
        {sub ? <div className="mt-1 truncate text-xs text-muted">{sub}</div> : null}
        {chips ? <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{chips}</div> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {status}
        {trailing ? <div className="text-xs text-subtle">{trailing}</div> : null}
      </div>
    </a>
  );
}

export function FilterBar({ children, resultCount, className }: {
  children: ReactNode;
  resultCount?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="group" aria-label="Filters">
      {children}
      {resultCount ? <span className="ml-auto text-xs text-subtle tabular">{resultCount}</span> : null}
    </div>
  );
}

export function SortControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-sm border border-fg/20 bg-surface px-2 text-xs font-medium text-fg"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Compact filter chip toggle (selected state = accent, not just color). */
export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded-full border px-3 text-xs font-medium transition-colors duration-150",
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-fg/15 bg-surface text-muted hover:border-fg/40",
      )}
    >
      {children}
    </button>
  );
}

export function StepIndicator({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)} aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
                done && "bg-accent text-accent-fg",
                active && "border-2 border-accent text-accent",
                !done && !active && "border border-fg/20 text-subtle",
              )}
            >
              {i + 1}
            </span>
            <span className={cn("text-xs", active ? "font-semibold text-fg" : "text-subtle")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Detail/create-page sticky sidebar (becomes normal flow under lg). */
export function StickyPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside className={cn("space-y-4 lg:sticky lg:top-20", className)} aria-label="Details">
      {children}
    </aside>
  );
}
