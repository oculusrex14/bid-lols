import { ArrowRightLeft, CircleDollarSign } from "lucide-react";
import { formatUsd, relativeTime } from "@/lib/format";
import { SITES, type SiteId } from "@/lib/sites";
import type { Activity } from "@/lib/types";

const KIND: Record<Activity["kind"], string> = {
  bid: "New bid",
  rebid: "Re-bid",
  swap: "URL swap",
  click: "Visit",
};

export function ActivityFeed({
  site,
  items,
  compact = false,
}: {
  site: SiteId;
  items: Activity[];
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-sm text-muted">{SITES[site].emptyActivity}</p>
    );
  }

  return (
    <ol className="flex flex-col">
      {items.map((item) => (
        <li
          key={item.id}
          className={
            compact
              ? "flex items-start gap-3 border-b border-border py-2.5 last:border-b-0"
              : "flex items-start gap-3 border-b border-border py-3 last:border-b-0"
          }
        >
          <span className="mt-0.5 text-muted">
            {item.kind === "swap" ? (
              <ArrowRightLeft className="size-4" />
            ) : (
              <CircleDollarSign className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">
              <span className="text-muted">{KIND[item.kind]} · </span>
              <span className="font-medium">{item.title}</span>
            </p>
            <p className="mt-0.5 text-xs text-subtle">
              {item.amountCents != null ? (
                <span className="tabular text-up">{formatUsd(item.amountCents)} · </span>
              ) : null}
              {item.rankTo != null ? <span>rank {item.rankTo} · </span> : null}
              {relativeTime(item.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
