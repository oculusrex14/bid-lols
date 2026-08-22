import { o as __toESM } from "../_runtime.mjs";
import { n as SITES, r as isSiteId, t as COPY } from "./sites-DQ1RC7LF.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { f as createBidOrder, o as Route$5, v as quoteBid } from "./router-CGUqDkXs.mjs";
import { t as Button } from "./button-Dhe1uTrn.mjs";
import { t as formatUsd } from "./format-DJnXAy3q.mjs";
import { n as Input, t as Field } from "./input-BQrWNgVJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/bid-D1Yo7boP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function BidPage() {
	const { site: siteParam } = Route$5.useParams();
	const site = isSiteId(siteParam) ? siteParam : "founders";
	const { url: prefillUrl } = Route$5.useSearch();
	const navigate = useNavigate();
	const cfg = SITES[site];
	const [url, setUrl] = (0, import_react.useState)(prefillUrl ?? "");
	const [title, setTitle] = (0, import_react.useState)("");
	const [tagline, setTagline] = (0, import_react.useState)("");
	const [team, setTeam] = (0, import_react.useState)("");
	const [amount, setAmount] = (0, import_react.useState)(String(5));
	const [quote, setQuote] = (0, import_react.useState)("");
	const [charge, setCharge] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (prefillUrl) setUrl(prefillUrl);
	}, [prefillUrl]);
	(0, import_react.useEffect)(() => {
		const dollars = Number(amount);
		if (!url.trim() || !Number.isInteger(dollars) || dollars < 5) {
			setQuote("");
			setCharge(null);
			return;
		}
		const handle = window.setTimeout(() => {
			quoteBid({ data: {
				site,
				url,
				amountDollars: dollars
			} }).then((q) => {
				setQuote(q.message);
				setCharge(q.chargeCents);
				if (q.current && !title) setTitle(q.current.title);
			}).catch((err) => {
				setQuote(err.message);
				setCharge(null);
			});
		}, 280);
		return () => window.clearTimeout(handle);
	}, [
		url,
		amount,
		site
	]);
	async function submit(e) {
		e.preventDefault();
		const dollars = Number(amount);
		setBusy(true);
		try {
			const { orderId } = await createBidOrder({ data: {
				site,
				url,
				title,
				tagline,
				team,
				amountDollars: dollars
			} });
			await navigate({
				to: "/$site/checkout/$orderId",
				params: {
					site,
					orderId
				}
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not start checkout.");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid max-w-4xl gap-10 lg:grid-cols-[minmax(0,1fr)_280px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-[0.2em] text-subtle",
				children: "Place a bid"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display-site text-4xl tracking-tight sm:text-5xl",
				children: cfg.cta
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-muted",
				children: COPY.rebidHint
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => void submit(e),
				className: "mt-8 flex flex-col gap-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: cfg.urlLabel,
						hint: cfg.urlHint,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							required: true,
							value: url,
							onChange: (e) => setUrl(e.target.value),
							placeholder: "https://",
							inputMode: "url",
							autoComplete: "url"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: cfg.titleLabel,
						hint: cfg.titleHint,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							required: true,
							maxLength: 80,
							value: title,
							onChange: (e) => setTitle(e.target.value),
							placeholder: cfg.name
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: cfg.taglineLabel,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							maxLength: 140,
							value: tagline,
							onChange: (e) => setTagline(e.target.value),
							placeholder: cfg.tagline
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: cfg.extraLabel,
						hint: cfg.extraHint,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							maxLength: 140,
							value: team,
							onChange: (e) => setTeam(e.target.value),
							placeholder: cfg.extraPlaceholder
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Bid total (USD)",
						hint: COPY.minBid,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							required: true,
							inputMode: "numeric",
							value: amount,
							onChange: (e) => setAmount(e.target.value.replace(/[^\d]/g, ""))
						})
					}),
					quote ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "rounded-md bg-surface px-3 py-2.5 text-sm text-muted shadow-[var(--shadow-border)]",
						children: [quote, charge != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "mt-1 block tabular text-fg",
							children: ["Charge today ", formatUsd(charge)]
						}) : null]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: busy,
						className: "w-full sm:w-auto",
						children: busy ? "Opening checkout…" : charge != null && charge < Number(amount) * 100 ? COPY.payDifference : COPY.bidNow
					})
				]
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "text-sm text-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-fg",
				children: "Before you pay"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-3 space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Cashfree sandbox in this preview. No real charge." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "You get a manage link after payment. Save it." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "The URL goes live the moment the order is marked paid." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Swaps are later, from the manage page, and cost a cut of the current bid." })
				]
			})]
		})]
	});
}
//#endregion
export { BidPage as component };
