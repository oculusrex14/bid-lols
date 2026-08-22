import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { t as formatUsd } from "./format-DJnXAy3q.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rank-hint-CteFVuOs.js
var import_jsx_runtime = require_jsx_runtime();
function RankHint({ amountDollars, leaderBidCents, className }) {
	if (amountDollars == null || !Number.isInteger(amountDollars)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: cn("text-xs text-subtle", className),
		children: "Whole dollars only."
	});
	if (amountDollars < 5) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: cn("text-xs text-subtle", className),
		children: "Minimum $5. Whole dollars only."
	});
	const leader = Math.round((leaderBidCents ?? 0) / 100);
	if (leader < 1) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: cn("text-xs text-subtle", className),
		children: amountDollars <= 5 ? "Five dollars puts you first." : "Open board. Highest bid stands first."
	});
	if (amountDollars > leader) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: cn("text-xs text-subtle", className),
		children: amountDollars === leader + 1 ? `One dollar above ${formatUsd(leaderBidCents)}.` : `Takes #1. Current leader is ${formatUsd(leaderBidCents)}.`
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: cn("text-sm text-danger", className),
		role: "status",
		children: amountDollars === leader ? `This matches the leader at ${formatUsd(leaderBidCents)}. Rank goes to whoever reached it first — you will sit below #1.` : `You have bid below the leader (${formatUsd(leaderBidCents)}). You will be ranked below accordingly.`
	});
}
//#endregion
export { RankHint as t };
