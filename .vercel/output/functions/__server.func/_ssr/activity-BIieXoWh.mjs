import { i as isSiteId, r as SITES } from "./sites-BLTVPnCd.mjs";
import { r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { b as getBoard, d as Route$11 } from "./router-DcNSb0gZ.mjs";
import { t as ActivityFeed } from "./activity-feed-DpjwEEJT.mjs";
import { t as TrackSiteView } from "./track-site-view-Cycge0Eu.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/activity-BIieXoWh.js
var import_jsx_runtime = require_jsx_runtime();
function ActivityPage() {
	const { site: siteParam } = Route$11.useParams();
	const site = isSiteId(siteParam) ? siteParam : "founders";
	const cfg = SITES[site];
	const initial = Route$11.useLoaderData();
	const board = useQuery({
		queryKey: ["board", site],
		queryFn: () => getBoard({ data: { site } }),
		placeholderData: initial,
		refetchInterval: 3e3
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrackSiteView, { site }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-kicker text-subtle",
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
