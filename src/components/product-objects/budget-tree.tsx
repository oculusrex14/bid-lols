import { cn } from "@/lib/cn";
import { MoneyValue } from "@/components/ui/money";

/**
 * RC5 §22.4: the Bidception allocation tree. Presentation ONLY — it
 * receives authoritative values (total, captain, child allocations,
 * reserve) from the caller and renders geometry. It computes no business
 * decision: the reconciliation check happens in the caller's test, not
 * here. Raw visual values live in the PRODUCT OBJECT LAYER of
 * src/styles.css (.budget-tree-shell / .tree-* classes).
 */
export interface BudgetTreeValues {
  title: string;
  currency?: string;
  totalMinor: number;
  captainLabel: string;
  captainMinor: number;
  children: Array<{ key: string; label: string; minor: number }>;
  reserveMinor: number;
}

export function BudgetTree({
  values,
  sample = false,
  note,
  className,
}: {
  values: BudgetTreeValues;
  /** Labelled-example mode (data-example="true" + visible SAMPLE text). */
  sample?: boolean;
  note?: string;
  className?: string;
}) {
  const total =
    values.captainMinor +
    values.children.reduce((a, c) => a + c.minor, 0) +
    values.reserveMinor;
  const reconciles = total === values.totalMinor;
  return (
    <div
      className={cn("budget-tree-shell", className)}
      data-example={sample ? "true" : undefined}
      aria-label={sample ? `Example allocation: ${values.title}` : `Allocation: ${values.title}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight">{values.title}</p>
        <p className="tabular text-sm font-medium text-accent">
          <MoneyValue minor={values.totalMinor} currency={values.currency} trimZeroDecimals />
        </p>
      </div>
      {sample ? <span className="obj-microlabel mt-1 block text-subtle">Sample, not live</span> : null}

      <div className="mt-3 flex justify-center">
        <div className="tree-captain-node">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            {values.captainLabel}
          </p>
          <p className="tabular text-sm font-medium">
            <MoneyValue minor={values.captainMinor} currency={values.currency} trimZeroDecimals />
          </p>
        </div>
      </div>

      <div className="tree-children tree-connector mt-10">
        {values.children.map((c) => (
          <div key={c.key} className="tree-child-node">
            <p className="text-xs leading-snug text-muted">{c.label}</p>
            <p className="tree-child-amount mt-1 tabular">
              <MoneyValue minor={c.minor} currency={values.currency} trimZeroDecimals />
            </p>
          </div>
        ))}
      </div>

      {values.reserveMinor > 0 ? (
        <p className="mt-2 text-xs text-subtle">
          Reserve:{" "}
          <span className="tabular font-medium">
            <MoneyValue minor={values.reserveMinor} currency={values.currency} trimZeroDecimals />
          </span>
        </p>
      ) : null}
      <p className="mt-3 text-xs text-subtle">
        {reconciles
          ? "Allocated: captain + child work packages + reserve reconcile exactly to the total."
          : "This allocation does not reconcile to the total. Do not publish it."}
        {note ? ` ${note}` : null}
      </p>
    </div>
  );
}
