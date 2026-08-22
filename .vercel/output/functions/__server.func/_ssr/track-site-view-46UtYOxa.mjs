import { o as __toESM } from "../_runtime.mjs";
import { i as SITE_IDS } from "./sites-aEGgv7RZ.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { E as trackView } from "./router-CW0kdSlg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/track-site-view-46UtYOxa.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var KEY = "bidthrone.viewed";
/** One request per session. Portal batches all three boards instead of three round-trips. */
function TrackSiteView({ site }) {
	(0, import_react.useEffect)(() => {
		try {
			const raw = sessionStorage.getItem(KEY);
			const seen = raw ? JSON.parse(raw) : [];
			const targets = site === "portal" ? [...SITE_IDS] : [site];
			const next = [...seen];
			const fresh = targets.filter((id) => !next.includes(id));
			if (fresh.length) {
				next.push(...fresh);
				sessionStorage.setItem(KEY, JSON.stringify(next));
				trackView({ data: { sites: fresh } });
			}
		} catch {
			const targets = site === "portal" ? [...SITE_IDS] : [site];
			trackView({ data: { sites: targets } });
		}
	}, [site]);
	return null;
}
//#endregion
export { TrackSiteView as t };
