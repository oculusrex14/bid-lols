import { formatUsd } from "@/lib/format";
import type { BoardStats } from "@/lib/types";

export function StatsBar({ stats }: { stats: BoardStats }) {
  const items = [
    { label: "On the board", value: String(stats.count) },
    { label: "Bid pool", value: formatUsd(stats.poolCents) },
    { label: "Tracked visits", value: stats.clicks.toLocaleString() },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-1">
          <dt className="text-xs uppercase tracking-wider text-subtle">{item.label}</dt>
          <dd className="mt-1 truncate tabular text-base font-medium sm:text-lg">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
