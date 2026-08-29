import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { ChevronDown, Circle, List } from "lucide-react";
import { pageTitleFor, product, PRODUCT_KEYS, linkOrigin, THEME_COLORS, type ProductKey } from "@/lib/host";
import { readMode, type Mode } from "@/lib/mode";
import { ModeToggle } from "@/components/mode-toggle";
import { LegalLinks } from "@/components/legal-links";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

/**
 * The host-aware page shell — the Network Spine header/footer (RC3, S-8/S-7.3).
 *
 * One shell, four skins:
 *  - primary navigation = actual marketplace actions (capability matrix);
 *    Blog is secondary (footer + mobile menu), never a primary slot;
 *  - active route: accent underline + aria-current="page";
 *  - header CTA responds to auth (no "Create account" for members);
 *  - compact Network switcher: the four products as one mental model,
 *    cross-domain links on canonical origins — host-only sessions are not
 *    faked as shared ones;
 *  - skip-to-content link; visible focus everywhere; 44px mobile targets.
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

  const navLinkClass = (item: { label: string; href: string }) =>
    cn(
      "rounded-sm px-2.5 py-1.5 text-sm transition-colors duration-150",
      isNavActive(pathname, item.href)
        ? "font-semibold text-accent underline decoration-2 underline-offset-8"
        : "text-muted hover:text-fg",
    );

  return (
    <div data-theme={cfg.theme ?? undefined} className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-raised focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-10 border-b border-fg/10 bg-surface/95 backdrop-blur">
        <div className="canvas-wide flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <NetworkSwitcher site={site} switchOpen={switchOpen} onToggle={() => setSwitchOpen((v) => !v)} onNavigate={() => setSwitchOpen(false)} switchRef={switchRef} />

            <a
              href={`${linkOrigin(site)}/`}
              className={cn("shrink-0 font-display-site text-lg tracking-tight", site === "bidthrone" && "text-accent")}
            >
              {cfg.wordmark}
            </a>

            {/* desktop product nav */}
            <nav aria-label="Product" className="hidden items-center gap-1 md:flex">
              {nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isNavActive(pathname, item.href) ? "page" : undefined}
                  className={navLinkClass(item)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <AccountArea me={me} cta={cta} menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
          </div>
        </div>

        <MobileNav
          cfg={cfg}
          nav={nav}
          others={others}
          me={me}
          pathname={pathname}
          menuOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
      </header>

      <main id="content" className="flex-1">{children}</main>

      <ShellFooter cfg={cfg} others={others} />
    </div>
  );
}

/** Mobile navigation (RC3): primary product links, the network group, account
 *  state, and the blog — secondary surfaces stay out of the primary slots. */
function MobileNav({
  cfg,
  nav,
  others,
  me,
  pathname,
  menuOpen,
  onClose,
}: {
  cfg: ReturnType<typeof product>;
  nav: { label: string; href: string }[];
  others: ProductKey[];
  me: ShellMe | null | undefined;
  pathname: string;
  menuOpen: boolean;
  onClose: () => void;
}) {
  if (!menuOpen) return null;
  return (
    <div className="border-t border-fg/10 bg-surface px-4 py-3 md:hidden">
      <nav aria-label="Mobile product" className="flex flex-col gap-0.5">
        {nav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={isNavActive(pathname, item.href) ? "page" : undefined}
            onClick={onClose}
            className={cn(
              "rounded-sm px-2 py-2.5 text-sm",
              isNavActive(pathname, item.href) && "font-semibold text-accent",
            )}
          >
            {item.label}
          </a>
        ))}
        <div className="my-2 border-t border-fg/10" role="presentation" />
        <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-kicker text-subtle">The Bid Network</p>
        {others.map((key) => (
          <a
            key={key}
            href={`${linkOrigin(key)}/`}
            onClick={onClose}
            className="rounded-sm px-2 py-2 text-sm text-muted"
          >
            {product(key).name} <span className="text-xs text-subtle">· {product(key).oneLine}</span>
          </a>
        ))}
        {me ? (
          <>
            <a href="/dashboard" onClick={onClose} className="rounded-sm px-2 py-2 text-sm">
              Dashboard{me.handle ? ` (@${me.handle})` : ""}
            </a>
            <button
              type="button"
              onClick={async () => {
                onClose();
                await signOut();
                window.location.assign("/");
              }}
              className="rounded-sm px-2 py-2 text-left text-sm text-muted"
            >
              Sign out
            </button>
          </>
        ) : (
          <a href="/signin" onClick={onClose} className="rounded-sm px-2 py-2 text-sm">
            Sign in
          </a>
        )}
        <a
          href="/blog"
          onClick={onClose}
          className="rounded-sm px-2 py-2 text-sm text-muted"
        >
          {cfg.name} blog
        </a>
      </nav>
    </div>
  );
}

/** The network footer: other products, blog, contact, legal. */
function ShellFooter({ cfg, others }: { cfg: ReturnType<typeof product>; others: ProductKey[] }) {
  return (
        <footer className="mt-16 border-t border-fg/10 bg-surface">
          <div className="canvas-wide flex flex-col gap-5 py-8">
            <p className="text-sm text-muted">
              {cfg.apex} · {cfg.kicker}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {others.map((key) => (
                <a key={key} href={`${linkOrigin(key)}/`} className="text-muted hover:text-fg hover:underline hover:underline-offset-4">
                  {product(key).name}
                </a>
              ))}
              <a href="/blog" className="text-muted hover:text-fg hover:underline hover:underline-offset-4">
                {cfg.name} blog
              </a>
            </div>
            <div className="border-t border-fg/10 pt-5">
              <p className="text-sm text-muted">
                Contact{" "}
                <a href={`mailto:${cfg.contactEmail}`} className="hover:underline hover:underline-offset-4">
                  {cfg.contactEmail}
                </a>
              </p>
              <LegalLinks className="mt-4" />
            </div>
          </div>
        </footer>
  );
}

/** Network switcher (RC3, S-8): the four products as one mental model. */
function NetworkSwitcher({
  site,
  switchOpen,
  onToggle,
  onNavigate,
  switchRef,
}: {
  site: ProductKey;
  switchOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  switchRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
              <div ref={switchRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-expanded={switchOpen}
                  aria-haspopup="menu"
                  onClick={onToggle}
                  className="flex h-9 items-center gap-1 rounded-sm px-1.5 text-xs font-medium text-subtle transition-colors duration-150 hover:text-fg"
                >
                  <List className="size-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Bid Network</span>
                  <ChevronDown
                    className={cn("size-3.5 transition-transform duration-150", switchOpen && "rotate-180")}
                    aria-hidden="true"
                  />
                </button>
                {switchOpen ? (
                  <div
                    role="menu"
                    aria-label="Bid Network products"
                    className="absolute left-0 top-full z-20 mt-1.5 w-72 rounded-md border border-fg/15 bg-surface p-1 shadow-lg"
                  >
                    {PRODUCT_KEYS.map((key) => (
                      <a
                        key={key}
                        role="menuitem"
                        href={`${linkOrigin(key)}/`}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-start gap-2 rounded-sm px-2.5 py-2 text-sm transition-colors duration-150 hover:bg-raised/70",
                          key === site ? "font-medium text-fg" : "text-muted",
                        )}
                      >
                        <Circle
                          className={cn("mt-1 size-1.5 shrink-0", key === site ? "fill-accent text-accent" : "fill-transparent")}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block">{product(key).name}</span>
                          <span className="block truncate text-xs text-subtle">{product(key).oneLine}</span>
                        </span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
  );
}

/** Account area: auth-aware identity, product CTA, theme + menu toggles. */
function AccountArea({
  me,
  cta,
  menuOpen,
  onToggleMenu,
}: {
  me: ShellMe | null | undefined;
  cta: { label: string; href: string };
  menuOpen: boolean;
  onToggleMenu: () => void;
}) {
  return (
    <>
                {me ? (
                  <>
                    <a
                      href="/dashboard"
                      className="hidden items-center gap-1.5 rounded-sm px-2 py-1 text-sm font-medium hover:bg-raised/60 sm:inline-flex"
                    >
                      <span className="max-w-28 truncate">{me.name}</span>
                      <span className="rounded bg-raised px-1.5 py-0.5 text-xs text-muted">Dashboard</span>
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        window.location.assign("/");
                      }}
                      className="hidden rounded-sm px-2 py-1 text-sm text-muted transition-colors duration-150 hover:text-fg sm:block"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <a
                    href="/signin"
                    className="hidden rounded-sm px-2 py-1 text-sm font-medium text-muted transition-colors duration-150 hover:text-fg sm:block"
                  >
                    Sign in
                  </a>
                )}
                <a
                  href={cta.href}
                  className="inline-flex h-9 items-center rounded-sm bg-accent px-3.5 text-sm font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent/90"
                  data-testid="primary-cta"
                >
                  {cta.label}
                </a>
                <ModeToggle variant="icon" />
                {/* mobile menu toggle */}
                <button
                  type="button"
                  aria-expanded={menuOpen}
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  onClick={onToggleMenu}
                  className="inline-flex size-10 items-center justify-center rounded-sm border border-fg/20 md:hidden"
                >
                  <span className="text-sm" aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
                </button>
    </>
  );
}
