import { o as __toESM } from "../_runtime.mjs";
import { r as isSiteId, t as COPY } from "./sites-DQ1RC7LF.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { b as useNavigate, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as getOrder, d as confirmPayment, i as Route$3 } from "./router-CGUqDkXs.mjs";
import { t as Button } from "./button-Dhe1uTrn.mjs";
import { n as hostOf, t as formatUsd } from "./format-DJnXAy3q.mjs";
import { n as rememberOwned } from "./owned-8IJwQGvR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout._orderId-BEWoLnwR.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function CheckoutPage() {
	const { site: siteParam, orderId } = Route$3.useParams();
	const site = isSiteId(siteParam) ? siteParam : "founders";
	const navigate = useNavigate();
	const [busy, setBusy] = (0, import_react.useState)(false);
	const order = useQuery({
		queryKey: ["order", orderId],
		queryFn: () => getOrder({ data: { orderId } })
	});
	async function pay() {
		setBusy(true);
		try {
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
				className: "text-xs uppercase tracking-[0.2em] text-subtle",
				children: "Cashfree checkout"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display-site text-4xl tracking-tight",
				children: "Pay the rank"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: COPY.checkoutDemo
			}),
			order.isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-8 text-danger",
				children: order.error instanceof Error ? order.error.message : "Order missing."
			}) : null,
			data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "space-y-3 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Order",
							value: data.id
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Kind",
							value: data.chargeLabel
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Listing",
							value: data.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "URL",
							value: hostOf(data.url) || data.url
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Amount",
							value: formatUsd(data.amountCents),
							strong: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Status",
							value: data.status
						})
					]
				}), data.status === "paid" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 text-sm text-up",
					children: "Already paid. Open manage from your saved link."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "mt-6 w-full",
					disabled: busy,
					onClick: () => void pay(),
					children: busy ? "Settling…" : `${COPY.payCashfree} · ${formatUsd(data.amountCents)}`
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-8 h-64 rounded-xl bg-surface shadow-[var(--shadow-border)]" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-xs text-subtle",
				children: "Production webhook: Cashfree `order.paid` hits `/api/webhooks/cashfree`, verifies the signature, and runs the same settle path as this button."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/$site",
				params: { site },
				className: "mt-4 inline-block text-sm text-muted hover:text-fg",
				children: COPY.backToBoard
			})
		]
	});
}
function Row({ label, value, strong }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start justify-between gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-subtle",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: strong ? "tabular font-medium" : "truncate tabular text-right",
			children: value
		})]
	});
}
//#endregion
export { CheckoutPage as component };
