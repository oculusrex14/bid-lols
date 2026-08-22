import { o as __toESM } from "./_runtime.mjs";
import { a as isSiteId, r as SITES, t as COPY } from "./_ssr/sites-aEGgv7RZ.mjs";
import { n as require_react } from "./_libs/@radix-ui/react-compose-refs+[...].mjs";
import { b as useNavigate, y as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime, t as useQuery } from "./_libs/react+tanstack__react-query.mjs";
import { a as Plus, c as Minus, o as MousePointer2, p as ArrowUpRight } from "./_libs/lucide-react.mjs";
import { T as trackClick, b as getBoard, f as Route$12 } from "./_ssr/router-CW0kdSlg.mjs";
import { t as cn } from "./_ssr/cn-Ccejyh36.mjs";
import { t as Button } from "./_ssr/button-Dhe1uTrn.mjs";
import { r as formatCount } from "./_ssr/hype-0lUaUoAU.mjs";
import { i as takeFirstDollars } from "./_ssr/socials-CEYLul7Z.mjs";
import { n as hostOf, r as rankLabel, t as formatUsd } from "./_ssr/format-DJnXAy3q.mjs";
import { t as ActivityFeed } from "./_ssr/activity-feed-3AlC5mV5.mjs";
import { t as TrackSiteView } from "./_ssr/track-site-view-46UtYOxa.mjs";
import { n as Input } from "./_ssr/input-BQrWNgVJ.mjs";
import { t as RankHint } from "./_ssr/rank-hint-CteFVuOs.mjs";
import { t as ownedFor } from "./_ssr/owned-8IJwQGvR.mjs";
import { t as SiteFavicon } from "./_ssr/site-favicon-BB3koanO.mjs";
import { n as FounderSocials, t as CultureValues } from "./_ssr/culture-values-pr26i8Qt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_site-DPpj7PdT.js
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
	const founders = site === "founders";
	const culture = site === "culture";
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
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFavicon, {
					url: listing.url,
					title: listing.title,
					size: featured ? "lg" : "md"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [
						founders && listing.team ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/$site/listing/$id",
							params: {
								site,
								id: listing.id
							},
							className: cn("block font-display text-fg hover:underline", featured ? "text-2xl italic sm:text-3xl" : "text-lg italic"),
							children: listing.team
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 truncate text-sm text-muted",
							children: [listing.title, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-subtle",
								children: [" · ", hostOf(listing.url)]
							})]
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
							className: cn("mt-1 line-clamp-2 text-sm text-muted", founders && "font-display italic"),
							children: listing.tagline
						}) : null,
						founders ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FounderSocials, {
							socials: listing.socials,
							className: "mt-2"
						}) : culture ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CultureValues, {
							values: listing.values,
							className: "mt-2"
						}), listing.team ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 line-clamp-2 font-display text-sm italic text-muted",
							children: [
								"“",
								listing.team,
								"”"
							]
						}) : null] }) : listing.team ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
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
						className: "text-xs uppercase tracking-wider text-subtle",
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
			label: "Visits today",
			value: formatCount(stats.visitsToday)
		},
		{
			label: "Total views",
			value: formatCount(stats.totalViews)
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
		className: "grid grid-cols-2 gap-2 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:grid-cols-4 sm:p-4",
		children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 px-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
				className: "text-xs uppercase tracking-wider text-subtle",
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
function ClaimBox({ site, leaderBidCents }) {
	const cfg = SITES[site];
	const navigate = useNavigate();
	const [url, setUrl] = (0, import_react.useState)("");
	const take = takeFirstDollars(leaderBidCents);
	const dirty = (0, import_react.useRef)(false);
	const [amount, setAmount] = (0, import_react.useState)(take);
	const [draft, setDraft] = (0, import_react.useState)(null);
	const [focused, setFocused] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!dirty.current) setAmount(take);
	}, [take]);
	const shown = draft ?? String(amount);
	const parsed = /^\d+$/.test(shown) ? Number(shown) : null;
	const leaderDollars = Math.round((leaderBidCents ?? 0) / 100);
	const takesFirst = parsed != null && parsed > leaderDollars;
	const headline = takesFirst || leaderDollars < 1 ? cfg.claimHeadline : "Bid your rank";
	const deck = takesFirst || leaderDollars < 1 ? cfg.claimDeck : "Rank follows the bid. Highest total stands first.";
	const display = focused || draft != null ? shown : new Intl.NumberFormat("en-US").format(amount);
	function mark(next) {
		dirty.current = true;
		setAmount(Math.max(5, Math.floor(next)));
		setDraft(null);
	}
	function bump(delta) {
		mark((parsed ?? amount) + delta);
	}
	function submit(e) {
		e.preventDefault();
		const next = Math.max(5, parsed != null && parsed >= 5 ? parsed : amount);
		mark(next);
		navigate({
			to: "/$site/bid",
			params: { site },
			search: {
				url: url.trim() || void 0,
				amount: String(next)
			}
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		"data-claim-box": true,
		className: "rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,19rem)] sm:items-end",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-kicker text-subtle",
					children: takesFirst && amount === take && leaderBidCents > 0 ? "Live #1 price" : "Your bid"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 font-display-site text-3xl tracking-tight sm:text-4xl",
					children: headline
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-md text-sm text-muted",
					children: deck
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex items-center gap-2 sm:gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepButton, {
							label: "Decrease bid",
							disabled: (parsed ?? amount) <= 5,
							onClick: () => bump(-1),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex min-w-0 items-baseline",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "sr-only",
									children: "Bid amount in whole dollars"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									className: "tabular text-3xl font-medium sm:text-4xl",
									children: "$"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: display,
									onFocus: () => {
										setFocused(true);
										setDraft(String(amount));
									},
									onBlur: () => {
										setFocused(false);
										const n = parsed;
										mark(n == null ? amount : n);
									},
									onChange: (e) => {
										dirty.current = true;
										const raw = e.target.value.replace(/[^\d]/g, "");
										setDraft(raw);
										if (/^\d+$/.test(raw)) setAmount(Number(raw));
									},
									inputMode: "numeric",
									className: "tabular w-28 bg-transparent text-3xl font-medium text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-36 sm:text-4xl"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepButton, {
							label: "Increase bid",
							onClick: () => bump(1),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankHint, {
					amountDollars: parsed,
					leaderBidCents,
					className: "mt-2"
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "flex flex-col gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-medium text-fg",
							children: cfg.urlLabel
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: url,
							onChange: (e) => setUrl(e.target.value),
							placeholder: cfg.urlHint,
							inputMode: "url",
							autoComplete: "url"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "h-12 w-full text-base",
						children: COPY.bidNow
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-subtle",
						children: "$5 minimum · Whole dollars · Re-bids only pay the difference"
					})
				]
			})]
		})
	});
}
function StepButton({ label, disabled, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-label": label,
		disabled,
		onClick,
		className: cn("inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg shadow-[var(--shadow-border)]", "transition-[opacity,transform,box-shadow] duration-150 ease-out", "hover:shadow-[var(--shadow-border-hover)] active:not-disabled:scale-[0.96]", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", "disabled:opacity-40"),
		children
	});
}
/**
* Cross-sell (point 4): leftover budget on foundersbid / culturebid goes to bidception.
* Hidden on bidception itself — that board is the destination.
*/
function LeftoverBudgetCard({ from }) {
	if (from === "bidception") return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "mt-6 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs uppercase tracking-kicker text-subtle",
			children: "Leftover budget"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-2 text-sm text-muted",
			children: [
				"Have leftover budget? Discover other platforms on",
				" ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/$site",
					params: { site: "bidception" },
					preload: "intent",
					className: "text-fg underline-offset-4 hover:underline",
					children: "bidception.lol"
				}),
				"."
			]
		})]
	});
}
/** Bidception-only: this is complementary marketing tools, not a clone war. */
function DiscoveryNote() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-4 max-w-xl text-sm text-muted",
		children: "Complementary marketing tools — directories, newsletter boards, pay-to-rank sites, community pins. Spend the rest of the budget where the same strategy still works."
	});
}
function BoardHome() {
	const { site: siteParam } = Route$12.useParams();
	const site = isSiteId(siteParam) ? siteParam : "founders";
	const cfg = SITES[site];
	const initial = Route$12.useLoaderData();
	const board = useQuery({
		queryKey: ["board", site],
		queryFn: () => getBoard({ data: { site } }),
		placeholderData: initial,
		refetchInterval: 4e3
	}).data ?? initial;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrackSiteView, { site }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				site === "founders" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FoundersMasthead, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rise-in text-xs uppercase tracking-kicker text-subtle",
						children: cfg.kicker
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "rise-in rise-in-2 mt-3 font-display-site text-4xl tracking-tight sm:text-6xl",
						children: [cfg.wordmark, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-subtle",
							children: ".lol"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rise-in rise-in-3 mt-4 max-w-xl text-muted",
						children: cfg.tagline
					}),
					site === "bidception" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DiscoveryNote, {}) : null
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8",
					children: board ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatsBar, { stats: board.stats }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatsSkeleton, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: board ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClaimBox, {
						site,
						leaderBidCents: board.listings[0]?.bidCents ?? 0
					}) : null
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LeftoverBudgetCard, { from: site }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: board ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Leaderboard, {
						site,
						listings: board.listings
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BoardSkeleton, {})
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
				className: "lg:pt-28",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "lg:sticky lg:top-36",
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
			})
		]
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
