import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ownedFor, type OwnedListing } from "@/lib/owned";
import type { SiteId } from "@/lib/sites";

export function YourListings({ site }: { site: SiteId }) {
  const [rows, setRows] = useState<OwnedListing[]>([]);

  useEffect(() => {
    setRows(ownedFor(site));
  }, [site]);

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
