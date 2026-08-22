import { o as __toESM } from "../_runtime.mjs";
import { a as isSiteId, i as SITE_IDS, n as PORTAL, r as SITES } from "./sites-aEGgv7RZ.mjs";
import { n as verifyCashfreeWebhook, r as __exportAll } from "./cashfree-DVbsko_t.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { _ as createFileRoute, d as HeadContent, g as lazyRouteComponent, h as Outlet, m as createRouter, u as Scripts, v as createRootRoute, x as useRouter, z as redirect } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as QueryClientProvider, r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as object, i as number, n as array, o as string, r as literal, s as union, t as _enum } from "../_libs/zod.mjs";
import { n as TriangleAlert } from "../_libs/lucide-react.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/board-fns-Csc_JurP.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var siteEnum = _enum(SITE_IDS);
var siteSchema = object({ site: siteEnum });
/** Portal / batched views: one insert + one day-roll instead of 3× ensureSiteStats. */
var getBoard = createServerFn({ method: "GET" }).validator(siteSchema.parse).handler(createSsrRpc("84518a2bc72d0e2a7fb249b94ca8fb8bf4d934d2b8c284841c592b4346689f0f"));
/** Portal only needs top 3 + stats per board — skip activity and the full 100-row list. */
var getPortal = createServerFn({ method: "GET" }).handler(createSsrRpc("cd84e7f71e960890cbda70e6a2d7be7585cec800f415e0220056268fd8d47a6e"));
var getListing = createServerFn({ method: "GET" }).validator(object({ id: string().min(1) }).parse).handler(createSsrRpc("05da579c6e516855476589258619df623ee7e496651ed18189b61aec62d8f377"));
var quoteBid = createServerFn({ method: "GET" }).validator(object({
	site: siteEnum,
	url: string().min(1),
	amountDollars: number().optional()
}).parse).handler(createSsrRpc("51d37da3a6a2e78172cb3001e7058285bd097df76f95d491549e0a60dd724ab0"));
var createBidOrder = createServerFn({ method: "POST" }).validator(object({
	site: siteEnum,
	url: string().min(3),
	title: string().min(2).max(80),
	tagline: string().max(140),
	team: string().max(140),
	socials: array(string()).max(5).optional(),
	/** Culturebid “why join us” points. Ignored on other boards. */
	values: array(string()).max(5).optional(),
	amountDollars: number()
}).parse).handler(createSsrRpc("a0a5a5e21f8c3bd454681d3ff96d69abe659cd6378bc36c6e0023acffe53de5c"));
var createSwapOrder = createServerFn({ method: "POST" }).validator(object({
	token: string().min(8),
	newUrl: string().min(3)
}).parse).handler(createSsrRpc("c684eae2b96453e54df19cdd67254722ceb4de2211854072e82574ce27b081af"));
var getOrder = createServerFn({ method: "GET" }).validator(object({ orderId: string().min(1) }).parse).handler(createSsrRpc("db5ad1d49b89b6b6279ee9211d68cc12f07b60afc370b24cd18f74573d5f226a"));
var confirmPayment = createServerFn({ method: "POST" }).validator(object({ orderId: string().min(1) }).parse).handler(createSsrRpc("75257d72de85c38c000aa3cf197609266057a6483d5408a520738f52425a5a4f"));
var getManaged = createServerFn({ method: "GET" }).validator(object({ token: string().min(8) }).parse).handler(createSsrRpc("02ce8b4f5428c757d1b2cc3d317cec158d6fe5fc562ae4ba365a5ce828860e9b"));
var trackClick = createServerFn({ method: "POST" }).validator(object({ id: string().min(1) }).parse).handler(createSsrRpc("900f1ccade2f1f50c07d87c4cebdc51cec854abf9e3d4a6cc2753caf43bdfcd6"));
var trackView = createServerFn({ method: "POST" }).validator(object({ sites: array(siteEnum).min(1).max(3) }).parse).handler(createSsrRpc("69cfd1c9eb676871b2ed4db048de66e189206315587bc346d376d6cfe83a2db1"));
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/router-CW0kdSlg.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-danger",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-2xl tracking-tight",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-muted",
				children: error.message || "An unexpected error occurred. Try reloading the page."
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var MODE_KEY = "bidlol.appearance";
function readMode() {
	if (typeof window === "undefined") return "light";
	try {
		return localStorage.getItem("bidlol.appearance") === "dark" ? "dark" : "light";
	} catch {
		return "light";
	}
}
function applyMode(mode) {
	if (typeof document === "undefined") return;
	document.documentElement.dataset.mode = mode;
	try {
		localStorage.setItem(MODE_KEY, mode);
	} catch {}
}
var MODE_BOOT_SCRIPT = `try{var m=localStorage.getItem("${MODE_KEY}");document.documentElement.setAttribute("data-mode",m==="dark"?"dark":"light")}catch(e){document.documentElement.setAttribute("data-mode","light")}`;
var styles_default = "/assets/styles-juTdM3wq.css";
var APP_NAME = PORTAL.domain;
var Route$16 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "bidthrone.lol — three pay-to-rank boards. Foundersbid, culturebid, bidception. Highest bid ranks first."
			},
			{
				name: "theme-color",
				content: "#f4efe4"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			}
		]
	}),
	component: RootDocument
});
function RootDocument() {
	const [queryClient] = (0, import_react.useState)(() => new QueryClient({ defaultOptions: { queries: {
		staleTime: 2500,
		refetchOnWindowFocus: true
	} } }));
	const [mode, setMode] = (0, import_react.useState)("light");
	(0, import_react.useEffect)(() => {
		const current = readMode();
		setMode(current);
		const onMode = (event) => {
			const next = event.detail;
			if (next === "light" || next === "dark") setMode(next);
		};
		window.addEventListener("bidlol:mode", onMode);
		return () => window.removeEventListener("bidlol:mode", onMode);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		className: "antialiased",
		"data-mode": mode,
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("head", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("script", { dangerouslySetInnerHTML: { __html: MODE_BOOT_SCRIPT } }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", {
			className: "min-h-screen bg-bg text-fg",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
					client: queryClient,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
						theme: mode,
						position: "bottom-center",
						toastOptions: { style: {
							background: "var(--surface)",
							color: "var(--fg)",
							border: "1px solid var(--border)"
						} }
					})]
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
			]
		})]
	});
}
var $$splitComponentImporter$15 = () => import("./routes-DA8YcWFj.mjs");
var Route$15 = createFileRoute("/")({
	loader: () => getPortal(),
	head: () => ({ meta: [{ title: PORTAL.domain }, {
		name: "description",
		content: "bidthrone.lol — three pay-to-rank boards. Foundersbid proves founding teams. Culturebid ranks culture. Bidception finds other marketing platforms."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
var $$splitComponentImporter$14 = () => import("../_site-BcoesSgt.mjs");
/** One file-route tree serves founders | culture | bidception. Board key is `site`, not a board_type column. */
var Route$14 = createFileRoute("/$site")({
	beforeLoad: ({ params }) => {
		if (!isSiteId(params.site)) throw redirect({ to: "/" });
	},
	head: ({ params }) => {
		const cfg = isSiteId(params.site) ? SITES[params.site] : null;
		return { meta: [{ title: cfg ? `${cfg.wordmark}.lol` : "bidthrone.lol" }, {
			name: "description",
			content: cfg?.tagline ?? ""
		}] };
	},
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
var $$splitComponentImporter$13 = () => import("./spec-CfcPkHNj.mjs");
var Route$13 = createFileRoute("/spec")({
	component: lazyRouteComponent($$splitComponentImporter$13, "component"),
	head: () => ({ meta: [{ title: `${PORTAL.domain} — Product spec` }] })
});
var $$splitComponentImporter$12 = () => import("../_site-DPpj7PdT.mjs");
var Route$12 = createFileRoute("/$site/")({
	loader: ({ params }) => {
		return getBoard({ data: { site: isSiteId(params.site) ? params.site : "founders" } });
	},
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./activity-Cx0_rXVE.mjs");
var Route$11 = createFileRoute("/$site/activity")({
	loader: ({ params }) => {
		return getBoard({ data: { site: isSiteId(params.site) ? params.site : "founders" } });
	},
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./bid-Be-mg1SV.mjs");
var Route$10 = createFileRoute("/$site/bid")({
	validateSearch: (search) => ({
		url: typeof search.url === "string" ? search.url : void 0,
		amount: typeof search.amount === "string" ? search.amount : void 0
	}),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./contact-iI32P5Mg.mjs");
var Route$9 = createFileRoute("/$site/contact")({
	component: lazyRouteComponent($$splitComponentImporter$9, "component"),
	head: () => ({ meta: [{ title: "Contact" }] })
});
var $$splitComponentImporter$8 = () => import("./privacy-BjJKHb9h.mjs");
var Route$8 = createFileRoute("/$site/privacy")({
	component: lazyRouteComponent($$splitComponentImporter$8, "component"),
	head: () => ({ meta: [{ title: "Privacy policy" }] })
});
var $$splitComponentImporter$7 = () => import("./refund-DJ3j5U6W.mjs");
var Route$7 = createFileRoute("/$site/refund")({
	component: lazyRouteComponent($$splitComponentImporter$7, "component"),
	head: () => ({ meta: [{ title: "Refund policy" }] })
});
var $$splitComponentImporter$6 = () => import("./rules-CQ9Ll6iC.mjs");
var Route$6 = createFileRoute("/$site/rules")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./terms-BEWQ9KaK.mjs");
var Route$5 = createFileRoute("/$site/terms")({
	component: lazyRouteComponent($$splitComponentImporter$5, "component"),
	head: () => ({ meta: [{ title: "Terms of service" }] })
});
var $$splitComponentImporter$4 = () => import("./favicon-Drw-QiWo.mjs");
var Route$4 = createFileRoute("/api/favicon")({
	component: lazyRouteComponent($$splitComponentImporter$4, "component"),
	server: { handlers: { GET: async ({ request }) => {
		const url = new URL(request.url);
		const hostRaw = url.searchParams.get("host") ?? "";
		const letterRaw = url.searchParams.get("letter") ?? "";
		const host = safeHost(hostRaw);
		const letter = (letterRaw.trim()[0] || host?.[0] || "?").toUpperCase();
		if (host) try {
			const remote = await fetch(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`, {
				signal: AbortSignal.timeout(1200),
				redirect: "follow"
			});
			if (remote.ok) {
				const buf = await remote.arrayBuffer();
				if (buf.byteLength > 32) {
					const type = remote.headers.get("content-type") || "image/x-icon";
					if (type.startsWith("image/")) return new Response(buf, { headers: {
						"content-type": type,
						"cache-control": "public, max-age=86400"
					} });
				}
			}
		} catch {}
		return new Response(monogramSvg(letter), { headers: {
			"content-type": "image/svg+xml; charset=utf-8",
			"cache-control": "public, max-age=86400"
		} });
	} } }
});
function safeHost(raw) {
	const host = raw.trim().toLowerCase().replace(/^www\./, "");
	if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host)) return null;
	if (host.length > 253) return null;
	return host;
}
function monogramSvg(letter) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" fill="#e3dac8"/><text x="32" y="42" text-anchor="middle" font-size="32" font-family="Georgia, 'Iowan Old Style', serif" fill="#1c1712">${/[A-Z0-9]/.test(letter) ? letter : "?"}</text></svg>`;
}
var $$splitComponentImporter$3 = () => import("./checkout._orderId-DFdwxn9I.mjs");
var Route$3 = createFileRoute("/$site/checkout/$orderId")({
	loader: ({ params }) => getOrder({ data: { orderId: params.orderId } }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./listing._id-CofHYszM.mjs");
var Route$2 = createFileRoute("/$site/listing/$id")({
	loader: ({ params }) => getListing({ data: { id: params.id } }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./manage._token-BRH4_vHU.mjs");
var Route$1 = createFileRoute("/$site/manage/$token")({
	loader: ({ params }) => getManaged({ data: { token: params.token } }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./cashfree-B25wewec.mjs");
var Route = createFileRoute("/api/webhooks/cashfree")({
	component: lazyRouteComponent($$splitComponentImporter, "component"),
	server: { handlers: { POST: async ({ request }) => {
		const rawBody = await request.text();
		if (!verifyCashfreeWebhook({
			signature: request.headers.get("x-webhook-signature"),
			timestamp: request.headers.get("x-webhook-timestamp"),
			rawBody
		})) return new Response("invalid signature", { status: 401 });
		let body = {};
		try {
			body = JSON.parse(rawBody);
		} catch {
			return new Response("invalid json", { status: 400 });
		}
		const type = String(body.type ?? body.event ?? "");
		const data = body.data ?? body;
		const order = data.order ?? data;
		const payment = data.payment ?? {};
		const status = String(payment.payment_status ?? order.order_status ?? body.order_status ?? "").toUpperCase();
		if (type && !(type === "PAYMENT_SUCCESS" || type === "ORDER_PAID" || type === "order.paid" || status === "SUCCESS" || status === "PAID")) return Response.json({
			ok: true,
			ignored: type
		});
		const orderId = String(order.order_id ?? order.orderId ?? body.order_id ?? "");
		if (!orderId) return new Response("missing order", { status: 400 });
		try {
			await confirmPayment({ data: { orderId } });
		} catch (err) {
			const message = err instanceof Error ? err.message : "settle failed";
			return Response.json({
				ok: false,
				error: message
			}, { status: 409 });
		}
		return Response.json({
			ok: true,
			gateway: "cashfree"
		});
	} } }
});
var IndexRoute = Route$15.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$16
});
var SiteRoute = Route$14.update({
	id: "/$site",
	path: "/$site",
	getParentRoute: () => Route$16
});
var SpecRoute = Route$13.update({
	id: "/spec",
	path: "/spec",
	getParentRoute: () => Route$16
});
var SiteIndexRoute = Route$12.update({
	id: "/",
	path: "/",
	getParentRoute: () => SiteRoute
});
var SiteActivityRoute = Route$11.update({
	id: "/activity",
	path: "/activity",
	getParentRoute: () => SiteRoute
});
var SiteBidRoute = Route$10.update({
	id: "/bid",
	path: "/bid",
	getParentRoute: () => SiteRoute
});
var SiteContactRoute = Route$9.update({
	id: "/contact",
	path: "/contact",
	getParentRoute: () => SiteRoute
});
var SitePrivacyRoute = Route$8.update({
	id: "/privacy",
	path: "/privacy",
	getParentRoute: () => SiteRoute
});
var SiteRefundRoute = Route$7.update({
	id: "/refund",
	path: "/refund",
	getParentRoute: () => SiteRoute
});
var SiteRulesRoute = Route$6.update({
	id: "/rules",
	path: "/rules",
	getParentRoute: () => SiteRoute
});
var SiteTermsRoute = Route$5.update({
	id: "/terms",
	path: "/terms",
	getParentRoute: () => SiteRoute
});
var ApiFaviconRoute = Route$4.update({
	id: "/api/favicon",
	path: "/api/favicon",
	getParentRoute: () => Route$16
});
var SiteCheckoutOrderIdRoute = Route$3.update({
	id: "/checkout/$orderId",
	path: "/checkout/$orderId",
	getParentRoute: () => SiteRoute
});
var SiteListingIdRoute = Route$2.update({
	id: "/listing/$id",
	path: "/listing/$id",
	getParentRoute: () => SiteRoute
});
var SiteManageTokenRoute = Route$1.update({
	id: "/manage/$token",
	path: "/manage/$token",
	getParentRoute: () => SiteRoute
});
var ApiWebhooksCashfreeRoute = Route.update({
	id: "/api/webhooks/cashfree",
	path: "/api/webhooks/cashfree",
	getParentRoute: () => Route$16
});
var SiteRouteChildren = {
	SiteActivityRoute,
	SiteBidRoute,
	SiteContactRoute,
	SitePrivacyRoute,
	SiteRefundRoute,
	SiteRulesRoute,
	SiteTermsRoute,
	SiteIndexRoute,
	SiteCheckoutOrderIdRoute,
	SiteListingIdRoute,
	SiteManageTokenRoute
};
var rootRouteChildren = {
	IndexRoute,
	SiteRoute: SiteRoute._addFileChildren(SiteRouteChildren),
	SpecRoute,
	ApiFaviconRoute,
	ApiWebhooksCashfreeRoute
};
var routeTree = Route$16._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { getOrder as C, trackView as E, getManaged as S, trackClick as T, confirmPayment as _, Route$5 as a, getBoard as b, Route$8 as c, Route$11 as d, Route$12 as f, readMode as g, applyMode as h, Route$3 as i, Route$9 as l, Route$15 as m, Route$1 as n, Route$6 as o, Route$14 as p, Route$2 as r, Route$7 as s, router_exports as t, Route$10 as u, createBidOrder as v, quoteBid as w, getListing as x, createSwapOrder as y };
