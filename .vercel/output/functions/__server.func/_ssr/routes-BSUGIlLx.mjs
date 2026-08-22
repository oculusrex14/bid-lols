import { n as PORTAL, r as SITES } from "./sites-BLTVPnCd.mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { m as ArrowRight } from "../_libs/lucide-react.mjs";
import { m as Route$15 } from "./router-DcNSb0gZ.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { n as SiteFooter, t as ModeToggle } from "./site-footer-DtG9djWu.mjs";
import { r as formatCount } from "./hype-0lUaUoAU.mjs";
import { r as rankLabel, t as formatUsd } from "./format-DJnXAy3q.mjs";
import { t as TrackSiteView } from "./track-site-view-Cycge0Eu.mjs";
import { t as SiteFavicon } from "./site-favicon-CZfHWoUy.mjs";
import { t as FoundersMasthead } from "./founders-masthead-CaAIR3X1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BSUGIlLx.js
var import_jsx_runtime = require_jsx_runtime();
function HypeCounts({ visitsToday, totalViews, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
		className: cn("text-sm text-muted", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tabular font-medium text-fg",
				children: formatCount(visitsToday)
			}),
			" visits today",
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mx-2 text-subtle",
				children: "·"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "tabular font-medium text-fg",
				children: formatCount(totalViews)
			}),
			" total views"
		]
	});
}
function Home() {
	const portal = Route$15.useLoaderData();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrackSiteView, { site: "portal" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mx-auto max-w-5xl px-5 py-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs font-medium uppercase tracking-kicker text-fg",
						children: PORTAL.domain
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/spec",
						className: "text-sm text-muted hover:text-fg",
						children: "Full spec"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeToggle, {})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "relative mx-auto max-w-5xl px-5 pb-6 pt-4 sm:pb-8 sm:pt-12",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid-veil pointer-events-none absolute inset-0 opacity-70" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rise-in text-xs uppercase tracking-kicker text-subtle",
						children: "Two boards. One mechanic."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "rise-in rise-in-2 mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:mt-4 sm:text-7xl",
						children: ["Pay to rank.", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "italic text-muted",
							children: " Highest bid stands first."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rise-in rise-in-3 mt-3 max-w-xl text-sm text-muted sm:mt-5 sm:text-lg",
						children: "Founders buy trust on one board. Bid sites fight for the meta crown on the other. Whole dollars. Five dollar floor. Re-bids pay the difference."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rise-in rise-in-4 mt-5 space-y-2 sm:hidden",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs uppercase tracking-kicker text-subtle",
								children: "foundersbid"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HypeCounts, {
								visitsToday: portal.founders.stats.visitsToday,
								totalViews: portal.founders.stats.totalViews
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "pt-2 text-xs uppercase tracking-kicker text-subtle",
								children: "bidception"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HypeCounts, {
								visitsToday: portal.bidception.stats.visitsToday,
								totalViews: portal.bidception.stats.totalViews
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid min-h-[70vh] grid-cols-1 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SitePanel, {
					site: "founders",
					listings: portal.founders.listings.slice(0, 3),
					pool: portal.founders.stats.poolCents,
					visitsToday: portal.founders.stats.visitsToday,
					totalViews: portal.founders.stats.totalViews
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SitePanel, {
					site: "bidception",
					listings: portal.bidception.listings.slice(0, 3),
					pool: portal.bidception.stats.poolCents,
					visitsToday: portal.bidception.stats.visitsToday,
					totalViews: portal.bidception.stats.totalViews,
					cool: true
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { site: "founders" })
		]
	});
}
function SitePanel({ site, listings, pool, visitsToday, totalViews, cool }) {
	const cfg = SITES[site];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		"data-theme": site,
		className: cn("flex flex-col justify-between border-t border-border bg-bg px-5 py-10 sm:px-10 sm:py-14", cool && "lg:border-l"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			site === "founders" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FoundersMasthead, { size: "panel" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-kicker text-subtle",
					children: cfg.kicker
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
					className: "font-display-site mt-3 text-4xl tracking-tight sm:text-5xl",
					children: [cfg.wordmark, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-subtle",
						children: ".lol"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 max-w-md text-muted",
					children: cfg.tagline
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HypeCounts, {
				visitsToday,
				totalViews,
				className: "mt-6"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs uppercase tracking-wider text-subtle",
				children: ["Bid pool · ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "tabular text-fg",
					children: formatUsd(pool)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-4 flex flex-col gap-2",
				children: listings.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-baseline justify-between gap-3 rounded-lg bg-surface px-3 py-2.5 shadow-[var(--shadow-border)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex min-w-0 items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "tabular text-sm text-muted",
								children: rankLabel(row.rank)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFavicon, {
								url: row.url,
								title: row.title,
								size: "sm"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate text-sm",
								children: site === "founders" && row.team ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-display italic",
									children: row.team
								}) : row.title
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "tabular text-sm",
						children: formatUsd(row.bidCents)
					})]
				}, row.id))
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/$site",
			params: { site },
			className: "mt-10 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.96]",
			children: [
				"Enter ",
				cfg.wordmark,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" })
			]
		})]
	});
}
//#endregion
export { Home as component };
