import { useEffect, useState } from "react";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { MODE_BOOT_SCRIPT, readMode, type Mode } from "@/lib/mode";
import { PORTAL } from "@/lib/sites";
import appCss from "../styles.css?url";

const APP_NAME = PORTAL.domain;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "bidthrone.lol — three pay-to-rank boards. Foundersbid, culturebid, bidception. Highest bid ranks first.",
      },
      { name: "theme-color", content: "#f4efe4" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
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
    <html lang="en" className="antialiased" data-mode={mode} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="min-h-screen bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
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
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
