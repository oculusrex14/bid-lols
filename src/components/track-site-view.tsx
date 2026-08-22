import { useEffect } from "react";
import { trackView } from "@/lib/board-fns";
import { SITE_IDS, type SiteId } from "@/lib/sites";

const KEY = "bidthrone.viewed";

/** One request per session. Portal batches all three boards instead of three round-trips. */
export function TrackSiteView({ site }: { site: SiteId | "portal" }) {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      const seen = raw ? (JSON.parse(raw) as string[]) : [];
      const targets: SiteId[] = site === "portal" ? [...SITE_IDS] : [site];
      const next = [...seen];
      const fresh = targets.filter((id) => !next.includes(id));
      if (fresh.length) {
        next.push(...fresh);
        sessionStorage.setItem(KEY, JSON.stringify(next));
        void trackView({ data: { sites: fresh } });
      }
    } catch {
      const targets: SiteId[] = site === "portal" ? [...SITE_IDS] : [site];
      void trackView({ data: { sites: targets } });
    }
  }, [site]);
  return null;
}
