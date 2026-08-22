import { o as __toESM } from "../_runtime.mjs";
import { a as isSiteId, r as SITES, t as COPY } from "./sites-aEGgv7RZ.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { a as Plus, c as Minus } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { b as getBoard, u as Route$10, v as createBidOrder, w as quoteBid } from "./router-CW0kdSlg.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { t as Button } from "./button-Dhe1uTrn.mjs";
import { t as clampSocials } from "./socials-CEYLul7Z.mjs";
import { t as formatUsd } from "./format-DJnXAy3q.mjs";
import { n as Input, t as Field } from "./input-BQrWNgVJ.mjs";
import { t as RankHint } from "./rank-hint-CteFVuOs.mjs";
import { t as clampValues } from "./values-CJ6qqPr1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/bid-Be-mg1SV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function emptySocials() {
	return Array.from({ length: 5 }, () => "");
}
function emptyValues() {
	return Array.from({ length: 5 }, () => "");
}
function BidPage() {
	const { site: siteParam } = Route$10.useParams();
	const site = isSiteId(siteParam) ? siteParam : "founders";
	const { url: prefillUrl, amount: prefillAmount } = Route$10.useSearch();
	const navigate = useNavigate();
	const cfg = SITES[site];
	const founders = site === "founders";
	const culture = site === "culture";
	const [url, setUrl] = (0, import_react.useState)(prefillUrl ?? "");
	const [title, setTitle] = (0, import_react.useState)("");
	const [tagline, setTagline] = (0, import_react.useState)("");
	const [team, setTeam] = (0, import_react.useState)("");
	const [socials, setSocials] = (0, import_react.useState)(emptySocials);
	const [values, setValues] = (0, import_react.useState)(emptyValues);
	const [amount, setAmount] = (0, import_react.useState)(prefillAmount ?? String(5));
	const [quote, setQuote] = (0, import_react.useState)("");
	const [charge, setCharge] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const filledFromExisting = (0, import_react.useRef)(false);
	const leaderBidCents = useQuery({
		queryKey: ["board", site],
		queryFn: () => getBoard({ data: { site } }),
		staleTime: 4e3
	}).data?.listings[0]?.bidCents ?? 0;
	const amountDollars = /^\d+$/.test(amount) ? Number(amount) : null;
	(0, import_react.useEffect)(() => {
		if (prefillUrl) setUrl(prefillUrl);
	}, [prefillUrl]);
	(0, import_react.useEffect)(() => {
		if (prefillAmount && /^\d+$/.test(prefillAmount)) setAmount(prefillAmount);
	}, [prefillAmount]);
	(0, import_react.useEffect)(() => {
		filledFromExisting.current = false;
	}, [url]);
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
				if (q.current && !filledFromExisting.current) {
					filledFromExisting.current = true;
					const current = q.current;
					setTitle((t) => t || current.title);
					setTagline((t) => t || current.tagline);
					setTeam((t) => t || current.team);
					if (current.socials.length) setSocials((prev) => {
						if (prev.some((s) => s.trim())) return prev;
						const next = emptySocials();
						current.socials.forEach((s, i) => {
							if (i < 5) next[i] = s;
						});
						return next;
					});
					if (current.values.length) setValues((prev) => {
						if (prev.some((s) => s.trim())) return prev;
						const next = emptyValues();
						current.values.forEach((s, i) => {
							if (i < 5) next[i] = s;
						});
						return next;
					});
				}
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
				socials: founders ? clampSocials(socials) : [],
				values: culture ? clampValues(values) : [],
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
				className: "text-xs uppercase tracking-kicker text-subtle",
				children: "Place a bid"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display-site text-4xl tracking-tight sm:text-5xl",
				children: cfg.cta
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: founders ? "mt-3 font-display text-lg italic text-fg" : "mt-3 text-muted",
				children: founders || culture ? cfg.tagline : COPY.rebidHint
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: (e) => void submit(e),
				className: "mt-8 flex flex-col gap-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: founders ? "Listing title / Company name" : cfg.titleLabel,
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
						label: founders ? "Page URL (about / team page)" : cfg.urlLabel,
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
						label: cfg.taglineLabel,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							maxLength: 140,
							value: tagline,
							onChange: (e) => setTagline(e.target.value),
							placeholder: cfg.tagline,
							required: culture
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: founders ? "Founding team names" : cfg.extraLabel,
						hint: founders ? "The names sit first on the public board. People over product." : cfg.extraHint,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							maxLength: 140,
							value: team,
							onChange: (e) => setTeam(e.target.value),
							placeholder: cfg.extraPlaceholder,
							required: founders
						})
					}),
					founders ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
						className: "flex flex-col gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
								className: "text-sm font-medium text-fg",
								children: "Founder socials (up to 5)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-subtle",
								children: "X, LinkedIn, or a personal site. One founder per field. Shown as icons on the board."
							}),
							socials.map((value, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: `Founder ${i + 1} social`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value,
									onChange: (e) => {
										const next = [...socials];
										next[i] = e.target.value;
										setSocials(next);
									},
									placeholder: "https://x.com/… or linkedin.com/in/…",
									inputMode: "url"
								})
							}, i))
						]
					}) : null,
					culture ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
						className: "flex flex-col gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("legend", {
								className: "text-sm font-medium text-fg",
								children: "Key values / why join us (up to 5)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-subtle",
								children: "Short points. Shown as chips on the board so talent can scan the culture."
							}),
							values.map((value, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: `Value ${i + 1}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value,
									maxLength: 48,
									onChange: (e) => {
										const next = [...values];
										next[i] = e.target.value;
										setValues(next);
									},
									placeholder: "Taste, Pace, Candor…"
								})
							}, i))
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Bid total (USD)",
						hint: COPY.minBid,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "Decrease bid",
									disabled: amountDollars == null || amountDollars <= 5,
									onClick: () => setAmount(String(Math.max(5, (amountDollars ?? 5) - 1))),
									className: cn("inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg shadow-[var(--shadow-border)]", "hover:shadow-[var(--shadow-border-hover)] disabled:opacity-40"),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									required: true,
									inputMode: "numeric",
									value: amount,
									onChange: (e) => setAmount(e.target.value.replace(/[^\d]/g, "")),
									className: "flex-1"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": "Increase bid",
									onClick: () => setAmount(String((amountDollars ?? 5) + 1)),
									className: cn("inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg shadow-[var(--shadow-border)]", "hover:shadow-[var(--shadow-border-hover)] disabled:opacity-40"),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" })
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RankHint, {
						amountDollars,
						leaderBidCents
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
					founders ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "The founding team is the headline. The company URL stays secondary." }) : null,
					culture ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Company name first. Culture statement, values, and quote sit on the public row." }) : null,
					site === "bidception" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "This board is for marketing platforms — leftover budget after foundersbid or culturebid." }) : null,
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
