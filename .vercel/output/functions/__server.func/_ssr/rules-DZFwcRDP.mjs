import { o as __toESM } from "../_runtime.mjs";
import { a as quoteSwapFee, i as isSiteId, r as SITES, t as COPY } from "./sites-BLTVPnCd.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { o as Route$6 } from "./router-DcNSb0gZ.mjs";
import { t as formatUsd } from "./format-DJnXAy3q.mjs";
import { n as Input, t as Field } from "./input-BQrWNgVJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rules-DZFwcRDP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function SwapPreview() {
	const [dollars, setDollars] = (0, import_react.useState)("1000");
	const [rank, setRank] = (0, import_react.useState)("12");
	const [swapNumber, setSwapNumber] = (0, import_react.useState)("1");
	const bidCents = Math.round(Math.max(0, Number(dollars) || 0) * 100);
	const r = Math.max(1, Number(rank) || 1);
	const n = Math.min(8, Math.max(1, Number(swapNumber) || 1));
	const quote = (0, import_react.useMemo)(() => quoteSwapFee({
		bidCents,
		rank: r,
		swapCount: n - 1
	}), [
		bidCents,
		r,
		n
	]);
	const schedule = (0, import_react.useMemo)(() => [
		1,
		2,
		3
	].map((swapN) => ({
		swapN,
		quote: quoteSwapFee({
			bidCents,
			rank: r,
			swapCount: swapN - 1
		})
	})), [bidCents, r]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-6 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-medium",
				children: "Fee preview"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-subtle",
				children: "Each swap is the full rate of that number, of the current bid. Never the difference between rates."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid grid-cols-3 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Bid $",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							inputMode: "numeric",
							value: dollars,
							onChange: (e) => setDollars(e.target.value.replace(/[^\d]/g, ""))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Rank",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							inputMode: "numeric",
							value: rank,
							onChange: (e) => setRank(e.target.value.replace(/[^\d]/g, ""))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Swap #",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							inputMode: "numeric",
							value: swapNumber,
							onChange: (e) => setSwapNumber(e.target.value.replace(/[^\d]/g, ""))
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
				className: "mt-4 overflow-hidden rounded-lg bg-raised text-sm shadow-[var(--shadow-border)]",
				children: schedule.map((row) => {
					const active = row.swapN === n;
					const q = row.quote;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: active ? "flex items-baseline justify-between gap-3 px-3 py-2.5 text-fg" : "flex items-baseline justify-between gap-3 px-3 py-2.5 text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							row.swapN === 1 ? "1st" : row.swapN === 2 ? "2nd" : "3rd",
							" swap",
							q.allowed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-subtle",
								children: [
									" ",
									"· full ",
									Math.round(q.rate * 100),
									"%"
								]
							}) : null
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "tabular",
							children: [q.allowed ? formatUsd(q.feeCents) : "spent", active ? " ← this" : ""]
						})]
					}, row.swapN);
				})
			}),
			quote.allowed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 text-sm text-muted",
				children: [
					"This swap charges",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "tabular text-fg",
						children: formatUsd(quote.feeCents)
					}),
					" — ",
					"full ",
					Math.round(quote.rate * 100),
					"% of ",
					formatUsd(bidCents),
					", not a remainder. ",
					quote.note
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-sm text-danger",
				children: quote.reason
			})
		]
	});
}
function RulesPage() {
	const { site } = Route$6.useParams();
	if (!isSiteId(site)) return null;
	const cfg = SITES[site];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-kicker text-subtle",
				children: "Rulebook"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "mt-3 font-display-site text-4xl tracking-tight sm:text-5xl",
				children: [
					"How ",
					cfg.wordmark,
					" ranks"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-muted",
				children: cfg.tagline
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "The board",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [cfg.description, " Rank is a single number: the highest total bid sits at 01. There is no algorithm, no editorial slot, no free listing."] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Bidding",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "list-disc space-y-2 pl-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: COPY.minBid }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "If the URL is new, you pay the full bid. If the URL is already on this board, you only pay the difference to the new total." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "A re-bid must strictly beat the current total. Ties go to whoever reached that amount first." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Bids are public. The manage link is the only secret." })
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "What you can list",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: site === "founders" ? "Personal portfolios, about pages, team pages, studio sites — anything that shows who founded the thing. The founding names sit on the row." : "Outbid clones, .lol domains, bid platforms, leaderboards that take money to move. If it is a board that sells rank, it belongs here." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Tiered swap links",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "A swap changes the destination URL of an existing listing. The listing keeps its bid, rank, and click count. Each swap is charged at the full rate for that swap number — never the difference between rates. A second swap is 35% of the current bid, not 35% minus the base." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "text-left text-xs uppercase tracking-wider text-subtle",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3",
									children: "Current bid"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-4 py-3",
									children: "Base rate (1st swap)"
								})] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
								className: "text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											children: "Under $100"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "10% of the bid"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											children: "$100 – $999"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "15% of the bid"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											children: "$1,000 – $4,999"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "20% of the bid"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											children: "$5,000+"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "25% of the bid"
										})]
									})
								]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-4 list-disc space-y-2 pl-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Then clamp the fee: absolute minimum $10, absolute maximum $2,500." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Ranks 1–50: three swaps for the life of the listing. 1st at the base rate. 2nd at a full 35% of the current bid. 3rd at a full 50% of the current bid." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Rank 51 and below: unlimited swaps, always the base rate." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "text-left text-xs uppercase tracking-wider text-subtle",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "Example"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "1st (full base)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "2nd (full 35%)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "3rd (full 50%)"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
								className: "text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t border-border",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											children: "$1,000, Top 50"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "20% = $200"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "35% = $350"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "50% = $500"
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t border-border",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											children: "$80, Top 50"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "10% = $8 → $10"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "35% = $28"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "50% = $40"
										})
									]
								})]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwapPreview, {})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Clicks",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Every visit from the board is counted. We do not store IPs, names, or emails. The counter is the only trail." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Payments",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Every bid and swap settles on Cashfree Payments. The checkout panel is their sandbox: order id, payment_session_id, UPI / card / net banking / wallet. Confirming payment marks the order paid — the same settle path as webhook POST /api/webhooks/cashfree on PAYMENT_SUCCESS (signature verified when a Cashfree webhook secret is set). Keep the manage link. It is how you re-bid and swap." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "What we will not do",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "list-disc space-y-2 pl-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "No accounts. The manage URL is the key." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "No fractional dollars on bids." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "No refunds after a bid or swap is marked paid." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "No burying a higher bid for any reason." })
					]
				})
			})
		]
	});
}
function Section({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "font-display-site text-2xl tracking-tight",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 space-y-3 text-muted",
			children
		})]
	});
}
//#endregion
export { RulesPage as component };
