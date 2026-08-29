import { useEffect } from "react";
import { linkOrigin, product, PRODUCT_KEYS } from "@/lib/host";
import { ButtonLink } from "@/components/ui/button";

/**
 * Branded not-found page (Phase 00.5, AC-6.4). Wired as the router's
 * `defaultNotFoundComponent` in src/router.tsx.
 *
 * Deliberately host-neutral in the rendered body: the HTTP status (404), the
 * per-domain theme, the branded title, and the `noindex,follow` robots meta
 * are all provided by the deployed runtime — server/middleware/seo-host.ts
 * injects the theme + not-found head set on 404 responses (shared logic in
 * scripts/host-seo-shared.mjs). The effects below cover the cases where that
 * middleware is absent (Vite dev) or the user navigated here client-side:
 * tab title + theme, derived from window.location.host (never from props).
 */
export function NotFoundPage() {
  useEffect(() => {
    const key =
      PRODUCT_KEYS.find((k) =>
        [product(k).apex, `www.${product(k).apex}`].includes(
          window.location.host.toLowerCase().replace(/:\d+$/, ""),
        ),
      ) ?? "bidthrone";
    // The deployed middleware already set the correct per-domain title for
    // SSR'd 404s — only fix it when that pass did not happen (dev server, or
    // a client-side navigation to an unknown route).
    if (!document.title.startsWith("Page not found: ")) {
      document.title = `Page not found: ${product(key).name}`;
    }
    const theme = product(key).theme;
    if (theme && document.documentElement.getAttribute("data-theme") !== theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, []);

  return (
    <div className="canvas-prose flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="font-mono text-sm text-subtle">404</p>
      <h1 className="mt-3 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
        This page does not exist.
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
        The address you followed is not a page on the Bid Network. It may be a
        typo, a link that moved before launch, or a path that simply was never
        here.
      </p>

      <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {PRODUCT_KEYS.map((key) => (
          <a
            key={key}
            href={`${linkOrigin(key)}/`}
            className="underline-offset-4 hover:text-muted hover:underline"
          >
            {product(key).name}
          </a>
        ))}
      </div>

      <ButtonLink href="/" size="md" className="mt-10">
        Back to home
      </ButtonLink>
    </div>
  );
}
