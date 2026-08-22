//#region node_modules/.nitro/vite/services/ssr/assets/format-DJnXAy3q.js
function formatUsd(cents) {
	const dollars = Math.round(cents) / 100;
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: dollars % 1 === 0 ? 0 : 2
	}).format(dollars);
}
function relativeTime(iso) {
	const then = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
	const delta = Math.max(0, Date.now() - then);
	const sec = Math.round(delta / 1e3);
	if (sec < 20) return "just now";
	if (sec < 60) return `${sec}s ago`;
	const min = Math.round(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr}h ago`;
	return `${Math.round(hr / 24)}d ago`;
}
function hostOf(url) {
	try {
		return new URL(url).host.replace(/^www\./, "");
	} catch {
		return url;
	}
}
function rankLabel(rank) {
	if (!rank) return "—";
	return String(rank).padStart(2, "0");
}
//#endregion
export { relativeTime as i, hostOf as n, rankLabel as r, formatUsd as t };
