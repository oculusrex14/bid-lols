import { n as SITES, r as isSiteId, t as COPY } from "./_ssr/sites-DQ1RC7LF.mjs";
import { f as useRouterState, h as Outlet, y as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "./_libs/react+tanstack__react-query.mjs";
import { i as ArrowUpRight } from "./_libs/lucide-react.mjs";
import { l as Route$9 } from "./_ssr/router-CGUqDkXs.mjs";
import { t as cn } from "./_ssr/cn-Ccejyh36.mjs";
import { t as Button } from "./_ssr/button-Dhe1uTrn.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_site-BFlnkmvi.js
var import_jsx_runtime = require_jsx_runtime();
function SiteShell({ site, children }) {
	const cfg = SITES[site];
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const other = site === "founders" ? "bidception" : "founders";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"data-theme": site,
		className: "min-h-screen bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/$site",
						params: { site },
						className: "flex min-h-11 items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-display-site text-lg tracking-tight",
							children: cfg.wordmark
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden text-xs text-subtle sm:inline",
							children: ".lol"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "flex items-center gap-1",
						children: [
							[
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
							].map((item) => {
								const last = item.to.split("/").pop();
								const active = item.to === "/$site" ? pathname === `/${site}` || pathname === `/${site}/` : Boolean(last && pathname.startsWith(`/${site}/${last}`));
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: item.to,
									params: { site },
									className: cn("hidden h-11 items-center px-3 text-sm sm:inline-flex", active ? "text-fg" : "text-muted hover:text-fg"),
									children: item.label
								}, item.to);
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/$site",
								params: { site: other },
								className: "hidden h-11 items-center px-3 text-sm text-subtle hover:text-fg md:inline-flex",
								children: SITES[other].wordmark
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								className: "h-10 px-3.5",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/$site/bid",
									params: { site },
									children: COPY.bidNow
								})
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:pb-16",
				children
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "border-t border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						cfg.domain,
						" · highest bid ranks first · ",
						COPY.minBid
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/",
								className: "hover:text-fg",
								children: "Bid.lol"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/spec",
								className: "hover:text-fg",
								children: "Spec"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/$site",
								params: { site: other },
								className: "inline-flex items-center gap-1 hover:text-fg",
								children: [SITES[other].domain, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-3.5" })]
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 p-3 backdrop-blur-sm sm:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					className: "w-full",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/$site/bid",
						params: { site },
						children: cfg.cta
					})
				})
			})
		]
	});
}
function SiteLayout() {
	const { site } = Route$9.useParams();
	if (!isSiteId(site)) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteShell, {
		site,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
	});
}
//#endregion
export { SiteLayout as component };
