import { o as __toESM } from "./_runtime.mjs";
import { n as SITES, r as isSiteId, t as COPY } from "./_ssr/sites-DQ1RC7LF.mjs";
import { n as require_react } from "./_libs/@radix-ui/react-compose-refs+[...].mjs";
import { y as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime, t as useQuery } from "./_libs/react+tanstack__react-query.mjs";
import { i as ArrowUpRight, n as MousePointer2 } from "./_libs/lucide-react.mjs";
import { c as Route$7, m as getBoard, y as trackClick } from "./_ssr/router-CGUqDkXs.mjs";
import { t as cn } from "./_ssr/cn-Ccejyh36.mjs";
import { t as Button } from "./_ssr/button-Dhe1uTrn.mjs";
import { n as hostOf, r as rankLabel, t as formatUsd } from "./_ssr/format-DJnXAy3q.mjs";
import { t as ActivityFeed } from "./_ssr/activity-feed-Dl9QR5yA.mjs";
import { t as ownedFor } from "./_ssr/owned-8IJwQGvR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_site-DfmfQZYX.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Leaderboard({ site, listings }) {
	const cfg = SITES[site];
	if (listings.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-surface px-6 py-16 text-center shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display-site text-2xl",
			children: cfg.emptyBoard
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			asChild: true,
			className: "mt-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/$site/bid",
				params: { site },
				children: cfg.cta
			})
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "flex flex-col gap-2",
		children: listings.map((row, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeaderRow, {
			site,
			listing: row,
			featured: i === 0
		}, row.id))
	});
}
function LeaderRow({ site, listing, featured }) {
	const cfg = SITES[site];
	async function visit() {
		try {
			const res = await trackClick({ data: { id: listing.id } });
			window.open(res.url, "_blank", "noopener,noreferrer");
		} catch {
			window.open(listing.url, "_blank", "noopener,noreferrer");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
		className: cn("rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4", featured && "p-4 sm:p-5"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start gap-3 sm:gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("tabular w-10 shrink-0 pt-0.5 font-medium text-muted", featured && "font-display-site text-2xl text-fg sm:text-3xl"),
					children: rankLabel(listing.rank)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-baseline gap-x-2 gap-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/$site/listing/$id",
								params: {
									site,
									id: listing.id
								},
								className: cn("truncate font-medium hover:underline", featured ? "font-display-site text-2xl sm:text-3xl" : "text-base"),
								children: listing.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate text-xs text-subtle",
								children: hostOf(listing.url)
							})]
						}),
						listing.tagline ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 line-clamp-2 text-sm text-muted",
							children: listing.tagline
						}) : null,
						listing.team ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 line-clamp-1 text-xs text-subtle",
							children: listing.team
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => void visit(),
									className: "inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm text-muted shadow-[var(--shadow-border)] hover:text-fg",
									children: [cfg.visit, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-3.5" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									variant: "outline",
									className: "h-11",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/$site/bid",
										params: { site },
										search: { url: listing.url },
										children: COPY.outbid
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "ml-auto inline-flex items-center gap-1 text-xs text-subtle",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MousePointer2, { className: "size-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tabular",
										children: listing.clicks.toLocaleString()
									})]
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "shrink-0 text-right",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("tabular font-medium", featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"),
						children: formatUsd(listing.bidCents)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[11px] uppercase tracking-wider text-subtle",
						children: "bid"
					})]
				})
			]
		})
	});
}
function StatsBar({ stats }) {
	const items = [
		{
			label: "On the board",
			value: String(stats.count)
		},
		{
			label: "Bid pool",
			value: formatUsd(stats.poolCents)
		},
		{
			label: "Tracked visits",
			value: stats.clicks.toLocaleString()
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
		className: "grid grid-cols-3 gap-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 px-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
				className: "text-[11px] uppercase tracking-wider text-subtle",
				children: item.label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
				className: "mt-1 truncate tabular text-base font-medium sm:text-lg",
				children: item.value
			})]
		}, item.label))
	});
}
function YourListings({ site }) {
	const [rows, setRows] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		setRows(ownedFor(site));
	}, [site]);
	if (rows.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-8 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-sm font-medium",
			children: "Your listings in this browser"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-3 space-y-2",
			children: rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/$site/manage/$token",
				params: {
					site,
					token: row.token
				},
				className: "text-sm text-muted hover:text-fg",
				children: row.title
			}) }, row.listingId))
		})]
	});
}
function BoardHome() {
	const { site: siteParam } = Route$7.useParams();
	const site = isSiteId(siteParam) ? siteParam : "founders";
	const cfg = SITES[site];
	const initial = Route$7.useLoaderData();
	const board = useQuery({
		queryKey: ["board", site],
		queryFn: () => getBoard({ data: { site } }),
		placeholderData: initial,
		refetchInterval: 4e3
	}).data ?? initial;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rise-in text-xs uppercase tracking-[0.2em] text-subtle",
				children: cfg.kicker
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "rise-in rise-in-2 mt-3 font-display-site text-4xl tracking-tight sm:text-6xl",
				children: cfg.wordmark
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rise-in rise-in-3 mt-4 max-w-xl text-muted",
				children: cfg.tagline
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8",
				children: board ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatsBar, { stats: board.stats }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatsSkeleton, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: board ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Leaderboard, {
					site,
					listings: board.listings
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BoardSkeleton, {})
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
			className: "lg:pt-28",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "lg:sticky lg:top-20",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm font-medium",
							children: "Live feed"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/$site/activity",
							params: { site },
							className: "text-xs text-muted hover:text-fg",
							children: "Full feed"
						})]
					}),
					board ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivityFeed, {
						site,
						items: board.activity.slice(0, 8),
						compact: true
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm text-subtle",
						children: "Loading the tape…"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YourListings, { site }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwapCard, {})
				]
			})
		})]
	});
}
function SwapCard() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-8 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-medium",
				children: "Swap link rates"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-3 space-y-1.5 text-xs text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Under $100" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular",
							children: "10%"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "$100 – $999" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular",
							children: "15%"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "$1k – $4,999" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular",
							children: "20%"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "$5k+" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular",
							children: "25%"
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-xs text-subtle",
				children: "Floor $10, cap $2,500. Top 50: three swaps lifetime (2nd 35%, 3rd 50%). Rank 51+: unlimited at base."
			})
		]
	});
}
function StatsSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-24 rounded-xl bg-surface shadow-[var(--shadow-border)]" });
}
function BoardSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-col gap-2",
		children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-24 rounded-xl bg-surface shadow-[var(--shadow-border)]" }, i))
	});
}
//#endregion
export { BoardHome as component };
