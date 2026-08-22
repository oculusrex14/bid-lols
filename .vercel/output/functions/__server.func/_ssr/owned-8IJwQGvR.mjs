//#region node_modules/.nitro/vite/services/ssr/assets/owned-8IJwQGvR.js
var KEY = "bidlol.owned.v1";
function readOwned() {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
function rememberOwned(entry) {
	const next = readOwned().filter((row) => !(row.site === entry.site && row.listingId === entry.listingId));
	next.unshift(entry);
	localStorage.setItem(KEY, JSON.stringify(next.slice(0, 40)));
}
function ownedFor(site) {
	return readOwned().filter((row) => row.site === site);
}
//#endregion
export { rememberOwned as n, ownedFor as t };
