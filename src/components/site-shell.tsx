import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { SITES, COPY, type SiteId } from "@/lib/sites";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { LegalLinks } from "@/components/legal-links";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/cn";

export function SiteShell({
  site,
  children,
}: {
  site: SiteId;
  children: ReactNode;
}) {
  const cfg = SITES[site];
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/$site", label: "Board" },
    { to: "/$site/rules", label: "Rules" },
    { to: "/$site/activity", label: "Live" },
  ] as const;

  return (
    <div data-theme={site} className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-14 items-center justify-between gap-3">
            <Link
              to="/$site"
              params={{ site }}
              className="flex min-h-11 min-w-0 items-center gap-2"
            >
              <SiteMark site={site} />
              <span className="font-display-site text-lg tracking-tight">
                {cfg.wordmark}
              </span>
              <span className="hidden text-xs text-subtle sm:inline">.lol</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((item) => {
                const last = item.to.split("/").pop();
                const active =
                  item.to === "/$site"
                    ? pathname === `/${site}` || pathname === `/${site}/`
                    : Boolean(last && pathname.startsWith(`/${site}/${last}`));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    params={{ site }}
                    className={cn(
                      "inline-flex h-11 items-center px-3 text-sm",
                      active ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <Button asChild className="h-10 shrink-0 px-3.5">
              <Link to="/$site/bid" params={{ site }}>
                {COPY.bidNow}
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2 pb-3 md:hidden">
            {nav.map((item) => {
              const last = item.to.split("/").pop();
              const active =
                item.to === "/$site"
                  ? pathname === `/${site}` || pathname === `/${site}/`
                  : Boolean(last && pathname.startsWith(`/${site}/${last}`));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  params={{ site }}
                  className={cn(
                    "inline-flex h-11 items-center px-2 text-sm",
                    active ? "text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="pb-3">
            <ModeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-8 sm:pb-16">{children}</main>
      <div className="pb-24 sm:pb-0">
        <SiteFooter site={site} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:hidden">
        <Button asChild className="w-full">
          <Link to="/$site/bid" params={{ site }}>
            {cfg.cta}
          </Link>
        </Button>
        <LegalLinks site={site} className="mt-2 justify-center text-xs" />
      </div>
    </div>
  );
}

function SiteMark({ site }: { site: SiteId }) {
  if (site === "founders") {
    return (
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-sm font-display text-lg italic shadow-[var(--shadow-border)]"
      >
        f
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-9 items-center justify-center rounded-sm font-meta text-sm shadow-[var(--shadow-border)]"
    >
      b
    </span>
  );
}
