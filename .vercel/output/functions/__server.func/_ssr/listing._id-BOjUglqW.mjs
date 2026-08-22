import { n as SITES, r as isSiteId, t as COPY } from "./sites-DQ1RC7LF.mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { i as ArrowUpRight } from "../_libs/lucide-react.mjs";
import { h as getListing, r as Route$2, y as trackClick } from "./router-CGUqDkXs.mjs";
import { t as Button } from "./button-Dhe1uTrn.mjs";
import { i as relativeTime, n as hostOf, r as rankLabel, t as formatUsd } from "./format-DJnXAy3q.mjs";
import { t as ActivityFeed } from "./activity-feed-Dl9QR5yA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/listing._id-BOjUglqW.js
var import_jsx_runtime = require_jsx_runtime();
function ListingPage() {
	const { site, id } = Route$2.useParams();
	const query = useQuery({
		queryKey: ["listing", id],
		queryFn: () => getListing({ data: { id } }),
		refetchInterval: 5e3
	});
	if (!isSiteId(site)) return null;
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
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "tabular text-sm text-muted",
				children: ["Rank ", rankLabel(listing.rank)]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 font-display-site text-4xl tracking-tight sm:text-5xl",
				children: listing.title
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
			}),
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
							className: "text-[11px] uppercase tracking-wider text-subtle",
							children: "Bid"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 tabular text-xl font-medium",
							children: formatUsd(listing.bidCents)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-[11px] uppercase tracking-wider text-subtle",
							children: "Visits"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 tabular text-xl font-medium",
							children: listing.clicks.toLocaleString()
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-[11px] uppercase tracking-wider text-subtle",
							children: "Last bid"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 text-xl font-medium",
							children: relativeTime(listing.lastBidAt)
						})]
					})
				]
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-sm font-medium",
			children: "On this listing"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivityFeed, {
			site,
			items: query.data?.activity ?? []
		})] })]
	});
}
//#endregion
export { ListingPage as component };
