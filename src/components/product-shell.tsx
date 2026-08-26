import { useEffect, type ReactNode } from "react";
import { pageTitleFor, product, PRODUCT_KEYS, linkOrigin, type ProductKey } from "@/lib/host";
import { ModeToggle } from "@/components/mode-toggle";
import { LegalLinks } from "@/components/legal-links";

/**
 * The host-aware page shell: product-themed header + footer.
 *
 * Phase 00.5 (WS4/WS5):
 *  - the founding-access CTA is the header's PRIMARY action; the theme
 *    control is a compact secondary icon (AC-4.1).
 *  - cross-product links use `linkOrigin` — culturebid.lol's apex DNS is
 *    misconfigured, so visitors are sent to www.culturebid.lol until it is
 *    verified reachable (AC-5.2).
 *  - client title sync only for known paths: the 404 page owns its own
 *    title, and unknown paths must not be retitled to the home page
 *    (AC-6.4).
 */

/** Paths whose tab title the shell may manage; everything else (e.g. an
 *  unknown route) leaves the title alone. */
const TITLE_OWNED_PATHS = new Set(["", "/", "/terms", "/privacy", "/refund", "/contact"]);

export function ProductShell({
  site,
  children,
}: {
  site: ProductKey;
  children: ReactNode;
}) {
  const cfg = product(site);
  const others = PRODUCT_KEYS.filter((key) => key !== site);

  // Client-side head sync after hydration (and on SPA navigation): make the
  // tab title match what the deployed SEO middleware emitted for known
  // paths. A no-op on first load of a deployed known page.
  useEffect(() => {
    const path = window.location.pathname;
    if (TITLE_OWNED_PATHS.has(path)) {
      const title = pageTitleFor(site, path);
      document.title = title;
      document
        .querySelector('meta[property="og:title"]')
        ?.setAttribute("content", title);
    }
    // Theme on <html> so the body background stays product-themed across
    // SPA navigations (the 404 page manages the same attribute).
    if (cfg.theme) document.documentElement.setAttribute("data-theme", cfg.theme);
    else document.documentElement.removeAttribute("data-theme");
  }, [site, cfg.theme]);

  return (
    <div data-theme={cfg.theme ?? undefined} className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b-2 border-fg/20 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <a
            href={`${linkOrigin(site)}/`}
            className="font-display-site text-lg tracking-tight"
          >
            {cfg.wordmark}
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="/#access"
              className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-fg sm:px-4"
            >
              Founding access
            </a>
            <ModeToggle variant="icon" />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t-2 border-fg/20 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-5">
          <p className="text-sm text-muted">
            {cfg.apex} · {cfg.kicker}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {others.map((key) => (
              <a
                key={key}
                href={`${linkOrigin(key)}/`}
                className="inline-flex items-center gap-1 underline-offset-4 hover:text-muted hover:underline"
              >
                {product(key).name}
              </a>
            ))}
          </div>
          <div className="border-t border-border pt-5">
            <p className="text-sm text-muted">
              Contact{" "}
              <a
                href={`mailto:${cfg.contactEmail}`}
                className="underline-offset-4 hover:underline"
              >
                {cfg.contactEmail}
              </a>
            </p>
            <LegalLinks className="mt-4" />
          </div>
        </div>
      </footer>
    </div>
  );
}
