import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ActivityFeed } from "@/components/activity-feed";
import { getBoard } from "@/lib/board-fns";
import { isSiteId, SITES } from "@/lib/sites";
import { TrackSiteView } from "@/components/track-site-view";

export const Route = createFileRoute("/$site/activity")({
  loader: ({ params }) => {
    const site = isSiteId(params.site) ? params.site : "founders";
    return getBoard({ data: { site } });
  },
  component: ActivityPage,
});

function ActivityPage() {
  const { site: siteParam } = Route.useParams();
  const site = isSiteId(siteParam) ? siteParam : "founders";
  const cfg = SITES[site];
  const initial = Route.useLoaderData();
  const board = useQuery({
    queryKey: ["board", site],
    queryFn: () => getBoard({ data: { site } }),
    placeholderData: initial,
    refetchInterval: 3000,
  });

  return (
    <div className="mx-auto max-w-xl">
      <TrackSiteView site={site} />
      <p className="text-xs uppercase tracking-kicker text-subtle">Live tape</p>
      <h1 className="mt-3 font-display-site text-4xl tracking-tight">{cfg.wordmark} activity</h1>
      <p className="mt-3 text-muted">
        Bids, re-bids, and URL swaps. The board refreshes on its own.
      </p>
      <div className="mt-8">
        {board.data ? (
          <ActivityFeed site={site} items={board.data.activity} />
        ) : (
          <p className="text-sm text-subtle">Listening…</p>
        )}
      </div>
    </div>
  );
}
