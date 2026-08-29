import { useEffect, useState } from "react";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { MODE_BOOT_SCRIPT, readMode, type Mode } from "@/lib/mode";
import { currentProductKey, product, type ProductKey } from "@/lib/host";
import appCss from "../styles.css?url";

/**
 * Document shell. The route head intentionally carries NO title /
 * description / canonical / OG: those are host-aware and injected per-domain
 * by server/middleware/seo-host.ts (prod+preview) and
 * scripts/host-seo-plugin.mjs (dev) from scripts/host-seo-shared.mjs.
 *
 * The product skin (`data-theme`) is resolved per request and rendered on
 * <html> at SSR: the CSS themes html itself (light: [data-theme=…], dark:
 * html[data-mode="dark"][data-theme=…]), so the page background, header and
 * footer all carry the product palette from first paint. No flash of the
 * default (bidthrone) skin, in light or dark.
 */
export const Route = createRootRoute({
  loader: async () => ({ productKey: await currentProductKey() }) as { productKey: ProductKey },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Static, umbrella-level defaults (React-managed, hydration-safe).
      // On deployed runtimes the host-aware SEO middleware replaces these
      // per-domain (scripts/host-seo-shared.mjs); in dev they stand as-is.
      { title: "The Bid Network: an internet bounty network" },
      {
        name: "description",
        content:
          "The Bid Network is an internet bounty network across foundersbid.lol, culturebid.lol, and bidception.lol, with bidthrone.lol as its reputation and discovery layer.",
      },
      // Umbrella default only. On deployed runtimes the host-aware SEO
      // middleware replaces this per product (RC3, S-38); in dev it stands
      // as the bidthrone (default product) light color.
      { name: "theme-color", content: "#f1f2f4" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  const { productKey } = Route.useLoaderData();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2500,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );
  const [mode, setMode] = useState<Mode>("light");
  useEffect(() => {
    const current = readMode();
    setMode(current);
    const onMode = (event: Event) => {
      const next = (event as CustomEvent<Mode>).detail;
      if (next === "light" || next === "dark") setMode(next);
    };
    window.addEventListener("bidlol:mode", onMode);
    return () => window.removeEventListener("bidlol:mode", onMode);
  }, []);

  return (
    <html
      lang="en"
      className="antialiased"
      data-mode={mode}
      data-theme={product(productKey).theme ?? undefined}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-bg text-fg">
        <QueryClientProvider client={queryClient}>
          <Outlet />
          <Toaster
            theme={mode}
            position="bottom-center"
            toastOptions={{
              style: {
                background: "var(--surface)",
                color: "var(--fg)",
                border: "1px solid var(--border)",
              },
            }}
          />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
