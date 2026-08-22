import { n as SITES } from "./sites-DQ1RC7LF.mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { o as ArrowRightLeft, r as CircleDollarSign } from "../_libs/lucide-react.mjs";
import { i as relativeTime, t as formatUsd } from "./format-DJnXAy3q.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/activity-feed-Dl9QR5yA.js
var import_jsx_runtime = require_jsx_runtime();
var KIND = {
	bid: "New bid",
	rebid: "Re-bid",
	swap: "URL swap",
	click: "Visit"
};
function ActivityFeed({ site, items, compact = false }) {
	if (items.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "py-8 text-sm text-muted",
		children: SITES[site].emptyActivity
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
		className: "flex flex-col",
		children: [items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex items-start gap-3 border-b border-border py-3 last:border-b-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-0.5 text-muted",
				children: item.kind === "swap" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRightLeft, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleDollarSign, { className: "size-4" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "truncate text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-muted",
						children: [KIND[item.kind], " · "]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium",
						children: item.title
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-0.5 text-xs text-subtle",
					children: [
						item.amountCents != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "tabular text-up",
							children: [formatUsd(item.amountCents), " · "]
						}) : null,
						item.rankTo != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"rank ",
							item.rankTo,
							" · "
						] }) : null,
						relativeTime(item.createdAt)
					]
				})]
			})]
		}, item.id)), compact ? null : null]
	});
}
//#endregion
export { ActivityFeed as t };
