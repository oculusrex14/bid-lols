/**
 * Visit-dedup decision for TrackProductView (Phase 00.6, AC-3.2/AC-3.3).
 *
 * The decision is extracted from the component so both paths are DELIBERATE
 * and unit-tested:
 *
 *  - storage available + product already seen this session -> "deduped"
 *    (no visit increment);
 *  - storage available + first impression this session     -> "record"
 *    (one visit increment; the marker is written);
 *  - storage UNAVAILABLE (private mode, blocked, quota, …) -> "record"
 *    deliberately, per impression. The documented degradation: without
 *    session storage there is no way to know whether this browser already
 *    counted a visit, so the metric degrades to per-impression counting
 *    instead of silently dropping visits. It is therefore NOT a
 *    unique-visitor signal in that mode.
 *
 * Pure module: no React, no window access — testable under node:test.
 */

export type VisitDecision = "record" | "deduped";

export interface VisitStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const VISIT_KEY = "bidnet.visit";

/** @param site the product key this impression belongs to (server-derived). */
export function visitDecision(
  site: string,
  storage: VisitStorage | null,
  key = VISIT_KEY,
): VisitDecision {
  if (storage === null) return "record"; // deliberate degradation (documented)
  try {
    const raw = storage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const seen: string[] = Array.isArray(parsed) ? parsed : [];
    if (seen.includes(site)) return "deduped";
    seen.push(site);
    storage.setItem(key, JSON.stringify(seen));
    return "record";
  } catch {
    // Corrupt marker / quota / revoked storage: this impression still records
    // (the documented per-impression degradation), and the marker is
    // best-effort reset so the session converges on the next call. Never
    // fail the page.
    try {
      storage.setItem(key, JSON.stringify([site]));
    } catch {
      // storage is unreadable AND unwritable — pure degradation.
    }
    return "record";
  }
}
