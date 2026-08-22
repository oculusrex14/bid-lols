import { r as SITES } from "./sites-BLTVPnCd.mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/founders-masthead-CaAIR3X1.js
var import_jsx_runtime = require_jsx_runtime();
function FoundersMasthead({ size = "page" }) {
	const cfg = SITES.founders;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: cn("masthead text-center", size === "panel" && "masthead-panel"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-kicker text-fg",
				children: "Vol. 01 · The founding record"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: cn("font-display italic tracking-tight", size === "page" ? "mt-3 text-5xl sm:text-7xl" : "mt-2 text-4xl sm:text-5xl"),
				children: [cfg.wordmark, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted",
					children: ".lol"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("mx-auto max-w-xl font-display italic text-fg", size === "page" ? "mt-4 text-xl sm:text-2xl" : "mt-3 text-lg"),
				children: cfg.tagline
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-xs uppercase tracking-wider text-subtle",
				children: cfg.kicker
			})
		]
	});
}
//#endregion
export { FoundersMasthead as t };
