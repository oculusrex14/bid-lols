import { n as SITES, r as isSiteId, t as COPY } from "./sites-DQ1RC7LF.mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { a as Route$4 } from "./router-CGUqDkXs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rules-BYM2I5Fs.js
var import_jsx_runtime = require_jsx_runtime();
function RulesPage() {
	const { site } = Route$4.useParams();
	if (!isSiteId(site)) return null;
	const cfg = SITES[site];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-[0.2em] text-subtle",
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
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "A swap changes the destination URL of an existing listing. The listing keeps its bid, rank, and click count. The fee is a percentage of the current bid, then clamped." }),
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
									children: "Base rate"
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
											children: "10%"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											children: "$100 – $999"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "15%"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											children: "$1,000 – $4,999"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "20%"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											children: "$5,000+"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5 tabular",
											children: "25%"
										})]
									})
								]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-4 list-disc space-y-2 pl-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Absolute minimum $10. Absolute maximum $2,500." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Ranks 1–50: three swaps for the life of the listing. First swap at the base rate. Second swap at 35%. Third and final swap at 50%." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Rank 51 and below: unlimited swaps at the base rate." })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Clicks",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Every visit from the board is counted. We do not store IPs, names, or emails. The counter is the only trail." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Payments",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Checkout runs on Cashfree. In this preview the gateway is sandboxed — confirm payment to settle the order, fire the same path a webhook would, and unlock the manage link. Keep that link. It is how you re-bid and swap." })
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
