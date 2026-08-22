//#region node_modules/.nitro/vite/services/ssr/assets/hype-0lUaUoAU.js
var HYPE_LOCK_DAILY_VISITS = 8e3;
var DAY_MS = 864e5;
function elapsedHypeDays(launchedAt, now = /* @__PURE__ */ new Date()) {
	const start = new Date(launchedAt).getTime();
	if (!Number.isFinite(start)) return 21;
	return Math.max(0, Math.floor((now.getTime() - start) / DAY_MS));
}
/**
* 6× on day 1 (elapsed 0). Steps down linearly every 24h.
* Exactly 1× after 21 days. Locked (or past window) stays 1×.
*/
function hypeMultiplier(opts) {
	if (opts.locked) return 1;
	const days = elapsedHypeDays(opts.launchedAt, opts.now ?? /* @__PURE__ */ new Date());
	if (days >= 21) return 1;
	return 6 - 5 * days / 21;
}
function displayCount(real, multiplier) {
	const n = Math.round(Number(real) * multiplier);
	return Number.isFinite(n) && n > 0 ? n : 0;
}
function formatCount(n) {
	return Math.round(n).toLocaleString("en-US");
}
//#endregion
export { hypeMultiplier as i, displayCount as n, formatCount as r, HYPE_LOCK_DAILY_VISITS as t };
