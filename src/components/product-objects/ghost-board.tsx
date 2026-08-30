import { cn } from "@/lib/cn";

/**
 * RC5 §23.10: the ghost leaderboard. An empty Bidthrone board still looks
 * like the product: table headers, row lines, ghost bars as structural
 * chrome. No fake identities, no fake scores, no fake ranks 1-5: the rank
 * cell is an em dash and the honesty line says what is true.
 */
export function GhostBoard({
  headers,
  rows = 3,
  note = "No eligible records yet.",
  className,
}: {
  /** Column headers after the rank column, e.g. ["Member", "Metric"]. */
  headers: string[];
  rows?: number;
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-line", className)} data-ghost-board="true">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-kicker text-subtle">
              <th scope="col" className="obj-cell w-10">
                Rank
              </th>
              {headers.map((h) => (
                <th key={h} scope="col" className="obj-cell">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                <td className="obj-cell" aria-hidden="true"></td>
                <td className="obj-cell">
                  <div className="obj-ghost-bar w-40 max-w-full" aria-hidden="true" />
                </td>
                <td className="obj-cell text-right">
                  <div className="obj-ghost-bar ml-auto w-16" aria-hidden="true" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-line bg-surface px-4 py-2.5 text-xs text-muted">{note}</p>
    </div>
  );
}
