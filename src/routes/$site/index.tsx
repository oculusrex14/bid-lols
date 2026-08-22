import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getBoard } from "@/lib/board-fns";
import { isSiteId, SITES } from "@/lib/sites";
import { Leaderboard } from "@/components/leaderboard";
import { ActivityFeed } from "@/components/activity-feed";
import { StatsBar } from "@/components/stats-bar";
import { YourListings } from "@/components/your-listings";

export const Route = createFileRoute("/$site/")({
  loader: ({ params }) => {
    const site = isSiteId(params.site) ? params.site : "founders";
    return getBoard({ data: { site } });
  },
  component: BoardHome,
});

function BoardHome() {
  const { site: siteParam } = Route.useParams();
  const site = isSiteId(siteParam) ? siteParam : "founders";
  const cfg = SITES[site];
  const initial = Route.useLoaderData();
  const live = useQuery({
    queryKey: ["board", site],
    queryFn: () => getBoard({ data: { site } }),
    placeholderData: initial,
    refetchInterval: 4000,
  });
  const board = live.data ?? initial;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <p className="rise-in text-xs uppercase tracking-[0.2em] text-subtle">{cfg.kicker}</p>
        <h1 className="rise-in rise-in-2 mt-3 font-display-site text-4xl tracking-tight sm:text-6xl">
          {cfg.wordmark}
        </h1>
        <p className="rise-in rise-in-3 mt-4 max-w-xl text-muted">{cfg.tagline}</p>
        <div className="mt-8">
          {board ? <StatsBar stats={board.stats} /> : <StatsSkeleton />}
        </div>
        <div className="mt-6">
          {board ? (
            <Leaderboard site={site} listings={board.listings} />
          ) : (
            <BoardSkeleton />
          )}
        </div>
      </div>
      <aside className="lg:pt-28">
        <div className="lg:sticky lg:top-20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Live feed</h2>
            <Link to="/$site/activity" params={{ site }} className="text-xs text-muted hover:text-fg">
              Full feed
            </Link>
          </div>
          {board ? (
            <ActivityFeed site={site} items={board.activity.slice(0, 8)} compact />
          ) : (
            <p className="mt-4 text-sm text-subtle">Loading the tape…</p>
          )}
          <YourListings site={site} />
          <SwapCard />
        </div>
      </aside>
    </div>
  );
}

function SwapCard() {
  return (
    <div className="mt-8 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h3 className="text-sm font-medium">Swap link rates</h3>
      <ul className="mt-3 space-y-1.5 text-xs text-muted">
        <li className="flex justify-between"><span>Under $100</span><span className="tabular">10%</span></li>
        <li className="flex justify-between"><span>$100 – $999</span><span className="tabular">15%</span></li>
        <li className="flex justify-between"><span>$1k – $4,999</span><span className="tabular">20%</span></li>
        <li className="flex justify-between"><span>$5k+</span><span className="tabular">25%</span></li>
      </ul>
      <p className="mt-3 text-xs text-subtle">
        Floor $10, cap $2,500. Top 50: three swaps lifetime (2nd 35%, 3rd 50%). Rank 51+: unlimited at base.
      </p>
    </div>
  );
}

function StatsSkeleton() {
  return <div className="h-24 rounded-xl bg-surface shadow-[var(--shadow-border)]" />;
}

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-surface shadow-[var(--shadow-border)]" />
      ))}
    </div>
  );
}
