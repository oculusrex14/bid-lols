import type { SiteId } from "@/lib/sites";

const KEY = "bidlol.owned.v2";

export type OwnedListing = {
  site: SiteId;
  listingId: string;
  token: string;
  title: string;
};

export function readOwned(): OwnedListing[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OwnedListing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberOwned(entry: OwnedListing) {
  const next = readOwned().filter(
    (row) => !(row.site === entry.site && row.listingId === entry.listingId),
  );
  next.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(next.slice(0, 40)));
}

export function ownedFor(site: SiteId) {
  return readOwned().filter((row) => row.site === site);
}

/** Drop browser-saved rows that are no longer on the live board. */
export function pruneOwned(site: SiteId, liveIds: string[]) {
  const live = new Set(liveIds);
  const kept = readOwned().filter(
    (row) => row.site !== site || live.has(row.listingId),
  );
  if (typeof window === "undefined") return ownedFor(site);
  try {
    localStorage.setItem(KEY, JSON.stringify(kept.slice(0, 40)));
  } catch {
    /* ignore quota */
  }
  return kept.filter((row) => row.site === site);
}
