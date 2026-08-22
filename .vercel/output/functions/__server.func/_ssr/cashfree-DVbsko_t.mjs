import { createHmac, timingSafeEqual } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/cashfree-DVbsko_t.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var cashfree_exports = /* @__PURE__ */ __exportAll({
	createCashfreeSession: () => createCashfreeSession,
	verifyCashfreeWebhook: () => verifyCashfreeWebhook
});
function envMode() {
	return process.env.CASHFREE_MODE === "production" ? "production" : "sandbox";
}
async function createCashfreeSession(opts) {
	const clientId = process.env.CASHFREE_CLIENT_ID ?? process.env.CASHFREE_APP_ID;
	const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
	const mode = envMode();
	const fallback = {
		live: false,
		mode: "sandbox",
		paymentSessionId: `session_${opts.orderId}`,
		cfOrderId: opts.orderId
	};
	if (!clientId || !clientSecret) return fallback;
	const host = mode === "production" ? "https://api.cashfree.com/pg/orders" : "https://sandbox.cashfree.com/pg/orders";
	try {
		const res = await fetch(host, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				"x-api-version": "2025-01-01",
				"x-client-id": clientId,
				"x-client-secret": clientSecret
			},
			body: JSON.stringify({
				order_id: opts.orderId,
				order_amount: Number((opts.amountCents / 100).toFixed(2)),
				order_currency: "USD",
				customer_details: {
					customer_id: `anon_${opts.orderId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-40) || "guest"}`,
					customer_phone: "9999999999"
				},
				order_meta: { notify_url: process.env.CASHFREE_NOTIFY_URL || void 0 }
			})
		});
		if (!res.ok) return fallback;
		const json = await res.json();
		return {
			live: Boolean(json.payment_session_id),
			mode,
			paymentSessionId: json.payment_session_id ?? fallback.paymentSessionId,
			cfOrderId: json.order_id ?? opts.orderId
		};
	} catch {
		return fallback;
	}
}
function verifyCashfreeWebhook(opts) {
	const secret = process.env.CASHFREE_WEBHOOK_SECRET ?? process.env.CASHFREE_CLIENT_SECRET;
	if (!secret) return true;
	if (!opts.signature || !opts.timestamp) return false;
	const expected = createHmac("sha256", secret).update(opts.timestamp + opts.rawBody).digest("base64");
	const a = Buffer.from(expected);
	const b = Buffer.from(opts.signature);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
//#endregion
export { verifyCashfreeWebhook as n, __exportAll as r, cashfree_exports as t };
