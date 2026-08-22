import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { getPortal } from "@/lib/board-fns";
import { formatUsd, rankLabel } from "@/lib/format";
import { PORTAL, SITE_IDS, SITES, type SiteId } from "@/lib/sites";
import { cn } from "@/lib/cn";
import { ModeToggle } from "@/components/mode-toggle";
import { SiteFooter } from "@/components/site-footer";
import { HypeCounts } from "@/components/hype-counts";
import { TrackSiteView } from "@/components/track-site-view";
import { SiteFavicon } from "@/components/site-favicon";
import type { BoardPayload } from "@/lib/types";

export const Route = createFileRoute("/")({
  loader: () => getPortal(),
  head: () => ({
    meta: [
      { title: PORTAL.domain },
      {
        name: "description",
        content:
          "bidthrone.lol — three pay-to-rank boards. Foundersbid proves founding teams. Culturebid ranks culture. Bidception finds other marketing platforms.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const portal = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <TrackSiteView site="portal" />
      <header className="mx-auto max-w-6xl px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-kicker text-fg">
            {PORTAL.domain}
          </span>
          <Link to="/spec" className="text-sm text-muted hover:text-fg">
            Full spec
          </Link>
        </div>
        <div className="mt-3">
          <ModeToggle />
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-6 pt-4 sm:pb-8 sm:pt-12">
        <div className="grid-veil pointer-events-none absolute inset-0 opacity-70" />
        <p className="rise-in text-xs uppercase tracking-kicker text-subtle">
          Three boards. One mechanic.
        </p>
        <h1 className="rise-in rise-in-2 mt-3 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:mt-4 sm:text-7xl">
          Pay to rank.
          <span className="italic text-muted"> Highest bid stands first.</span>
        </h1>
        <p className="rise-in rise-in-3 mt-3 max-w-2xl text-sm text-muted sm:mt-5 sm:text-lg">
          Trust the founding team. Rank your culture. Then find where else to spend
          the rest of the budget. Whole dollars. Five dollar floor. Re-bids pay the difference.
        </p>
      </section>

      {/* Three equal-weight branches. Each card uses the same layout; only type + tokens change. */}
      <section className="grid grid-cols-1 lg:grid-cols-3">
        {SITE_IDS.map((site, i) => (
          <SitePanel
            key={site}
            site={site}
            listings={portal[site].listings.slice(0, 3)}
            pool={portal[site].stats.poolCents}
            visitsToday={portal[site].stats.visitsToday}
            totalViews={portal[site].stats.totalViews}
            edge={i > 0}
          />
        ))}
      </section>

      <SiteFooter site="portal" />
    </div>
  );
}

function SitePanel({
  site,
  listings,
  pool,
  visitsToday,
  totalViews,
  edge,
}: {
  site: SiteId;
  listings: BoardPayload["listings"];
  pool: number;
  visitsToday: number;
  totalViews: number;
  edge?: boolean;
}) {
  const cfg = SITES[site];
  return (
    <article
      data-theme={site}
      className={cn(
        "flex flex-col justify-between border-t border-border bg-bg px-5 py-10 sm:px-8 sm:py-12",
        edge && "lg:border-l",
      )}
    >
      <div>
        <p className="text-xs uppercase tracking-kicker text-subtle">{cfg.kicker}</p>
        <h2
          className={cn(
            "font-display-site mt-3 text-3xl tracking-tight sm:text-4xl",
            site === "founders" && "italic",
          )}
        >
          {cfg.wordmark}
          <span className="text-subtle">.lol</span>
        </h2>
        <p
          className={cn(
            "mt-4 max-w-md text-muted",
            site === "founders" && "font-display italic text-fg",
          )}
        >
          {cfg.portalLine}
        </p>
        <HypeCounts visitsToday={visitsToday} totalViews={totalViews} className="mt-6" />
        <p className="mt-2 text-xs uppercase tracking-wider text-subtle">
          Bid pool · <span className="tabular text-fg">{formatUsd(pool)}</span>
        </p>
        <ol className="mt-4 flex flex-col gap-2">
          {listings.map((row) => (
            <li
              key={row.id}
              className="flex items-baseline justify-between gap-3 rounded-lg bg-surface px-3 py-2.5 shadow-[var(--shadow-border)]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="tabular text-sm text-muted">{rankLabel(row.rank)}</span>
                <SiteFavicon url={row.url} title={row.title} size="sm" />
                <span className="truncate text-sm">
                  {site === "founders" && row.team ? (
                    <span className="font-display italic">{row.team}</span>
                  ) : (
                    row.title
                  )}
                </span>
              </span>
              <span className="tabular text-sm">{formatUsd(row.bidCents)}</span>
            </li>
          ))}
        </ol>
      </div>
      <Link
        to="/$site"
        params={{ site }}
        preload="intent"
        className="mt-10 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.96]"
      >
        Enter {cfg.wordmark}
        <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}
