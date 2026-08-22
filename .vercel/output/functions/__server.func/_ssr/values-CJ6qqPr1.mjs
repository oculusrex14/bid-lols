//#region node_modules/.nitro/vite/services/ssr/assets/values-CJ6qqPr1.js
function clampValues(raw) {
	let source = raw;
	if (typeof source === "string") {
		const asText = source;
		try {
			source = JSON.parse(asText);
		} catch {
			source = asText.split(/[,\n]/);
		}
	}
	const list = Array.isArray(source) ? source : [];
	const out = [];
	for (const item of list) {
		if (typeof item !== "string") continue;
		const trimmed = item.trim().slice(0, 48);
		if (!trimmed) continue;
		if (!out.includes(trimmed)) out.push(trimmed);
		if (out.length >= 5) break;
	}
	return out;
}
//#endregion
export { clampValues as t };
