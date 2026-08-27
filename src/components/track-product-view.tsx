import { useEffect } from "react";
import { trackPageView, trackVisit } from "@/lib/analytics";
import { VISIT_KEY, visitDecision } from "@/lib/visit-dedup";
import type { ProductKey } from "@/lib/host";

/**
 * Honest analytics on mount. One view per page impression; at most one visit
 * per browser session per product (sessionStorage `bidnet.visit` array), with
 * the DELIBERATE per-impression degradation when storage is unavailable
 * (src/lib/visit-dedup.ts — the decision is unit-tested).
 *
 * Phase 00.6: the server functions carry no client data — the product they
 * attribute the metric to is determined server-side from the request Host
 * header. `site` here is used ONLY as the session-dedup key (it is the
 * loader-resolved product, not browser-chosen analytics data).
 */
export function TrackProductView({ site }: { site: ProductKey }) {
  useEffect(() => {
    void trackPageView({});
    let storage: Storage | null = null;
    try {
      storage = window.sessionStorage;
      // Touch the storage to surface SecurityError (blocked/private mode).
      window.sessionStorage.getItem(VISIT_KEY);
    } catch {
      storage = null;
    }
    if (visitDecision(site, storage) === "record") {
      void trackVisit({});
    }
  }, [site]);
  return null;
}
