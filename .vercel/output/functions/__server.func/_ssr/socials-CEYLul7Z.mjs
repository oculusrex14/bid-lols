//#region node_modules/.nitro/vite/services/ssr/assets/socials-CEYLul7Z.js
function normalizeUrl(raw) {
	const trimmed = raw.trim();
	if (!trimmed) throw new Error("Enter a URL.");
	const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	let parsed;
	try {
		parsed = new URL(withProto);
	} catch {
		throw new Error("That URL is not valid.");
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Only http and https URLs can be listed.");
	parsed.hash = "";
	if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) parsed.pathname = parsed.pathname.slice(0, -1);
	parsed.hostname = parsed.hostname.toLowerCase();
	return parsed.toString();
}
function urlKey(url) {
	const u = new URL(normalizeUrl(url));
	return `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}${u.search}`.toLowerCase();
}
function clampSocials(raw) {
	let source = raw;
	if (typeof source === "string") {
		const asText = source;
		try {
			source = JSON.parse(asText);
		} catch {
			source = asText.trim() ? [asText] : [];
		}
	}
	const list = Array.isArray(source) ? source : [];
	const out = [];
	for (const item of list) {
		if (typeof item !== "string") continue;
		const trimmed = item.trim();
		if (!trimmed) continue;
		try {
			const url = normalizeUrl(trimmed);
			if (!out.includes(url)) out.push(url);
		} catch {
			continue;
		}
		if (out.length >= 5) break;
	}
	return out;
}
function socialKind(url) {
	try {
		const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
		if (host === "x.com" || host === "twitter.com" || host.endsWith(".x.com")) return "x";
		if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
	} catch {}
	return "web";
}
function parseSocials(raw) {
	return clampSocials(raw).map((url) => {
		const kind = socialKind(url);
		let host = url;
		try {
			host = new URL(url).hostname.replace(/^www\./, "");
		} catch {}
		return {
			url,
			host,
			kind,
			label: kind === "x" ? "X" : kind === "linkedin" ? "LinkedIn" : host
		};
	});
}
function takeFirstDollars(leaderBidCents) {
	const dollars = Math.round((leaderBidCents ?? 0) / 100);
	if (dollars < 1) return 5;
	return dollars + 1;
}
//#endregion
export { urlKey as a, takeFirstDollars as i, normalizeUrl as n, parseSocials as r, clampSocials as t };
