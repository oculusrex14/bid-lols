import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { l as Linkedin } from "../_libs/lucide-react.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { r as parseSocials } from "./socials-CEYLul7Z.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/culture-values-pr26i8Qt.js
var import_jsx_runtime = require_jsx_runtime();
function KindIcon({ kind }) {
	if (kind === "linkedin") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Linkedin, { className: "size-4" });
	if (kind === "x") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
		viewBox: "0 0 16 16",
		className: "size-4",
		"aria-hidden": "true",
		fill: "currentColor",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12.6 1.5H14.8L9.9 7.1 15.6 14.5H11.1L7.6 9.9 3.5 14.5H1.2L6.5 8.5 1 1.5H5.6L8.7 5.7 12.6 1.5ZM11.8 13.2H13L4.9 2.7H3.6L11.8 13.2Z" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 16 16",
		className: "size-4",
		"aria-hidden": "true",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "8",
			cy: "8",
			r: "6"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2 8h12M8 2c2 2.2 2 9.8 0 12M8 2c-2 2.2-2 9.8 0 12" })]
	});
}
function FounderSocials({ socials, className }) {
	const links = parseSocials(socials);
	if (links.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: cn("flex flex-wrap items-center gap-1.5", className),
		children: links.map((link) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
			href: link.url,
			target: "_blank",
			rel: "noopener noreferrer",
			title: link.label,
			"aria-label": link.label,
			className: "inline-flex h-11 min-w-11 items-center justify-center rounded-sm px-2.5 text-muted shadow-[var(--shadow-border)] hover:text-fg",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KindIcon, { kind: link.kind }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: link.label
			})]
		}) }, link.url))
	});
}
/** Culturebid “why join us” chips. Keep them small so rows stay fast to paint. */
function CultureValues({ values, className }) {
	if (!values.length) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: cn("flex flex-wrap gap-1.5", className),
		children: values.map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
			className: "rounded-sm px-2 py-1 text-xs text-muted shadow-[var(--shadow-border)]",
			children: value
		}, value))
	});
}
//#endregion
export { FounderSocials as n, CultureValues as t };
