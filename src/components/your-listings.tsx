import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { pruneOwned, type OwnedListing } from "@/lib/owned";
import type { SiteId } from "@/lib/sites";

export function YourListings({
  site,
  liveIds,
}: {
  site: SiteId;
  liveIds: string[];
}) {
  const [rows, setRows] = useState<OwnedListing[]>([]);

  const liveKey = liveIds.join(",");
  useEffect(() => {
    setRows(pruneOwned(site, liveKey ? liveKey.split(",") : []));
  }, [site, liveKey]);

  if (rows.length === 0) return null;

  return (
    <div className="mt-8 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h3 className="text-sm font-medium">Your listings in this browser</h3>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.listingId}>
            <Link
              to="/$site/manage/$token"
              params={{ site, token: row.token }}
              className="text-sm text-muted hover:text-fg"
            >
              {row.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
