import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import {
  pageTitleFor,
  product,
  PRODUCT_KEYS,
  linkOrigin,
  THEME_COLORS,
  DEFAULT_THEME_MODE,
  type ProductKey,
} from "@/lib/host";
import { readMode, type Mode } from "@/lib/mode";
import { ModeToggle } from "@/components/mode-toggle";
import { LegalLinks } from "@/components/legal-links";
import { ProductMark, NetworkMark } from "@/components/brand/product-mark";
import { ButtonLink } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import type { FundingMode } from "@/lib/shell-context";
import { cn } from "@/lib/cn";

/**
 * The host-aware page shell (RC3 spine; RC5 §15-18 product-object pass).
 *
 * Desktop: 64px sticky header on the product header token, three-zone grid
 * (identity / product nav / account + CTA). Active nav = a subtle inset 2px
 * accent rule, never a thick pill. One mobile menu (44px targets) holds
 * product nav, the Bid Network group, account, appearance, and blog.
 *
 * The funding status chip is PUBLIC-SAFE: it is the moneyMode() string
 * threaded through the shell context (RC5 §18), never a capability read.
 *
 * RC3 invariants kept: capability nav (no fake surfaces), auth-aware CTA,
 * cross-domain links on canonical origins (no faked shared auth), skip link,
 * visible focus, one h1 per page.
 */

/** Paths whose tab title the shell may manage; everything else leaves it alone. */
const TITLE_OWNED_PATHS = new Set(["", "/", "/blog", "/post", "/terms", "/privacy", "/refund", "/contact"]);

/** Products with a marketplace surface where the funding chip applies. */
const MARKETPLACE_SITES = new Set<ProductKey>(["foundersbid", "culturebid", "bidception"]);

export type ShellMe = {
  id: string;
  name: string;
  handle: string | null;
  emailVerified: boolean;
  role: string;
};

/** Primary nav = actual marketplace actions (capability matrix). */
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
        { label: "Bid Index", href: "/bid-index" },
        { label: "Leaderboards", href: "/leaderboards" },
        { label: "Market rates", href: "/market-rates" },
      ];
  }
}

/** Header CTA per product; auth-aware (RC3, S-7.3; RC5 §23.2 for bidthrone). */
function ctaFor(site: ProductKey, me: ShellMe | null | undefined): { label: string; href: string } {
  if (site === "bidthrone") {
    if (me) {
      return me.handle
        ? { label: "My profile", href: `/profile/${me.handle}` }
        : { label: "Dashboard", href: "/dashboard" };
    }
    return { label: "Create your record", href: "/signup" };
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
  const fallback: Mode = DEFAULT_THEME_MODE[site] ?? "light";
  const mode: Mode = readMode(fallback);
  meta.setAttribute("content", mode === "dark" ? colors.dark : colors.light);
}

export function ProductShell({
  site,
  me,
  funding,
  children,
}: {
  site: ProductKey;
  me?: ShellMe | null;
  /** Public-safe moneyMode() (RC5 §18). Absent → no funding chip. */
  funding?: FundingMode;
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
  const showFundingChip = MARKETPLACE_SITES.has(site) && funding === "off";

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

  // Close the mobile menu on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-sm focus:bg-raised focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <ShellHeader
        site={site}
        cfg={cfg}
        nav={nav}
        cta={cta}
        others={others}
        me={me}
        pathname={pathname}
        showFundingChip={showFundingChip}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        onCloseMenu={() => setMenuOpen(false)}
        switchOpen={switchOpen}
        onToggleSwitch={() => setSwitchOpen((v) => !v)}
        onSwitchNavigate={() => setSwitchOpen(false)}
        switchRef={switchRef}
      />
      <main id="content" className="flex-1">{children}</main>
      <ShellFooter cfg={cfg} others={others} />
    </div>
  );
}

/**
 * The 64px sticky product header (RC5 §15): identity / product nav /
 * account + CTA on the product header token; ONE mobile menu button that
 * owns navigation, network, account, appearance, and blog (§17).
 */
function ShellHeader({
  site,
  cfg,
  nav,
  cta,
  others,
  me,
  pathname,
  showFundingChip,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  switchOpen,
  onToggleSwitch,
  onSwitchNavigate,
  switchRef,
}: {
  site: ProductKey;
  cfg: ReturnType<typeof product>;
  nav: { label: string; href: string }[];
  cta: { label: string; href: string };
  others: ProductKey[];
  me: ShellMe | null | undefined;
  pathname: string;
  showFundingChip: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  switchOpen: boolean;
  onToggleSwitch: () => void;
  onSwitchNavigate: () => void;
  switchRef: React.RefObject<HTMLDivElement | null>;
}) {
  const navLinkClass = (item: { label: string; href: string }) =>
    cn(
      "obj-nav",
      isNavActive(pathname, item.href)
        ? "obj-nav-active"
        : "text-[color:var(--header-fg-soft)] hover:text-[color:var(--header-fg)]",
    );
  return (
    <header className="obj-header sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="shell-header canvas-wide grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-4">
        {/* Left: identity. Mobile shows mark + wordmark only. */}
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <NetworkSwitcher
            site={site}
            switchOpen={switchOpen}
            onToggle={onToggleSwitch}
            onNavigate={onSwitchNavigate}
            switchRef={switchRef}
            hideOnMobile
          />
          <a
            href={`${linkOrigin(site)}/`}
            className="flex shrink-0 items-center gap-2 text-[color:var(--header-fg)] hover:text-[color:var(--header-fg)]"
          >
            <ProductMark site={site} size={28} />
            <span
              className={cn(
                "font-display-site text-lg tracking-tight",
                site === "bidthrone" && "text-accent",
              )}
            >
              {cfg.wordmark}
            </span>
          </a>
        </div>

        {/* Center: desktop product nav (absent on mobile, which has one menu). */}
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

        {/* Right: account + CTA (+ the one mobile menu button). */}
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          {showFundingChip ? <FundingChip /> : null}
          <AccountLinks me={me} />
          <ModeToggle variant="icon" fallbackMode={DEFAULT_THEME_MODE[site] ?? "light"} />
          <ButtonLink
            href={cta.href}
            className="h-9 px-3 sm:h-10 sm:px-3.5"
            data-testid="primary-cta"
          >
            {cta.label}
          </ButtonLink>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={onToggleMenu}
            className="inline-flex size-11 items-center justify-center rounded-sm text-[color:var(--header-fg-soft)] transition-colors duration-150 hover:text-[color:var(--header-fg)] md:hidden"
          >
            {menuOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <MobileMenu
          cfg={cfg}
          site={site}
          nav={nav}
          others={others}
          me={me}
          pathname={pathname}
          showFundingChip={showFundingChip}
          onClose={onCloseMenu}
        />
      ) : null}
    </header>
  );
}

/** RC5 §18: the quiet funding status chip (moneyMode === off only). */
function FundingChip() {
  return (
    <span
      className="obj-funding-chip hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium md:inline-flex"
      data-testid="funding-status"
      title="Funding is off in production: nothing on this network takes payment right now."
    >
      <span className="size-1.5 rounded-full bg-warn" aria-hidden="true" />
      Funding not live
    </span>
  );
}

/** Desktop account links (sign in / dashboard / sign out). */
function AccountLinks({ me }: { me: ShellMe | null | undefined }) {
  if (me) {
    return (
      <a
        href="/dashboard"
        className="hidden items-center gap-1.5 rounded-sm px-2 py-1 text-sm font-medium text-[color:var(--header-fg)] hover:bg-[color-mix(in_oklab,var(--header-fg)_10%,transparent)] sm:inline-flex"
      >
        <span className="max-w-28 truncate">{me.name}</span>
        <span className="rounded bg-[color-mix(in_oklab,var(--header-fg)_12%,transparent)] px-1.5 py-0.5 text-xs text-[color:var(--header-fg-soft)]">
          Dashboard
        </span>
      </a>
    );
  }
  return (
    <a
      href="/signin"
      className="hidden rounded-sm px-2 py-1 text-sm font-medium text-[color:var(--header-fg-soft)] transition-colors duration-150 hover:text-[color:var(--header-fg)] sm:block"
    >
      Sign in
    </a>
  );
}

/** One mobile menu: product nav, network, account, appearance, blog. */
function MobileMenu({
  cfg,
  site,
  nav,
  others,
  me,
  pathname,
  showFundingChip,
  onClose,
}: {
  cfg: ReturnType<typeof product>;
  site: ProductKey;
  nav: { label: string; href: string }[];
  others: ProductKey[];
  me: ShellMe | null | undefined;
  pathname: string;
  showFundingChip: boolean;
  onClose: () => void;
}) {
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
              "rounded-sm px-2 py-2.5 text-sm min-h-11",
              isNavActive(pathname, item.href)
                ? "font-semibold text-accent"
                : "text-fg hover:bg-raised/60",
            )}
          >
            {item.label}
          </a>
        ))}
        {showFundingChip ? (
          <span
            className="obj-funding-chip m-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-fg"
            data-testid="funding-status-mobile"
          >
            <span className="size-1.5 rounded-full bg-warn" aria-hidden="true" />
            Funding not live
          </span>
        ) : null}
        <div className="my-2 border-t border-fg/10" role="presentation" />
        <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-kicker text-subtle">The Bid Network</p>
        {PRODUCT_KEYS.map((key) => (
          <a
            key={key}
            href={`${linkOrigin(key)}/`}
            onClick={onClose}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-sm px-2 py-2 text-sm",
              key === site ? "font-medium text-fg" : "text-muted",
            )}
          >
            <ProductMark site={key} size={20} />
            <span>{product(key).name}</span>
            {key === site ? (
              <span className="ml-auto text-xs text-accent">you are here</span>
            ) : null}
          </a>
        ))}
        {me ? (
          <>
            <a href="/dashboard" onClick={onClose} className="min-h-11 rounded-sm px-2 py-2 text-sm">
              Dashboard{me.handle ? ` (@${me.handle})` : ""}
            </a>
            <button
              type="button"
              onClick={async () => {
                onClose();
                await signOut();
                window.location.assign("/");
              }}
              className="min-h-11 rounded-sm px-2 py-2 text-left text-sm text-muted"
            >
              Sign out
            </button>
          </>
        ) : (
          <a href="/signin" onClick={onClose} className="min-h-11 rounded-sm px-2 py-2 text-sm">
            Sign in
          </a>
        )}
        <a href="/blog" onClick={onClose} className="min-h-11 rounded-sm px-2 py-2 text-sm text-muted">
          {cfg.name} blog
        </a>
        <div className="my-2 border-t border-fg/10" role="presentation" />
        <div className="px-1">
          <ModeToggle variant="inline" />
        </div>
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

/**
 * Network switcher (RC3, S-8; RC5 §16): shared Bid Network mark + label +
 * compact dropdown of the four sibling products. Desktop only (mobile
 * carries the group inside the one menu). Cross-domain URLs use
 * linkOrigin(); the current product is clearly marked.
 */
function NetworkSwitcher({
  site,
  switchOpen,
  onToggle,
  onNavigate,
  switchRef,
  hideOnMobile,
}: {
  site: ProductKey;
  switchOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  switchRef: React.RefObject<HTMLDivElement | null>;
  hideOnMobile?: boolean;
}) {
  return (
    <div
      ref={switchRef}
      className={cn("relative shrink-0", hideOnMobile && "hidden md:block")}
    >
      <button
        type="button"
        aria-expanded={switchOpen}
        aria-haspopup="menu"
        onClick={onToggle}
        className="flex h-11 items-center gap-1.5 rounded-sm px-1.5 text-xs font-medium text-[color:var(--header-fg-soft)] transition-colors duration-150 hover:text-[color:var(--header-fg)]"
      >
        <NetworkMark size={20} />
        <span>Bid Network</span>
        <ChevronDown
          className={cn("size-3.5 transition-transform duration-150", switchOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {switchOpen ? (
        <div
          role="menu"
          aria-label="Bid Network products"
          className="absolute left-0 top-full z-40 mt-1.5 w-72 rounded-md border border-fg/15 bg-surface p-1 text-fg shadow-none"
        >
          <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-kicker text-subtle">
            The Bid Network
          </p>
          {PRODUCT_KEYS.map((key) => (
            <a
              key={key}
              role="menuitem"
              href={`${linkOrigin(key)}/`}
              onClick={onNavigate}
              className={cn(
                "flex items-start gap-2.5 rounded-sm px-2.5 py-2.5 text-sm transition-colors duration-150 hover:bg-raised/70",
                key === site ? "font-medium text-fg" : "text-muted",
              )}
            >
              <ProductMark site={key} size={22} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span>{product(key).name}</span>
                  {key === site ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                      current
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-subtle">{product(key).oneLine}</span>
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
