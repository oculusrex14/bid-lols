import { i as isSiteId } from "./sites-BLTVPnCd.mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { c as Route$8 } from "./router-DcNSb0gZ.mjs";
import { t as LegalPage } from "./legal-page-DZORHy5s.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/privacy-BBK94DIV.js
var import_jsx_runtime = require_jsx_runtime();
var SplitComponent = () => {
	const { site } = Route$8.useParams();
	if (!isSiteId(site)) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegalPage, {
		site,
		slug: "privacy"
	});
};
//#endregion
export { SplitComponent as component };
