import type { SiteId } from "@/lib/sites";

const KEY = "bidlol.owned.v1";

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
