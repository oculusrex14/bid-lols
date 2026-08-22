import { i as SITE_IDS, n as PORTAL, r as SITES } from "./sites-aEGgv7RZ.mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as SiteFooter, t as ModeToggle } from "./site-footer-QxDCDe54.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/spec-CfcPkHNj.js
var import_jsx_runtime = require_jsx_runtime();
function SpecPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mx-auto max-w-3xl px-5 py-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "text-xs font-medium uppercase tracking-kicker text-fg",
						children: PORTAL.domain
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap items-center gap-3",
						children: SITE_IDS.map((id) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/$site",
							params: { site: id },
							preload: "intent",
							className: "text-sm text-muted hover:text-fg",
							children: SITES[id].wordmark
						}, id))
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeToggle, {})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "mx-auto max-w-3xl px-5 pb-24 pt-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs uppercase tracking-kicker text-subtle",
						children: "Product requirements"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-3 font-display text-4xl tracking-tight sm:text-6xl",
						children: "Three boards. One mechanic. Built to ship in a weekend."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 text-lg text-muted",
						children: "bidthrone.lol is the front door. foundersbid.lol, culturebid.lol, and bidception.lol share ranking, payments, swap math, and the manage-link model. They do not share identity, copy, or who belongs on the board. This page is the contract. The running product is the proof."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "1. Product" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H2, { children: "foundersbid.lol" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Founders and creators bid to promote personal portfolios, about pages, and founding-team pages. The point is proof of who is behind the work." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quote, { children: "Pay to prove the founding team. Build trust. Rank higher." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-4 list-disc space-y-1 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Allowed: team pages, about pages, studio sites, personal founder URLs." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Row content: founding team names first (italic headline), company title and URL second, up to five founder social icons, bid, visits. Favicon beside every row." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Primary CTA: “Bid the team”." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Tone: editorial, studio, letterhead. Warm ink and bone." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H2, { children: "culturebid.lol" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Companies bid to showcase culture, team, and why join us so the best talent finds them first. Careers pages, culture pages, values." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quote, { children: "Rank your culture. Attract the people who matter." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-4 list-disc space-y-1 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Allowed: careers / team / culture pages." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Row content: company name, culture statement, up to five values, optional quote, bid, visits." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Primary CTA: “Bid the culture”." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Tone: professional letterhead. Cool stone, Outfit wordmark." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H2, { children: "bidception.lol" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "A discovery board for other marketing platforms. Have leftover budget after foundersbid or culturebid? Find the next directory, newsletter board, or visibility tool and run the same strategy there." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quote, { children: "Find where else to spend your marketing budget." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-4 list-disc space-y-2 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Allowed: marketing platforms, directories, pay-to-rank tools, newsletter sponsorships, community boards." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Row content: platform name, pitch, what it is, bid, visits. Favicon beside every row." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Primary CTA: “List a platform”." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Tone: nested frame, cool ink and silver." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "2c. Conversion, logos, founding team" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "list-disc space-y-2 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Every board has a conversion box above the ranking: “Claim #1” on foundersbid and culturebid, “Take the top slot” on bidception. Live price to take #1 with +/− to adjust (floor $5). If the bid is at or below the leader, a warning: rank follows the bid — you will sit below #1. URL field, Bid now, helper “$5 minimum · Whole dollars · Re-bids only pay the difference”." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Every listing shows the submitted URL’s favicon (lazy, same-origin proxy). Missing favicon falls back to a letter monogram." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Foundersbid is people-first. The founding team is the headline on the board, the detail page, and the manage page. Bid form fields: company name, page URL, one-line proof, founding team names, up to five founder socials, bid amount." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "On foundersbid and culturebid, a leftover-budget card points to bidception.lol. Bidception is the discovery board for other marketing platforms." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "list-disc space-y-2 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Pure pay-to-rank. Highest total bid = higher rank. Rank 01 is first." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Minimum $5. Whole dollars only. No cents on bids." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Re-bid on the same URL only pays the difference. New total must strictly beat the current total. Ties break to whoever reached the amount first (`last_bid_at` ascending)." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "No accounts. Ownership is a secret manage URL issued at payment. Keep it; losing it means the listing cannot be managed from this browser unless the link is recovered." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Clicks from the board increment a public counter. No IPs, emails, or names stored as personal data." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Real-time enough: the board and live tape refetch every 3–5 seconds." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "No refunds after an order is marked paid. No editorial slots. No burying a higher bid." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "2b. Temporary hype (views and visits)" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Displayed site totals use a decaying multiplier. Rank is never affected. Real counts stay in the database. Labels are “visits today” and “total views” — never live viewers or people online." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-4 list-disc space-y-2 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Day 1: 6×. Linear drop every 24 hours. Exactly 1× after 21 days." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "If real visits in a calendar day reach 8,000, the multiplier locks at 1× forever." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "A view is a page load of the portal, a board, a listing, or the tape. A visit is an outbound click from a listing." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Per-listing click counts on a row stay real. Only the site-level totals are multiplied." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "3. Tiered swap links" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "A swap changes the destination URL. Bid, rank, and clicks stay. Fee is a percentage of the current bid, rounded to whole dollars, then clamped to $10–$2,500." }),
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
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Eligibility is re-checked at payment time, because rank can move while checkout is open." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "A swap cannot steal a URL already held by another listing on the same board." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H2, { children: "Worked examples" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "text-left text-xs uppercase tracking-wider text-subtle",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "Bid"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "Rank"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "Swap"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "Math"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "Fee"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
								className: "text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "$50"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "12"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "1st"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "10% = $5 → floor"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "$10"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "$200"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "8"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "2nd"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "35% of $200"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "$70"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "$12,400"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "1"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "3rd"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "50% = $6,200 → cap"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "$2,500"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "$50"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "61"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "any"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "10% → floor, unlimited"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "$10"
											})
										]
									})
								]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "4. Page structure" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
						className: "list-decimal space-y-3 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Portal /"
							}), " — bidthrone.lol. Three equal columns: foundersbid (“Trust the founding team”), culturebid (“Rank your culture. Attract the people who matter.”), bidception (“Discover other marketing platforms”). Live top 3, pool, visits today, total views. No full board and no activity on the portal. Header: bidthrone.lol + Full spec."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Board /founders, /culture, /bidception"
							}), " — sticky header (wordmark, Board / Rules / Live, Bid now). Hero, three-stat bar, conversion box, leftover-budget card (founders + culture), ranked rows, sticky live tape, swap-rate card, your listings (this browser). Mobile: sticky bottom CTA."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Rules"
							}), " — public rulebook, same math as the engine, plus a live fee preview."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Bid"
							}), " — URL, title, tagline, team/quote/note, culture values or founder socials, whole-dollar amount. Live quote of charge (full vs difference). Prefills title/team/values when the URL already exists."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Checkout /checkout/$orderId"
							}), " — Cashfree sandbox. Confirm payment settles the order. Already-paid orders do not charge twice."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Manage /manage/$token"
							}), " — rank, bid, visits, re-bid (difference only), swap with live quote, copy manage link. Token is the key."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Listing /listing/$id"
							}), " — public row detail, tracked visit, outbid, tape for that listing."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "Activity"
							}), " — full live tape of bids, re-bids, swaps."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
								className: "text-fg",
								children: "This spec"
							}), " — the contract."] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "5. UI / UX" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H2, { children: "Tokens" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "w-full text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "text-left text-xs uppercase tracking-wider text-subtle",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "Token"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "foundersbid"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "culturebid"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
										className: "px-4 py-3",
										children: "bidception"
									})
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", {
								className: "text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "bg"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "#f4efe4"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "#f1efe8"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "#f3f3f5"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "surface"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "#ebe4d6"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "#e8e6de"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "#eaeaee"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "fg"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "#1c1712 walnut"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "#1a1c19 stone"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "#18181b"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "display"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "Newsreader"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "Outfit"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "px-4 py-2.5",
												children: "Syne"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "border-t border-border",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											children: "body"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "px-4 py-2.5",
											colSpan: 3,
											children: "Outfit, all three"
										})]
									})
								]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-4 list-disc space-y-2 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Mobile-first. 390px single column. Tap targets 44px (`h-11`). Sticky Bid CTA on small screens. No horizontal overflow." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Desktop board: `max-w-6xl`, main + 300px sticky aside. Rules `max-w-2xl`. Checkout `max-w-lg`." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Header 56px, sticky, `bg/90` blur. Hairline borders. Cards `rounded-xl`, controls `rounded-md` (concentric)." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "One accent per theme. No purple, gold, emoji, or gradient blobs. Tabular numbers on bids, ranks, visits." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Rank 01 is the only large gesture on the board (display size). Motion: 150–400ms fade+rise, reduced-motion off." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Spacing scale 4 / 8 / 12 / 16 / 24 / 32 / 48. Type: kickers xs uppercase, body sm/base, display 4xl–7xl." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "6. Database" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
						className: "mt-3 overflow-x-auto rounded-xl bg-surface p-4 text-xs leading-relaxed text-muted shadow-[var(--shadow-border)]",
						children: `listings (
  id text pk,
  site text check ('founders' | 'culture' | 'bidception'),
  url text not null,
  url_key text not null,          -- host + path, lowercased
  title text not null,
  tagline text default '',
  team text default '',           -- names, quote, or "what it is"
  socials jsonb default '[]',     -- foundersbid, max 5
  values jsonb default '[]',      -- culturebid, max 5
  bid_cents int not null,         -- whole dollars * 100
  rank int,                       -- recast after every paid bid
  clicks int default 0,
  swap_count int default 0,
  manage_token text unique,       -- secret, never in public select
  created_at timestamptz,
  last_bid_at timestamptz,
  unique (site, url_key)
)

orders (
  id text pk,
  site text,
  kind text check ('bid' | 'swap'),
  amount_cents int,               -- charge today, not the new total
  status text check ('pending'|'paid'|'failed'|'expired'),
  listing_id text,
  manage_token text,              -- issued on first bid
  payload jsonb,                  -- url, title, targetBidCents, newUrl…
  created_at timestamptz,
  paid_at timestamptz
)

activity (
  id text pk,
  site text,
  listing_id text,
  kind text check ('bid'|'rebid'|'swap'|'click'),
  amount_cents int,
  rank_to int,
  title text,
  created_at timestamptz
)`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-muted",
						children: "Rank recomputed after every paid bid as `row_number()` ordered by `bid_cents desc, last_bid_at asc, id asc`. `manage_token` never leaves paid-order and manage endpoints. Unowned rows: no `user_id`, no accounts."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "7. Payment + webhook" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
						className: "list-decimal space-y-2 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Bid or swap form creates a pending order. Charge is computed server-side (full bid, difference, or swap fee). Client amount is not trusted." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Checkout shows Cashfree. Preview: sandbox confirm. Production: Cashfree order + `payment_session_id` + JS checkout." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Webhook `POST /api/webhooks/cashfree` on `order.paid`. Body: `data.order.order_id`. Verify signature in production. Call the same settle path as the sandbox button (`confirmPayment`)." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Settle: insert or update listing, recast ranks, write activity, mark order paid, return manage token. Re-bid updates title/tagline/team/url and `last_bid_at`." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Idempotent: a second paid event for the same order returns the existing listing. A bid that is no longer high enough fails closed." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "After pay: remember the manage token in this browser, toast the new rank, go to `/manage/$token`." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "8. Button, empty, and rules copy" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "list-disc space-y-2 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Bid now / Bid the team / Bid the culture / List a platform / Outbid / Pay the difference / Pay with Cashfree / Swap URL / Copy manage link / Copied / Visit page / Visit culture page / Open platform / Read the rules / Live feed / Back to the board" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Empty board (founders): “No founding teams on the board yet. Five dollars puts you first.”" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Empty board (culture): “No culture pages on the board yet. Five dollars puts you first.”" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Empty board (bidception): “No marketing platforms listed. Five dollars puts the first tool first.”" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Empty tape: “Quiet. The next bid for a founding team lands here.” / “Quiet. The next culture bid lands here.” / “Quiet. The next platform bid lands here.”" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Checkout: “Sandbox checkout. No real charge in this preview.”" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Min bid: “Minimum $5. Whole dollars only.” Re-bid: “Re-bidding the same URL only charges the difference.”" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Manage invalid: “Manage link not valid.” Swap spent: “Top 50 listings get three URL swaps for the life of the listing. This one is spent.”" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Rules live on each board at /founders/rules, /culture/rules, and /bidception/rules." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(H, { children: "9. Design language" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Premium, viral, quiet. A letterhead, not a casino. Three sibling identities, one grid. Large display type, small uppercase kickers, bone/stone/silver as the only loud material. The product should feel like it was typeset, then wired to a card network." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-4 list-disc space-y-2 pl-5 text-muted",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "foundersbid: Newsreader italic for the second hero line, warm paper-on-ink, team names in the row." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "culturebid: Outfit wordmark, cool stone, values chips, optional quote. Professional letterhead." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "bidception: Syne geometric wordmark, silver accent, marketing-platform discovery." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Portal: three equal columns. Board: rank as the left column, bid as the right, visits as a quiet counter." }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Never: purple, gold, emoji chrome, blob gradients, Inter-on-Inter, identical radii on parent and child." })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-14 flex flex-wrap gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/$site",
								params: { site: "founders" },
								className: "inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg",
								children: "Open foundersbid"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/$site",
								params: { site: "culture" },
								className: "inline-flex h-11 items-center rounded-md px-4 text-sm shadow-[var(--shadow-border)]",
								children: "Open culturebid"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/$site",
								params: { site: "bidception" },
								className: "inline-flex h-11 items-center rounded-md px-4 text-sm shadow-[var(--shadow-border)]",
								children: "Open bidception"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { site: "portal" })
		]
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
