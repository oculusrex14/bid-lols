import { r as SITES } from "./sites-aEGgv7RZ.mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as contactEmail, r as legalDoc, t as LegalLinks } from "./legal-OC8g2ujJ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/legal-page-CBPZUDw6.js
var import_jsx_runtime = require_jsx_runtime();
function LegalPage({ site, slug }) {
	const cfg = SITES[site];
	const doc = legalDoc(site, slug);
	const email = contactEmail(site);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "mx-auto max-w-2xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs uppercase tracking-kicker text-subtle",
				children: cfg.domain
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display-site text-4xl tracking-tight sm:text-5xl",
				children: doc.title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-xs text-subtle",
				children: ["Updated ", doc.updated]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-5 text-muted",
				children: doc.intro
			}),
			slug === "contact" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
				href: `mailto:${email}`,
				className: "mt-6 inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg",
				children: email
			}) : null,
			doc.blocks.map((block) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mt-8",
				children: [block.heading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display-site text-2xl tracking-tight",
					children: block.heading
				}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 space-y-3 text-muted",
					children: block.body.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: p }, p))
				})]
			}, block.heading ?? block.body[0])),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-12 border-t border-border pt-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegalLinks, { site }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/$site",
					params: { site },
					className: "mt-4 inline-block text-sm text-muted hover:text-fg",
					children: "Back to the board"
				})]
			})
		]
	});
}
//#endregion
export { LegalPage as t };
