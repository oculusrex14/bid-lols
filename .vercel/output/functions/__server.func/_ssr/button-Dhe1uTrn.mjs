import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as cn } from "./cn-Ccejyh36.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/button-Dhe1uTrn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles = {
	primary: "bg-accent text-accent-fg hover:opacity-90 disabled:opacity-50",
	ghost: "bg-transparent text-fg hover:bg-raised disabled:opacity-50",
	outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)] disabled:opacity-50",
	danger: "bg-danger text-fg hover:opacity-90 disabled:opacity-50"
};
var Button = (0, import_react.forwardRef)(function Button({ className, variant = "primary", type = "button", asChild, ...props }, ref) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		ref,
		type: asChild ? void 0 : type,
		className: cn("inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium", "transition-[opacity,transform,box-shadow,background-color] duration-150 ease-out", "active:not-disabled:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", styles[variant], className),
		...props
	});
});
//#endregion
export { Button as t };
