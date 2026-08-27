import { useEffect, useState, type ReactNode } from "react";
import { pageTitleFor, product, PRODUCT_KEYS, linkOrigin, type ProductKey } from "@/lib/host";
import { ModeToggle } from "@/components/mode-toggle";
import { LegalLinks } from "@/components/legal-links";
import { signOut } from "@/lib/auth-client";

/**
 * The host-aware page shell (RC1, R5): product-themed header + footer.
 *
 * The header is now an OPERATIONAL marketplace shell, not a pre-launch one:
 *  - product navigation is driven by the capability matrix (each product
 *    shows only the surfaces it actually serves);
 *  - it is auth-aware: anonymous visitors get "Sign in"; members get
 *    Dashboard + their handle + sign out;
 *  - the theme toggle stays a compact secondary control.
 *
 * `me` is optional and comes from the route loader's shared shell context
 * (server-fetched, never client-supplied). Pages that don't pass it render
 * the anonymous nav (safe: no PII is leaked either way).
 */

/** Paths whose tab title the shell may manage; everything else leaves it alone. */
const TITLE_OWNED_PATHS = new Set(["", "/", "/terms", "/privacy", "/refund", "/contact"]);

export type ShellMe = {
  id: string;
  name: string;
  handle: string | null;
  emailVerified: boolean;
  role: string;
};

/** Product nav entries, from the capability matrix (RC1, R4). */
function navFor(site: ProductKey): { label: string; href: string }[] {
  switch (site) {
    case "foundersbid":
      return [
        { label: "Bounties", href: "/bounties" },
        { label: "Projects", href: "/projects" },
        { label: "Graveyard", href: "/graveyard" },
      ];
    case "culturebid":
      return [{ label: "Creative bounties", href: "/bounties" }];
    case "bidception":
      return [{ label: "Parent work", href: "/bidception" }];
    case "bidthrone":
      return [
        { label: "Leaderboards", href: "/leaderboards" },
        { label: "Bid Index", href: "/bid-index" },
      ];
  }
}

export function ProductShell({
  site,
  me,
  children,
}: {
  site: ProductKey;
  me?: ShellMe | null;
  children: ReactNode;
}) {
  const cfg = product(site);
  const others = PRODUCT_KEYS.filter((key) => key !== site);
  const nav = navFor(site);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (TITLE_OWNED_PATHS.has(path)) {
      const title = pageTitleFor(site, path);
      document.title = title;
      document
        .querySelector('meta[property="og:title"]')
        ?.setAttribute("content", title);
    }
    if (cfg.theme) document.documentElement.setAttribute("data-theme", cfg.theme);
    else document.documentElement.removeAttribute("data-theme");
  }, [site, cfg.theme]);

  return (
    <div data-theme={cfg.theme ?? undefined} className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b-2 border-fg/20 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href={`${linkOrigin(site)}/`}
              className="shrink-0 font-display-site text-lg tracking-tight"
            >
              {cfg.wordmark}
            </a>
            {/* desktop product nav */}
            <nav aria-label="Product" className="hidden items-center gap-1 md:flex">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2.5 py-1 text-sm text-muted transition-colors hover:text-fg"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {me ? (
              <>
                <a
                  href="/dashboard"
                  className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium sm:inline-flex"
                >
                  <span className="max-w-28 truncate">{me.name}</span>
                  <span className="rounded bg-raised px-1 text-xs text-muted">Dashboard</span>
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    window.location.assign("/");
                  }}
                  className="hidden rounded-md px-2 py-1 text-sm text-muted hover:text-fg sm:block"
                >
                  Sign out
                </button>
              </>
            ) : (
              <a
                href="/signin"
                className="hidden rounded-md px-2 py-1 text-sm font-medium hover:text-fg sm:block"
              >
                Sign in
              </a>
            )}
            <a
              href={site === "foundersbid" ? "/bounties/new" : site === "culturebid" ? "/bounties/new" : site === "bidception" ? "/bidception/new" : "/signup"}
              className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-fg"
              data-testid="primary-cta"
            >
              {site === "bidthrone" ? "Create account" : "Post work"}
            </a>
            <ModeToggle variant="icon" />
            {/* mobile menu toggle */}
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border-2 border-fg/20 md:hidden"
            >
              <span className="text-sm">{menuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* mobile nav */}
        {menuOpen ? (
          <div className="border-t-2 border-fg/10 bg-surface px-4 py-3 md:hidden">
            <nav aria-label="Mobile product" className="flex flex-col gap-1">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-2 py-1.5 text-sm"
                >
                  {item.label}
                </a>
              ))}
              {me ? (
                <>
                  <a href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-1.5 text-sm">
                    Dashboard{me.handle ? ` (@${me.handle})` : ""}
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      window.location.assign("/");
                    }}
                    className="rounded-md px-2 py-1.5 text-left text-sm text-muted"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <a href="/signin" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-1.5 text-sm">
                  Sign in
                </a>
              )}
            </nav>
          </div>
        ) : null}
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
