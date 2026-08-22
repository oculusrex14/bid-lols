import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/spec-DQgpcn9x.js
var import_jsx_runtime = require_jsx_runtime();
function SpecPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "mx-auto flex max-w-3xl items-center justify-between px-5 py-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				className: "text-xs font-medium uppercase tracking-[0.22em] text-muted",
				children: "Bid.lol"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-4 text-sm text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/$site",
					params: { site: "founders" },
					className: "hover:text-fg",
					children: "foundersbid"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/$site",
					params: { site: "bidception" },
					className: "hover:text-fg",
					children: "bidception"
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "mx-auto max-w-3xl px-5 pb-24 pt-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-[0.2em] text-subtle",
					children: "Product requirements"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-3 font-display text-4xl tracking-tight sm:text-6xl",
					children: "Two boards. One mechanic. Built to ship in a weekend."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 text-lg text-muted",
					children: "foundersbid.lol and bidception.lol share ranking, payments, swap math, and the manage-link model. They do not share identity, copy, or who belongs on the board."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "1. Product" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H2, { children: "foundersbid.lol" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Founders and creators bid to promote personal portfolios, about pages, and founding-team pages. The point is proof of who is behind the work." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quote, { children: "Pay to prove the founding team. Build trust. Rank higher." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-4 list-disc space-y-1 pl-5 text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Allowed: team pages, about pages, studio sites, personal founder URLs." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Row content: title, one-line proof, founding names, bid, visits." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Primary CTA: “Bid the team”." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H2, { children: "bidception.lol" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "A meta leaderboard. Outbid clones, .lol domains, and any pay-to-rank board compete for most popular bid platform." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quote, { children: "The leaderboard of leaderboards. Outbid the bids." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-4 list-disc space-y-1 pl-5 text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Allowed: bid sites, clones, .lol boards, leaderboard products." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Row content: board name, claim, what it is, bid, visits." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Primary CTA: “Outbid the bids”." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "2. Shared ranking rules" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "list-disc space-y-2 pl-5 text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Pure pay-to-rank. Highest total bid = higher rank." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Minimum $5. Whole dollars only." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Re-bid on the same URL only pays the difference. New total must strictly beat the current total. Ties break to whoever reached the amount first." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "No accounts. Ownership is a secret manage URL issued at payment." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Clicks from the board increment a public counter. No IPs, emails, or names stored as personal data." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Real-time enough: the board and live tape refetch every few seconds." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "3. Tiered swap links" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "A swap changes the destination URL. Bid, rank, and clicks stay. Fee is a percentage of the current bid, then clamped to $10–$2,500." }),
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
										className: "px-4 py-2.5",
										children: "10%"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t border-border",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-2.5",
										children: "$100 – $999"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-2.5",
										children: "15%"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t border-border",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-2.5",
										children: "$1,000 – $4,999"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-2.5",
										children: "20%"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "border-t border-border",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-2.5",
										children: "$5,000+"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "px-4 py-2.5",
										children: "25%"
									})]
								})
							]
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "mt-4 list-disc space-y-2 pl-5 text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Top 50 ranks: maximum 3 swaps lifetime. 1st at base rate, 2nd at 35%, 3rd at 50%." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Rank 51+: unlimited swaps at the base rate." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Eligibility is re-checked at payment time, because rank can move while checkout is open." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "4. Page structure" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "list-decimal space-y-2 pl-5 text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Portal /"
						}), " — split landing. Live top 3 and pool for each board."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Board /founders and /bidception"
						}), " — hero, stats, ranked rows, live tape, swap-rate card, your listings."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Rules"
						}), " — public rulebook, same math as the engine."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Bid"
						}), " — URL, title, tagline, team/note, whole-dollar amount. Live quote of charge (full vs difference)."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Checkout"
						}), " — Cashfree sandbox. Confirm payment settles the order."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Manage /manage/$token"
						}), " — rank, bid, visits, re-bid, swap, copy manage link."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Listing"
						}), " — public row detail, visit (tracked), outbid."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "Activity"
						}), " — full live tape."] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-fg",
							children: "This spec"
						}), " — the contract."] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "5. UI / UX" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "list-disc space-y-2 pl-5 text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Mobile-first. 44px taps. Sticky Bid CTA on small screens. No horizontal overflow." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Foundersbid: warm ink #0c0b0a, bone accent, Newsreader display, Outfit body. Editorial, studio, trust." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Bidception: cool ink #09090b, silver accent, Syne display, Outfit body. Nested-frame, recursive." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "One accent per theme. Hairline borders. Concentric radii. No purple, gold, emoji, or gradient blobs." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Tabular numbers on bids, ranks, visits. Rank 01 is the only large gesture on the board." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "6. Database" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "mt-3 overflow-x-auto rounded-xl bg-surface p-4 text-xs leading-relaxed text-muted shadow-[var(--shadow-border)]",
					children: `listings(id, site, url, url_key, title, tagline, team,
         bid_cents, rank, clicks, swap_count, manage_token,
         created_at, last_bid_at)
orders(id, site, kind, amount_cents, status, listing_id,
       manage_token, payload jsonb, created_at, paid_at)
activity(id, site, listing_id, kind, amount_cents, rank_to,
         title, created_at)`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-muted",
					children: "Unique (site, url_key). Rank recomputed after every paid bid as row_number ordered by bid desc, last_bid_at asc. manage_token never leaves paid-order and manage endpoints."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "7. Payment + webhook" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "list-decimal space-y-2 pl-5 text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Bid or swap form creates a pending order. Charge is computed server-side." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Checkout shows Cashfree. Preview: sandbox confirm. Production: Cashfree order + payment_session_id + JS checkout." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Webhook POST /api/webhooks/cashfree on order.paid. Verify signature in production. Call the same settle path as the sandbox button." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Settle: insert or update listing, recast ranks, write activity, mark order paid, return manage token." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Idempotent: a second paid event for the same order returns the existing listing." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "8. Button, empty, and rules copy" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "list-disc space-y-2 pl-5 text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Bid now / Bid the team / Outbid the bids / Pay the difference / Pay with Cashfree / Swap URL / Copy manage link / Visit page / Open board" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Empty board (founders): “No founding teams on the board yet. Five dollars puts you first.”" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Empty board (bidception): “No bid sites listed. Five dollars crowns the first meta leader.”" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Empty tape: “Quiet. The next bid … lands here.” / “No movement. A clone will blink first.”" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Checkout: “Sandbox checkout. No real charge in this preview.”" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Rules live on each board at /founders/rules and /bidception/rules." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "9. Design language" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Premium, viral, quiet. A letterhead, not a casino. Two sibling identities, one grid. Large display type, small uppercase kickers, bone/silver as the only loud material. The product should feel like it was typeset, then wired to a card network." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-14 flex flex-wrap gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/$site",
						params: { site: "founders" },
						className: "inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg",
						children: "Open foundersbid"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/$site",
						params: { site: "bidception" },
						className: "inline-flex h-11 items-center rounded-md px-4 text-sm shadow-[var(--shadow-border)]",
						children: "Open bidception"
					})]
				})
			]
		})]
	});
}
function H({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
		className: "mt-14 font-display text-2xl tracking-tight sm:text-3xl",
		children
	});
}
function H2({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
		className: "mt-8 text-lg font-medium",
		children
	});
}
function Quote({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("blockquote", {
		className: "mt-4 border-l border-border pl-4 font-display text-xl italic text-fg",
		children
	});
}
//#endregion
export { SpecPage as component };
