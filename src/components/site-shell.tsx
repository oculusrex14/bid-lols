import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { SITES, COPY, type SiteId } from "@/lib/sites";
import { Button } from "@/components/ui/button";
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
  const other: SiteId = site === "founders" ? "bidception" : "founders";

  const nav = [
    { to: "/$site", label: "Board" },
    { to: "/$site/rules", label: "Rules" },
    { to: "/$site/activity", label: "Live" },
  ] as const;

  return (
    <div data-theme={site} className="min-h-screen bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link
            to="/$site"
            params={{ site }}
            className="flex min-h-11 items-center gap-2"
          >
            <span className="font-display-site text-lg tracking-tight">
              {cfg.wordmark}
            </span>
            <span className="hidden text-xs text-subtle sm:inline">.lol</span>
          </Link>
          <nav className="flex items-center gap-1">
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
                    "hidden h-11 items-center px-3 text-sm sm:inline-flex",
                    active ? "text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              to="/$site"
              params={{ site: other }}
              className="hidden h-11 items-center px-3 text-sm text-subtle hover:text-fg md:inline-flex"
            >
              {SITES[other].wordmark}
            </Link>
            <Button asChild className="h-10 px-3.5">
              <Link to="/$site/bid" params={{ site }}>
                {COPY.bidNow}
              </Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:pb-16">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {cfg.domain} · highest bid ranks first · {COPY.minBid}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/" className="hover:text-fg">
              Bid.lol
            </Link>
            <Link to="/spec" className="hover:text-fg">
              Spec
            </Link>
            <Link
              to="/$site"
              params={{ site: other }}
              className="inline-flex items-center gap-1 hover:text-fg"
            >
              {SITES[other].domain}
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </footer>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 p-3 backdrop-blur-sm sm:hidden">
        <Button asChild className="w-full">
          <Link to="/$site/bid" params={{ site }}>
            {cfg.cta}
          </Link>
        </Button>
      </div>
    </div>
  );
}
