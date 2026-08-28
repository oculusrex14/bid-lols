import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { ChevronDown, Circle, List } from "lucide-react";
import { pageTitleFor, product, PRODUCT_KEYS, linkOrigin, THEME_COLORS, type ProductKey } from "@/lib/host";
import { readMode, type Mode } from "@/lib/mode";
import { ModeToggle } from "@/components/mode-toggle";
import { LegalLinks } from "@/components/legal-links";
import { signOut } from "@/lib/auth-client";

/**
 * The host-aware page shell (RC1, R5; RC3, S-7.3/S-8).
 *
 * Operational marketplace shell:
 *  - product navigation is driven by the capability matrix; Blog lives in
 *    the footer (secondary content, not a primary marketplace slot — RC3);
 *  - active route gets a visible state + aria-current="page";
 *  - the header CTA responds to auth (no "Create account" for members);
 *  - a compact Network switcher makes the four products one mental model
 *    (cross-domain links use the canonical origins; host-only sessions are
 *    not faked as shared ones — the account copy says so honestly);
 *  - skip-to-content link for keyboard users.
 */

/** Paths whose tab title the shell may manage; everything else leaves it alone. */
const TITLE_OWNED_PATHS = new Set(["", "/", "/blog", "/post", "/terms", "/privacy", "/refund", "/contact"]);

export type ShellMe = {
  id: string;
  name: string;
  handle: string | null;
  emailVerified: boolean;
  role: string;
};

/** Primary nav = actual marketplace actions (RC3: Blog moved to the footer). */
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
      return [{ label: "Team projects", href: "/bidception" }];
    case "bidthrone":
      return [
        { label: "Leaderboards", href: "/leaderboards" },
        { label: "Bid Index", href: "/bid-index" },
      ];
  }
}

/** Header CTA per product; auth-aware (RC3, S-7.3). */
function ctaFor(site: ProductKey, me: ShellMe | null | undefined): { label: string; href: string } {
  if (site === "bidthrone") {
    if (me) {
      return me.handle
        ? { label: "My profile", href: `/profile/${me.handle}` }
        : { label: "Dashboard", href: "/dashboard" };
    }
    return { label: "Create account", href: "/signup" };
  }
  switch (site) {
    case "bidception":
      return { label: "Start a project", href: "/bidception/new" };
    case "culturebid":
      return { label: "Post a brief", href: "/bounties/new" };
    case "foundersbid":
    default:
      return { label: "Post work", href: "/post" };
  }
}

function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function syncThemeColor(site: ProductKey): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const colors = THEME_COLORS[site] ?? THEME_COLORS.bidthrone;
  const mode: Mode = readMode();
  meta.setAttribute("content", mode === "dark" ? colors.dark : colors.light);
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
  const cta = ctaFor(site, me);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const switchRef = useRef<HTMLDivElement>(null);
  const pathname = useLocation().pathname;

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
    syncThemeColor(site);
  }, [site, cfg.theme]);

  // RC3, S-38: keep the browser chrome color in step with the dark-mode
  // toggle (the SSR value is the product's light color).
  useEffect(() => {
    const onMode = () => syncThemeColor(site);
    window.addEventListener("bidlol:mode", onMode);
    return () => window.removeEventListener("bidlol:mode", onMode);
  }, [site]);

  // Close the network switcher on outside click / Escape.
  useEffect(() => {
    if (!switchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSwitchOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (switchRef.current && !switchRef.current.contains(e.target as Node)) setSwitchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [switchOpen]);

  return (
    <div data-theme={cfg.theme ?? undefined} className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-raised focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-10 border-b-2 border-fg/20 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {/* Network switcher (RC3, S-8): the four products, one model. */}
            <div ref={switchRef} className="relative shrink-0">
              <button
                type="button"
                aria-expanded={switchOpen}
                aria-haspopup="menu"
                onClick={() => setSwitchOpen((v) => !v)}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
              >
                <List className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Bid Network</span>
                <ChevronDown className={`size-3.5 transition-transform ${switchOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {switchOpen ? (
                <div
                  role="menu"
                  aria-label="Bid Network products"
                  className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border-2 border-fg/15 bg-surface p-1 shadow-sm"
                >
                  {PRODUCT_KEYS.map((key) => (
                    <a
                      key={key}
                      role="menuitem"
                      href={`${linkOrigin(key)}/`}
                      onClick={() => setSwitchOpen(false)}
                      className={`flex items-start gap-2 rounded px-2.5 py-2 text-sm hover:bg-raised ${key === site ? "font-medium" : "text-muted"}`}
                    >
                      <Circle className={`mt-1 size-1.5 shrink-0 ${key === site ? "fill-accent text-accent" : "fill-transparent"}`} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block">{product(key).name}</span>
                        <span className="block truncate text-xs text-subtle">{product(key).oneLine}</span>
                      </span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <a href={`${linkOrigin(site)}/`} className="shrink-0 font-display-site text-lg tracking-tight">
              {cfg.wordmark}
            </a>
            {/* desktop product nav */}
            <nav aria-label="Product" className="hidden items-center gap-1 md:flex">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isNavActive(pathname, item.href) ? "page" : undefined}
                  className={`rounded-md px-2.5 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
                    isNavActive(pathname, item.href)
                      ? "font-semibold text-accent underline decoration-2 underline-offset-8"
                      : "text-muted hover:text-fg"
                  }`}
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
              href={cta.href}
              className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-fg focus-visible:outline-2 focus-visible:outline-ring"
              data-testid="primary-cta"
            >
              {cta.label}
            </a>
            <ModeToggle variant="icon" />
            {/* mobile menu toggle */}
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label="Menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border-2 border-fg/20 md:hidden"
            >
              <span className="text-sm" aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
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
                  aria-current={isNavActive(pathname, item.href) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-md px-2 py-2.5 text-sm ${isNavActive(pathname, item.href) ? "font-semibold text-accent" : ""}`}
                >
                  {item.label}
                </a>
              ))}
              <div className="my-2 border-t border-border" role="presentation" />
              <p className="px-2 pb-1 text-xs font-medium uppercase tracking-kicker text-subtle">The Bid Network</p>
              {others.map((key) => (
                <a
                  key={key}
                  href={`${linkOrigin(key)}/`}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md px-2 py-2 text-sm text-muted"
                >
                  {product(key).name} <span className="text-xs text-subtle">· {product(key).oneLine}</span>
                </a>
              ))}
              {me ? (
                <>
                  <a href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm">
                    Dashboard{me.handle ? ` (@${me.handle})` : ""}
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      setMenuOpen(false);
                      await signOut();
                      window.location.assign("/");
                    }}
                    className="rounded-md px-2 py-2 text-left text-sm text-muted"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <a href="/signin" onClick={() => setMenuOpen(false)} className="rounded-md px-2 py-2 text-sm">
                  Sign in
                </a>
              )}
              <a
                href="/blog"
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-muted"
              >
                {cfg.name} blog
              </a>
            </nav>
          </div>
        ) : null}
      </header>

      <main id="content" className="flex-1">{children}</main>

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
            <a
              href="/blog"
              className="inline-flex items-center gap-1 underline-offset-4 hover:text-muted hover:underline"
            >
              {cfg.name} blog
            </a>
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
