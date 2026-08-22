import { useEffect } from "react";
import { trackView } from "@/lib/board-fns";
import type { SiteId } from "@/lib/sites";

const KEY = "bidthrone.viewed";

export function TrackSiteView({ site }: { site: SiteId | "portal" }) {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      const seen = raw ? (JSON.parse(raw) as string[]) : [];
      const targets: SiteId[] =
        site === "portal" ? ["founders", "bidception"] : [site];
      const next = [...seen];
      for (const id of targets) {
        if (next.includes(id)) continue;
        next.push(id);
        void trackView({ data: { site: id } });
      }
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      if (site === "portal") {
        void trackView({ data: { site: "founders" } });
        void trackView({ data: { site: "bidception" } });
      } else {
        void trackView({ data: { site } });
      }
    }
  }, [site]);
  return null;
}
