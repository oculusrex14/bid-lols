import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { n as hostOf } from "./format-DJnXAy3q.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/site-favicon-BB3koanO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SiteFavicon({ url, title, size = "md" }) {
	const [failed, setFailed] = (0, import_react.useState)(false);
	const host = hostOf(url);
	const letter = (title.trim()[0] || host[0] || "?").toUpperCase();
	const box = size === "lg" ? "size-10 text-base" : size === "sm" ? "size-7 text-xs" : "size-8 text-sm";
	const src = host ? `/api/favicon?host=${encodeURIComponent(host)}&letter=${encodeURIComponent(letter)}` : "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		"aria-hidden": "true",
		className: cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-raised font-display-site text-fg shadow-[var(--shadow-border)]", box),
		children: [letter, src && !failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src,
			alt: "",
			width: 40,
			height: 40,
			className: "absolute inset-0 size-full bg-raised object-contain",
			loading: "lazy",
			decoding: "async",
			fetchPriority: "low",
			onError: () => setFailed(true)
		}) : null]
	});
}
//#endregion
export { SiteFavicon as t };
