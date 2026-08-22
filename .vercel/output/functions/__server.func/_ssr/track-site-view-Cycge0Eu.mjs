import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { E as trackView } from "./router-DcNSb0gZ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/track-site-view-Cycge0Eu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var KEY = "bidthrone.viewed";
function TrackSiteView({ site }) {
	(0, import_react.useEffect)(() => {
		try {
			const raw = sessionStorage.getItem(KEY);
			const seen = raw ? JSON.parse(raw) : [];
			const targets = site === "portal" ? ["founders", "bidception"] : [site];
			const next = [...seen];
			for (const id of targets) {
				if (next.includes(id)) continue;
				next.push(id);
				trackView({ data: { site: id } });
			}
			sessionStorage.setItem(KEY, JSON.stringify(next));
		} catch {
			if (site === "portal") {
				trackView({ data: { site: "founders" } });
				trackView({ data: { site: "bidception" } });
			} else trackView({ data: { site } });
		}
	}, [site]);
	return null;
}
//#endregion
export { TrackSiteView as t };
