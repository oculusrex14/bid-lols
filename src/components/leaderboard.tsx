import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatUsd, hostOf, rankLabel } from "@/lib/format";
import { COPY, SITES, type SiteId } from "@/lib/sites";
import { trackClick } from "@/lib/board-fns";
import type { Listing } from "@/lib/types";
import { SiteFavicon } from "@/components/site-favicon";
import { FounderSocials } from "@/components/founder-socials";
import { CultureValues } from "@/components/culture-values";

export function Leaderboard({
  site,
  listings,
}: {
  site: SiteId;
  listings: Listing[];
}) {
  const cfg = SITES[site];
  if (listings.length === 0) {
    return (
      <div className="rounded-xl bg-surface px-6 py-16 text-center shadow-[var(--shadow-border)]">
        <p className="font-display-site text-2xl">{cfg.emptyBoard}</p>
        <Button asChild className="mt-6">
          <Link to="/$site/bid" params={{ site }}>
            {cfg.cta}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {listings.map((row, i) => (
        <LeaderRow key={row.id} site={site} listing={row} featured={i === 0} />
      ))}
    </ol>
  );
}

function LeaderRow({
  site,
  listing,
  featured,
}: {
  site: SiteId;
  listing: Listing;
  featured: boolean;
}) {
  const cfg = SITES[site];
  const founders = site === "founders";
  const culture = site === "culture";

  async function visit() {
    try {
      const res = await trackClick({ data: { id: listing.id } });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(listing.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <li
      className={cn(
        "rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4",
        featured && "p-4 sm:p-5",
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={cn(
            "tabular w-10 shrink-0 pt-0.5 font-medium text-muted",
            featured && "font-display-site text-2xl text-fg sm:text-3xl",
          )}
        >
          {rankLabel(listing.rank)}
        </div>
        <SiteFavicon
          url={listing.url}
          title={listing.title}
          size={featured ? "lg" : "md"}
        />
        <div className="min-w-0 flex-1">
          {founders && listing.team ? (
            <>
              <Link
                to="/$site/listing/$id"
                params={{ site, id: listing.id }}
                className={cn(
                  "block font-display text-fg hover:underline",
                  featured ? "text-2xl italic sm:text-3xl" : "text-lg italic",
                )}
              >
                {listing.team}
              </Link>
              <p className="mt-1 truncate text-sm text-muted">
                {listing.title}
                <span className="text-subtle"> · {hostOf(listing.url)}</span>
              </p>
            </>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <Link
                to="/$site/listing/$id"
                params={{ site, id: listing.id }}
                className={cn(
                  "truncate font-medium hover:underline",
                  featured ? "font-display-site text-2xl sm:text-3xl" : "text-base",
                )}
              >
                {listing.title}
              </Link>
              <span className="truncate text-xs text-subtle">{hostOf(listing.url)}</span>
            </div>
          )}
          {listing.tagline ? (
            <p
              className={cn(
                "mt-1 line-clamp-2 text-sm text-muted",
                founders && "font-display italic",
              )}
            >
              {listing.tagline}
            </p>
          ) : null}
          {founders ? (
            <FounderSocials socials={listing.socials} className="mt-2" />
          ) : culture ? (
            <>
              {/* Culturebid: company stays the headline; values + optional quote sit under the statement. */}
              <CultureValues values={listing.values} className="mt-2" />
              {listing.team ? (
                <p className="mt-2 line-clamp-2 font-display text-sm italic text-muted">
                  “{listing.team}”
                </p>
              ) : null}
            </>
          ) : listing.team ? (
            <p className="mt-1 line-clamp-1 text-xs text-subtle">{listing.team}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void visit()}
              className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm text-muted shadow-[var(--shadow-border)] hover:text-fg"
            >
              {cfg.visit}
              <ArrowUpRight className="size-3.5" />
            </button>
            <Button asChild variant="outline" className="h-11">
              <Link
                to="/$site/bid"
                params={{ site }}
                search={{ url: listing.url }}
              >
                {COPY.outbid}
              </Link>
            </Button>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-subtle">
              <MousePointer2 className="size-3.5" />
              <span className="tabular">{listing.clicks.toLocaleString()}</span>
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className={cn(
              "tabular font-medium",
              featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg",
            )}
          >
            {formatUsd(listing.bidCents)}
          </div>
          <div className="text-xs uppercase tracking-wider text-subtle">bid</div>
        </div>
      </div>
    </li>
  );
}
