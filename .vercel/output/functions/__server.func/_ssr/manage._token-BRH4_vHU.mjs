import { o as __toESM } from "../_runtime.mjs";
import { a as isSiteId, t as COPY } from "./sites-aEGgv7RZ.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { b as useNavigate, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { S as getManaged, n as Route$1, v as createBidOrder, y as createSwapOrder } from "./router-CW0kdSlg.mjs";
import { t as Button } from "./button-Dhe1uTrn.mjs";
import { n as hostOf, r as rankLabel, t as formatUsd } from "./format-DJnXAy3q.mjs";
import { n as Input, t as Field } from "./input-BQrWNgVJ.mjs";
import { n as rememberOwned } from "./owned-8IJwQGvR.mjs";
import { t as SiteFavicon } from "./site-favicon-BB3koanO.mjs";
import { n as FounderSocials, t as CultureValues } from "./culture-values-pr26i8Qt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/manage._token-BRH4_vHU.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ManagePage() {
	const { site: siteParam, token } = Route$1.useParams();
	const site = isSiteId(siteParam) ? siteParam : "founders";
	const navigate = useNavigate();
	const initial = Route$1.useLoaderData();
	const managed = useQuery({
		queryKey: ["managed", token],
		queryFn: () => getManaged({ data: { token } }),
		placeholderData: initial
	});
	const listing = managed.data?.listing;
	const quote = managed.data?.quote;
	(0, import_react.useEffect)(() => {
		if (listing && isSiteId(listing.site)) rememberOwned({
			site: listing.site,
			listingId: listing.id,
			token,
			title: listing.title
		});
	}, [listing, token]);
	if (managed.isError) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-lg py-16 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display-site text-3xl",
				children: "Manage link not valid"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-muted",
				children: managed.error instanceof Error ? managed.error.message : "This token does not match a listing."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/$site",
				params: { site },
				className: "mt-6 inline-block text-sm hover:underline",
				children: COPY.backToBoard
			})
		]
	});
	if (!listing) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mx-auto h-64 max-w-lg rounded-xl bg-surface shadow-[var(--shadow-border)]" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-kicker text-subtle",
				children: "Manage listing"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex items-start gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFavicon, {
					url: listing.url,
					title: listing.title,
					size: "lg"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-w-0",
					children: listing.site === "founders" && listing.team ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs uppercase tracking-kicker text-subtle",
							children: "Founding team"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-1 font-display text-4xl italic tracking-tight",
							children: listing.team
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-muted",
							children: [listing.title, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-subtle",
								children: [" · ", hostOf(listing.url)]
							})]
						})
					] }) : listing.site === "culture" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs uppercase tracking-kicker text-subtle",
							children: "Company culture"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-1 font-display-site text-4xl tracking-tight",
							children: listing.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: hostOf(listing.url)
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display-site text-4xl tracking-tight",
							children: listing.title
						}),
						listing.team ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: listing.team
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: hostOf(listing.url)
						})
					] })
				})]
			}),
			listing.site === "founders" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FounderSocials, {
				socials: listing.socials,
				className: "mt-4"
			}) : listing.site === "culture" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CultureValues, {
				values: listing.values,
				className: "mt-4"
			}), listing.team ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 font-display italic text-muted",
				children: [
					"“",
					listing.team,
					"”"
				]
			}) : null] }) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Rank",
						value: rankLabel(listing.rank)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Bid",
						value: formatUsd(listing.bidCents)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Visits",
						value: listing.clicks.toLocaleString()
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						label: "Swaps used",
						value: String(listing.swapCount)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					onClick: async () => {
						const url = window.location.href;
						await navigator.clipboard.writeText(url);
						toast.success(COPY.copied);
					},
					children: COPY.copyManage
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "ghost",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/$site/listing/$id",
						params: {
							site,
							id: listing.id
						},
						children: "View listing"
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RebidForm, {
				site,
				url: listing.url,
				title: listing.title,
				tagline: listing.tagline,
				team: listing.team,
				currentDollars: listing.bidCents / 100,
				onOrder: (orderId) => navigate({
					to: "/$site/checkout/$orderId",
					params: {
						site,
						orderId
					}
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-12 border-t border-border pt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display-site text-2xl",
					children: "Swap the URL"
				}), quote && !quote.allowed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-danger",
					children: quote.reason
				}) : quote && quote.allowed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-sm text-muted",
					children: [
						quote.note,
						" Fee ",
						formatUsd(quote.feeCents),
						" at ",
						Math.round(quote.rate * 100),
						"%, with a $10 floor and $2,500 cap.",
						quote.remaining != null ? ` ${quote.remaining} swap${quote.remaining === 1 ? "" : "s"} left after this.` : " Unlimited at this rank."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwapForm, {
					token,
					onOrder: (orderId) => navigate({
						to: "/$site/checkout/$orderId",
						params: {
							site,
							orderId
						}
					})
				})] }) : null]
			})
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-xs uppercase tracking-wider text-subtle",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "mt-1 tabular text-lg font-medium",
			children: value
		})]
	});
}
function RebidForm({ site, url, title, tagline, team, currentDollars, onOrder }) {
	const [amount, setAmount] = (0, import_react.useState)(String(Math.ceil(currentDollars) + 1));
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function submit(e) {
		e.preventDefault();
		setBusy(true);
		try {
			const { orderId } = await createBidOrder({ data: {
				site,
				url,
				title,
				tagline,
				team,
				amountDollars: Number(amount)
			} });
			await onOrder(orderId);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not start re-bid.");
		} finally {
			setBusy(false);
		}
	}
	const dollars = Number(amount);
	const diff = Number.isInteger(dollars) ? dollars - currentDollars : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: (e) => void submit(e),
		className: "mt-10 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display-site text-2xl",
				children: "Re-bid"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: COPY.rebidHint
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "New total (USD)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						inputMode: "numeric",
						value: amount,
						onChange: (e) => setAmount(e.target.value.replace(/[^\d]/g, ""))
					})
				})
			}),
			diff > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm text-muted",
				children: ["Charge today ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "tabular text-fg",
					children: formatUsd(diff * 100)
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm text-danger",
				children: [
					"Must beat ",
					formatUsd(currentDollars * 100),
					"."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				className: "mt-4",
				disabled: busy || diff <= 0,
				children: busy ? "Opening checkout…" : COPY.payDifference
			})
		]
	});
}
function SwapForm({ token, onOrder }) {
	const [newUrl, setNewUrl] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function submit(e) {
		e.preventDefault();
		setBusy(true);
		try {
			const { orderId } = await createSwapOrder({ data: {
				token,
				newUrl
			} });
			await onOrder(orderId);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not start swap.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: (e) => void submit(e),
		className: "mt-5 flex flex-col gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
			label: "New destination URL",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				required: true,
				value: newUrl,
				onChange: (e) => setNewUrl(e.target.value),
				placeholder: "https://"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			type: "submit",
			disabled: busy,
			variant: "outline",
			children: busy ? "Opening checkout…" : COPY.swapUrl
		})]
	});
}
//#endregion
export { ManagePage as component };
