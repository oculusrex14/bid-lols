import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { getPortal } from "@/lib/board-fns";
import { formatUsd, rankLabel } from "@/lib/format";
import { SITES } from "@/lib/sites";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/")({
  loader: () => getPortal(),
  component: Home,
});

function Home() {
  const portal = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="flex items-center justify-between px-5 py-4">
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted">
          Bid.lol
        </span>
        <Link to="/spec" className="text-sm text-muted hover:text-fg">
          Full spec
        </Link>
      </header>

      <section className="relative mx-auto max-w-5xl px-5 pb-8 pt-6 sm:pt-16">
        <div className="grid-veil pointer-events-none absolute inset-0 opacity-70" />
        <p className="rise-in text-xs uppercase tracking-[0.22em] text-subtle">
          Two boards. One mechanic.
        </p>
        <h1 className="rise-in rise-in-2 mt-4 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-7xl">
          Pay to rank.
          <span className="italic text-muted"> Highest bid stands first.</span>
        </h1>
        <p className="rise-in rise-in-3 mt-5 max-w-xl text-base text-muted sm:text-lg">
          Founders buy trust on one board. Bid sites fight for the meta crown on
          the other. Whole dollars. Five dollar floor. Re-bids pay the difference.
        </p>
      </section>

      <section className="grid min-h-[70vh] grid-cols-1 lg:grid-cols-2">
        <SitePanel
          site="founders"
          listings={portal.founders.listings.slice(0, 3)}
          pool={portal.founders.stats.poolCents}
        />
        <SitePanel
          site="bidception"
          listings={portal.bidception.listings.slice(0, 3)}
          pool={portal.bidception.stats.poolCents}
          cool
        />
      </section>
    </div>
  );
}

function SitePanel({
  site,
  listings,
  pool,
  cool,
}: {
  site: "founders" | "bidception";
  listings: { id: string; title: string; bidCents: number; rank: number | null }[];
  pool: number;
  cool?: boolean;
}) {
  const cfg = SITES[site];
  return (
    <article
      data-theme={site}
      className={cn(
        "flex flex-col justify-between border-t border-border bg-bg px-5 py-10 sm:px-10 sm:py-14",
        cool && "lg:border-l",
      )}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-subtle">{cfg.kicker}</p>
        <h2 className="font-display-site mt-3 text-4xl tracking-tight sm:text-5xl">
          {cfg.wordmark}
          <span className="text-subtle">.lol</span>
        </h2>
        <p className="mt-4 max-w-md text-muted">{cfg.tagline}</p>
        <p className="mt-6 text-xs uppercase tracking-wider text-subtle">
          Live pool · <span className="tabular text-fg">{formatUsd(pool)}</span>
        </p>
        <ol className="mt-4 flex flex-col gap-2">
          {listings.map((row) => (
            <li
              key={row.id}
              className="flex items-baseline justify-between gap-3 rounded-lg bg-surface px-3 py-2.5 shadow-[var(--shadow-border)]"
            >
              <span className="flex min-w-0 items-baseline gap-3">
                <span className="tabular text-sm text-muted">{rankLabel(row.rank)}</span>
                <span className="truncate text-sm">{row.title}</span>
              </span>
              <span className="tabular text-sm">{formatUsd(row.bidCents)}</span>
            </li>
          ))}
        </ol>
      </div>
      <Link
        to="/$site"
        params={{ site }}
        className="mt-10 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-medium text-accent-fg transition-transform duration-150 active:scale-[0.96]"
      >
        Enter {cfg.wordmark}
        <ArrowRight className="size-4" />
      </Link>
    </article>
  );
}
