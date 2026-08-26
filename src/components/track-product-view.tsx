import { useEffect } from "react";
import { trackPageView, trackVisit } from "@/lib/analytics";
import type { ProductKey } from "@/lib/host";

const VISIT_KEY = "bidnet.visit";

/**
 * Honest analytics on mount (W2): one view increment per page impression;
 * at most one visit increment per browser session per product (deduped in
 * sessionStorage). No scaling, no double-count.
 */
export function TrackProductView({ site }: { site: ProductKey }) {
  useEffect(() => {
    void trackPageView({ data: { site } });
    try {
      const raw = sessionStorage.getItem(VISIT_KEY);
      const seen: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      if (!seen.includes(site)) {
        seen.push(site);
        sessionStorage.setItem(VISIT_KEY, JSON.stringify(seen));
        void trackVisit({ data: { site } });
      }
    } catch {
      // sessionStorage unavailable (private mode / blocked): views still
      // record; the visit dedup degrades to per-page.
    }
  }, [site]);
  return null;
}
