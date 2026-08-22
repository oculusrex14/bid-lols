import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/activity-feed";
import { getListing, trackClick } from "@/lib/board-fns";
import { formatUsd, hostOf, rankLabel, relativeTime } from "@/lib/format";
import { COPY, SITES, isSiteId } from "@/lib/sites";

export const Route = createFileRoute("/$site/listing/$id")({
  component: ListingPage,
});

function ListingPage() {
  const { site, id } = Route.useParams();
  const query = useQuery({
    queryKey: ["listing", id],
    queryFn: () => getListing({ data: { id } }),
    refetchInterval: 5000,
  });

  if (!isSiteId(site)) return null;
  const cfg = SITES[site];

  if (query.isError) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display-site text-3xl">Listing not found</h1>
        <Link to="/$site" params={{ site }} className="mt-4 inline-block text-sm text-muted hover:text-fg">
          {COPY.backToBoard}
        </Link>
      </div>
    );
  }

  const listing = query.data?.listing;
  if (!listing) {
    return <div className="h-64 rounded-xl bg-surface shadow-[var(--shadow-border)]" />;
  }

  const listingId = listing.id;
  const listingUrl = listing.url;

  async function visit() {
    try {
      const res = await trackClick({ data: { id: listingId } });
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(listingUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <p className="tabular text-sm text-muted">Rank {rankLabel(listing.rank)}</p>
        <h1 className="mt-2 font-display-site text-4xl tracking-tight sm:text-5xl">
          {listing.title}
        </h1>
        <p className="mt-3 text-muted">{listing.tagline}</p>
        {listing.team ? <p className="mt-2 text-sm text-subtle">{listing.team}</p> : null}
        <p className="mt-4 text-sm text-subtle">{hostOf(listing.url)}</p>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button onClick={() => void visit()}>
            {cfg.visit}
            <ArrowUpRight className="size-4" />
          </Button>
          <Button asChild variant="outline">
            <Link to="/$site/bid" params={{ site }} search={{ url: listing.url }}>
              {COPY.outbid}
            </Link>
          </Button>
        </div>

        <dl className="mt-10 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <dt className="text-xs uppercase tracking-wider text-subtle">Bid</dt>
            <dd className="mt-1 tabular text-xl font-medium">{formatUsd(listing.bidCents)}</dd>
          </div>
          <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <dt className="text-xs uppercase tracking-wider text-subtle">Visits</dt>
            <dd className="mt-1 tabular text-xl font-medium">{listing.clicks.toLocaleString()}</dd>
          </div>
          <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
            <dt className="text-xs uppercase tracking-wider text-subtle">Last bid</dt>
            <dd className="mt-1 text-xl font-medium">{relativeTime(listing.lastBidAt)}</dd>
          </div>
        </dl>
      </div>
      <aside>
        <h2 className="text-sm font-medium">On this listing</h2>
        <ActivityFeed site={site} items={query.data?.activity ?? []} />
      </aside>
    </div>
  );
}
