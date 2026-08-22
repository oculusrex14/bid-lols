import { Link } from "@tanstack/react-router";
import type { SiteId } from "@/lib/sites";

/**
 * Cross-sell (point 4): leftover budget on foundersbid / culturebid goes to bidception.
 * Hidden on bidception itself — that board is the destination.
 */
export function LeftoverBudgetCard({ from }: { from: SiteId }) {
  if (from === "bidception") return null;
  return (
    <aside className="mt-6 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="text-xs uppercase tracking-kicker text-subtle">Leftover budget</p>
      <p className="mt-2 text-sm text-muted">
        Have leftover budget? Discover other platforms on{" "}
        <Link
          to="/$site"
          params={{ site: "bidception" }}
          preload="intent"
          className="text-fg underline-offset-4 hover:underline"
        >
          bidception.lol
        </Link>
        .
      </p>
    </aside>
  );
}

/** Bidception-only: this is complementary marketing tools, not a clone war. */
export function DiscoveryNote() {
  return (
    <p className="mt-4 max-w-xl text-sm text-muted">
      Complementary marketing tools — directories, newsletter boards, pay-to-rank
      sites, community pins. Spend the rest of the budget where the same strategy still works.
    </p>
  );
}
