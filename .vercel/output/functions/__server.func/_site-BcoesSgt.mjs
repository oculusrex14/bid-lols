import { a as isSiteId, r as SITES, t as COPY } from "./_ssr/sites-aEGgv7RZ.mjs";
import { f as useRouterState, h as Outlet, y as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "./_libs/react+tanstack__react-query.mjs";
import { p as Route$14 } from "./_ssr/router-CW0kdSlg.mjs";
import { t as cn } from "./_ssr/cn-Ccejyh36.mjs";
import { t as Button } from "./_ssr/button-Dhe1uTrn.mjs";
import { t as LegalLinks } from "./_ssr/legal-OC8g2ujJ.mjs";
import { n as SiteFooter, t as ModeToggle } from "./_ssr/site-footer-QxDCDe54.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_site-BcoesSgt.js
var import_jsx_runtime = require_jsx_runtime();
function SiteShell({ site, children }) {
	const cfg = SITES[site];
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const nav = [
		{
			to: "/$site",
			label: "Board"
		},
		{
			to: "/$site/rules",
			label: "Rules"
		},
		{
			to: "/$site/activity",
			label: "Live"
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"data-theme": site,
		className: "min-h-screen bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl px-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex h-14 items-center justify-between gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/$site",
									params: { site },
									className: "flex min-h-11 min-w-0 items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteMark, { site }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-display-site text-lg tracking-tight",
											children: cfg.wordmark
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "hidden text-xs text-subtle sm:inline",
											children: ".lol"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
									className: "hidden items-center gap-1 md:flex",
									children: nav.map((item) => {
										const last = item.to.split("/").pop();
										const active = item.to === "/$site" ? pathname === `/${site}` || pathname === `/${site}/` : Boolean(last && pathname.startsWith(`/${site}/${last}`));
										return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
											to: item.to,
											params: { site },
											className: cn("inline-flex h-11 items-center px-3 text-sm", active ? "text-fg" : "text-muted hover:text-fg"),
											children: item.label
										}, item.to);
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									className: "h-10 shrink-0 px-3.5",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/$site/bid",
										params: { site },
										children: COPY.bidNow
									})
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-2 pb-3 md:hidden",
							children: nav.map((item) => {
								const last = item.to.split("/").pop();
								const active = item.to === "/$site" ? pathname === `/${site}` || pathname === `/${site}/` : Boolean(last && pathname.startsWith(`/${site}/${last}`));
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: item.to,
									params: { site },
									className: cn("inline-flex h-11 items-center px-2 text-sm", active ? "text-fg" : "text-muted hover:text-fg"),
									children: item.label
								}, item.to);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pb-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeToggle, {})
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "mx-auto w-full max-w-6xl px-4 pb-32 pt-8 sm:pb-16",
				children
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pb-24 sm:pb-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { site })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					className: "w-full",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/$site/bid",
						params: { site },
						children: cfg.cta
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegalLinks, {
					site,
					className: "mt-2 justify-center text-xs"
				})]
			})
		]
	});
}
function SiteMark({ site }) {
	if (site === "founders") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		"aria-hidden": "true",
		className: "flex size-9 items-center justify-center rounded-sm font-display text-lg italic shadow-[var(--shadow-border)]",
		children: "f"
	});
	if (site === "culture") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		"aria-hidden": "true",
		className: "flex size-9 items-center justify-center rounded-sm font-sans text-sm font-medium shadow-[var(--shadow-border)]",
		children: "c"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		"aria-hidden": "true",
		className: "flex size-9 items-center justify-center rounded-sm font-meta text-sm shadow-[var(--shadow-border)]",
		children: "b"
	});
}
/** One file-route tree serves founders | culture | bidception. Board key is `site`, not a board_type column. */
function SiteLayout() {
	const { site } = Route$14.useParams();
	if (!isSiteId(site)) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteShell, {
		site,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
	});
}
//#endregion
export { SiteLayout as component };
