import { useEffect, type ReactNode } from "react";
import { pageTitleFor, product, PRODUCT_KEYS, type ProductKey } from "@/lib/host";
import { ModeToggle } from "@/components/mode-toggle";
import { LegalLinks } from "@/components/legal-links";

/**
 * The host-aware page shell (replaces the legacy SiteShell): product-themed
 * header + honest footer. No board navigation — Phase 00 surfaces have no
 * marketplace, and unknown hosts fall back to the bidthrone umbrella.
 */
export function ProductShell({
  site,
  children,
}: {
  site: ProductKey;
  children: ReactNode;
}) {
  const cfg = product(site);
  const others = PRODUCT_KEYS.filter((key) => key !== site);

  // Client-side head sync: after hydration (and on SPA navigation between the
  // page and the legal routes) make the tab title match what the deployed
  // SEO middleware already emitted into the SSR HTML. A no-op on first load
  // of a deployed page; in dev it upgrades the static umbrella title.
  useEffect(() => {
    const path = window.location.pathname;
    const title = pageTitleFor(site, path);
    document.title = title;
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", title);
  }, [site]);

  return (
    <div data-theme={cfg.theme ?? undefined} className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b-2 border-fg/20 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-5">
          <a
            href={`https://${cfg.apex}/`}
            className="font-display-site text-lg tracking-tight"
          >
            {cfg.wordmark}
          </a>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs uppercase tracking-kicker text-subtle sm:inline">
              coming next
            </span>
            <ModeToggle variant="inline" />
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
                href={`https://${product(key).apex}/`}
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
