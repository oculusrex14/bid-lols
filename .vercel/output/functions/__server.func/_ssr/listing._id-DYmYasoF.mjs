import { i as isSiteId, r as SITES, t as COPY } from "./sites-BLTVPnCd.mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { p as ArrowUpRight } from "../_libs/lucide-react.mjs";
import { T as trackClick, r as Route$2, x as getListing } from "./router-DcNSb0gZ.mjs";
import { t as Button } from "./button-Dhe1uTrn.mjs";
import { i as relativeTime, n as hostOf, r as rankLabel, t as formatUsd } from "./format-DJnXAy3q.mjs";
import { t as ActivityFeed } from "./activity-feed-DpjwEEJT.mjs";
import { t as TrackSiteView } from "./track-site-view-Cycge0Eu.mjs";
import { t as SiteFavicon } from "./site-favicon-CZfHWoUy.mjs";
import { t as FounderSocials } from "./founder-socials-DwHUYlS8.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/listing._id-DYmYasoF.js
var import_jsx_runtime = require_jsx_runtime();
function ListingPage() {
	const { site: siteParam, id } = Route$2.useParams();
	const site = isSiteId(siteParam) ? siteParam : "founders";
	const initial = Route$2.useLoaderData();
	const query = useQuery({
		queryKey: ["listing", id],
		queryFn: () => getListing({ data: { id } }),
		placeholderData: initial,
		refetchInterval: 5e3
	});
	const cfg = SITES[site];
	if (query.isError) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "py-16 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display-site text-3xl",
			children: "Listing not found"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/$site",
			params: { site },
			className: "mt-4 inline-block text-sm text-muted hover:text-fg",
			children: COPY.backToBoard
		})]
	});
	const listing = query.data?.listing;
	if (!listing) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-64 rounded-xl bg-surface shadow-[var(--shadow-border)]" });
	const listingId = listing.id;
	const listingUrl = listing.url;
	async function visit() {
		try {
			const res = await trackClick({ data: { id: listingId } });
			window.open(res.url, "_blank", "noopener,noreferrer");
		} catch {
			window.open(listingUrl, "_blank", "noopener,noreferrer");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-4xl gap-10 lg:grid-cols-[minmax(0,1fr)_280px]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrackSiteView, { site }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "tabular text-sm text-muted",
					children: ["Rank ", rankLabel(listing.rank)]
				}),
				site === "founders" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-start gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFavicon, {
							url: listing.url,
							title: listing.title,
							size: "lg"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs uppercase tracking-kicker text-subtle",
								children: "Founding team"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "mt-2 font-display text-4xl italic tracking-tight sm:text-5xl",
								children: listing.team || listing.title
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-4 text-muted",
						children: [listing.title, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-subtle",
							children: [" · ", hostOf(listing.url)]
						})]
					}),
					listing.tagline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 font-display text-lg italic text-fg",
						children: listing.tagline
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FounderSocials, {
						socials: listing.socials,
						className: "mt-4"
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-start gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFavicon, {
							url: listing.url,
							title: listing.title,
							size: "lg"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display-site text-4xl tracking-tight sm:text-5xl",
							children: listing.title
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-muted",
						children: listing.tagline
					}),
					listing.team ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-subtle",
						children: listing.team
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm text-subtle",
						children: hostOf(listing.url)
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: () => void visit(),
						children: [cfg.visit, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-4" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						variant: "outline",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/$site/bid",
							params: { site },
							search: { url: listing.url },
							children: COPY.outbid
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-10 grid grid-cols-3 gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs uppercase tracking-wider text-subtle",
								children: "Bid"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "mt-1 tabular text-lg font-medium",
								children: formatUsd(listing.bidCents)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs uppercase tracking-wider text-subtle",
								children: "Visits"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "mt-1 tabular text-lg font-medium",
								children: listing.clicks.toLocaleString()
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs uppercase tracking-wider text-subtle",
								children: "Swaps"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "mt-1 tabular text-lg font-medium",
								children: listing.swapCount
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 text-xs text-subtle",
					children: ["Last bid ", relativeTime(listing.lastBidAt)]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium",
				children: "Activity"
			}), query.data?.activity ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivityFeed, {
				site,
				items: query.data.activity,
				compact: true
			}) : null] })
		]
	});
}
//#endregion
export { ListingPage as component };
