import { n as SITES, r as isSiteId } from "./sites-DQ1RC7LF.mjs";
import { r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { m as getBoard, s as Route$6 } from "./router-CGUqDkXs.mjs";
import { t as ActivityFeed } from "./activity-feed-Dl9QR5yA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/activity-Clcny5jP.js
var import_jsx_runtime = require_jsx_runtime();
function ActivityPage() {
	const { site: siteParam } = Route$6.useParams();
	const site = isSiteId(siteParam) ? siteParam : "founders";
	const cfg = SITES[site];
	const board = useQuery({
		queryKey: ["board", site],
		queryFn: () => getBoard({ data: { site } }),
		refetchInterval: 3e3
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-[0.2em] text-subtle",
				children: "Live tape"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "mt-3 font-display-site text-4xl tracking-tight",
				children: [cfg.wordmark, " activity"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-muted",
				children: "Bids, re-bids, and URL swaps. The board refreshes on its own."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8",
				children: board.data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivityFeed, {
					site,
					items: board.data.activity
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-subtle",
					children: "Listening…"
				})
			})
		]
	});
}
//#endregion
export { ActivityPage as component };
