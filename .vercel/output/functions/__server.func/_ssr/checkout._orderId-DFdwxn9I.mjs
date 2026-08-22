import { o as __toESM } from "../_runtime.mjs";
import { a as isSiteId, t as COPY } from "./sites-aEGgv7RZ.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { b as useNavigate, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { f as Building2, i as Smartphone, t as Wallet, u as CreditCard } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as getOrder, _ as confirmPayment, i as Route$3 } from "./router-CW0kdSlg.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { n as hostOf, t as formatUsd } from "./format-DJnXAy3q.mjs";
import { n as rememberOwned } from "./owned-8IJwQGvR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout._orderId-DFdwxn9I.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var METHODS = [
	{
		id: "upi",
		label: "UPI",
		Icon: Smartphone
	},
	{
		id: "card",
		label: "Card",
		Icon: CreditCard
	},
	{
		id: "netbanking",
		label: "Net banking",
		Icon: Building2
	},
	{
		id: "wallet",
		label: "Wallet",
		Icon: Wallet
	}
];
function CheckoutPage() {
	const { site: siteParam, orderId } = Route$3.useParams();
	const site = isSiteId(siteParam) ? siteParam : "founders";
	const navigate = useNavigate();
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [method, setMethod] = (0, import_react.useState)("upi");
	const initial = Route$3.useLoaderData();
	const order = useQuery({
		queryKey: ["order", orderId],
		queryFn: () => getOrder({ data: { orderId } }),
		placeholderData: initial
	});
	(0, import_react.useEffect)(() => {
		if (document.querySelector("script[data-cashfree-sdk]")) return;
		const script = document.createElement("script");
		script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
		script.async = true;
		script.dataset.cashfreeSdk = "true";
		document.head.appendChild(script);
	}, []);
	async function settle() {
		const result = await confirmPayment({ data: { orderId } });
		if (!result.token) throw new Error("Payment settled, manage link missing.");
		rememberOwned({
			site: result.site,
			listingId: result.listing.id,
			token: result.token,
			title: result.listing.title
		});
		toast.success(result.listing.rank ? `Live at rank ${result.listing.rank}.` : "Payment recorded.");
		await navigate({
			to: "/$site/manage/$token",
			params: {
				site: result.site,
				token: result.token
			}
		});
	}
	async function pay(data) {
		setBusy(true);
		try {
			if (data.gatewayLive) {
				const Cashfree = window.Cashfree;
				if (Cashfree) await Cashfree({ mode: data.gatewayMode }).checkout({
					paymentSessionId: data.paymentSessionId,
					redirectTarget: "_modal"
				});
			}
			await settle();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Payment failed.");
		} finally {
			setBusy(false);
		}
	}
	const data = order.data;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-lg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-kicker text-subtle",
				children: "Cashfree Payments"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display-site text-4xl tracking-tight",
				children: "Pay the rank"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-3 text-sm text-muted",
				children: [
					"Checkout is Cashfree. This preview runs their sandbox session. Confirm on the gateway panel to settle — same path as a",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "PAYMENT_SUCCESS" }),
					" webhook."
				]
			}),
			order.isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-danger",
				children: order.error instanceof Error ? order.error.message : "Order missing."
			}) : null,
			data ? data.status === "paid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-sm text-up",
				children: "Already paid on Cashfree. Open manage from your saved link."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CashfreePanel, {
				data,
				method,
				onMethod: setMethod,
				busy,
				onPay: () => void pay(data)
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-8 h-80 rounded-xl bg-surface shadow-[var(--shadow-border)]" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/$site",
				params: { site },
				className: "mt-6 inline-block text-sm text-muted hover:text-fg",
				children: COPY.backToBoard
			})
		]
	});
}
function CashfreePanel({ data, method, onMethod, busy, onPay }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"data-gateway": "cashfree",
		className: "mt-8 overflow-hidden rounded-xl shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between px-5 py-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CashfreeMark, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm font-medium tracking-tight",
					children: "cashfree"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "cf-chip rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wider",
				children: data.gatewayMode
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-5 pb-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-wider cf-muted",
					children: "Amount payable"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 tabular text-3xl font-medium",
					children: formatUsd(data.amountCents)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm cf-muted",
					children: [
						data.chargeLabel,
						" · ",
						data.title
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 truncate text-xs cf-muted",
					children: hostOf(data.url) || data.url
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-4 space-y-2 text-xs cf-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "Cashfree order" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "truncate tabular",
							children: data.id
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "payment_session_id" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "truncate tabular",
							children: data.paymentSessionId
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 text-xs uppercase tracking-wider cf-muted",
					children: "Pay with"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 grid grid-cols-2 gap-2",
					children: METHODS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						"data-on": method === item.id ? "true" : "false",
						className: cn("cf-method cf-line inline-flex h-11 items-center justify-center gap-2 rounded-md text-sm", method === item.id ? "font-medium" : "cf-muted"),
						onClick: () => onMethod(item.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.Icon, { className: "size-4" }), item.label]
					}, item.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "cf-pay mt-5 inline-flex h-11 w-full items-center justify-center rounded-md text-sm font-medium disabled:opacity-50",
					disabled: busy,
					onClick: onPay,
					children: busy ? "Contacting Cashfree…" : `Pay ${formatUsd(data.amountCents)} · ${METHODS.find((m) => m.id === method)?.label}`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 text-center text-xs cf-muted",
					children: ["PCI DSS · Powered by Cashfree Payments", data.gatewayLive ? " · live session" : " · sandbox session"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-center text-xs cf-muted",
					children: "Webhook POST /api/webhooks/cashfree on PAYMENT_SUCCESS"
				})
			]
		})]
	});
}
function CashfreeMark() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		className: "size-6",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			width: "24",
			height: "24",
			rx: "6",
			fill: "var(--cf-accent)"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M8 8.5h5.2a3.8 3.8 0 0 1 0 7.6H8V8.5Zm2.1 1.8v4h3.1a2 2 0 0 0 0-4H10.1Z",
			fill: "var(--cf-accent-fg)"
		})]
	});
}
//#endregion
export { CheckoutPage as component };
