import { o as __toESM } from "../_runtime.mjs";
import { i as SITE_IDS, n as PORTAL, o as otherSites, r as SITES, t as COPY } from "./sites-aEGgv7RZ.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { p as ArrowUpRight, r as Sun, s as Moon } from "../_libs/lucide-react.mjs";
import { g as readMode, h as applyMode } from "./router-CW0kdSlg.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { n as contactEmail, t as LegalLinks } from "./legal-OC8g2ujJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/site-footer-QxDCDe54.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ModeToggle({ variant = "bar" }) {
	const [mode, setMode] = (0, import_react.useState)("light");
	(0, import_react.useEffect)(() => {
		const current = readMode();
		setMode(current);
		applyMode(current);
	}, []);
	function pick(next) {
		applyMode(next);
		setMode(next);
		window.dispatchEvent(new CustomEvent("bidlol:mode", { detail: next }));
	}
	const switches = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		role: "group",
		"aria-label": "Color mode",
		className: "inline-flex h-11 shrink-0 items-center rounded-md bg-surface p-0.5 shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			"aria-pressed": mode === "light",
			onClick: () => pick("light"),
			className: cn("inline-flex h-10 min-w-20 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium", mode === "light" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "size-4" }), "Light"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			"aria-pressed": mode === "dark",
			onClick: () => pick("dark"),
			className: cn("inline-flex h-10 min-w-20 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium", mode === "dark" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "size-4" }), "Dark"]
		})]
	});
	if (variant === "inline") return switches;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		id: "appearance-toggle",
		className: "flex w-full items-center justify-between gap-3 rounded-md bg-raised px-3 py-2 shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs font-medium uppercase tracking-kicker text-fg",
			children: "Appearance"
		}), switches]
	});
}
function SiteFooter({ site, showSister = true }) {
	const portal = site === "portal";
	const cfg = portal ? null : SITES[site];
	const email = portal ? null : contactEmail(site);
	const sisters = portal ? SITE_IDS : otherSites(site);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
		className: "border-t-2 border-fg/20 bg-surface",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted",
					children: [
						portal ? PORTAL.domain : cfg.domain,
						" · highest bid ranks first · ",
						COPY.minBid
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-4 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						preload: "intent",
						className: "hover:text-muted",
						children: PORTAL.domain
					}), showSister ? sisters.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/$site",
						params: { site: id },
						preload: "intent",
						className: "inline-flex items-center gap-1 hover:text-muted",
						children: [SITES[id].domain, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-3.5" })]
					}, id)) : null]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-t border-border pt-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-fg",
						children: ["Cashfree Payments · no refunds", portal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-2 block text-sm text-muted",
							children: SITE_IDS.map((id, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [i > 0 ? " · " : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: `mailto:${contactEmail(id)}`,
								className: "underline-offset-4 hover:underline",
								children: contactEmail(id)
							})] }, id))
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [" · ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: `mailto:${email}`,
							className: "underline-offset-4 hover:underline",
							children: email
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegalLinks, {
						site: portal ? "founders" : site,
						className: "mt-4"
					})]
				})
			]
		})
	});
}
//#endregion
export { SiteFooter as n, ModeToggle as t };
