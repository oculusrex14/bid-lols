import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, Sparkles, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  createOracleOrder,
  getCrown,
  placeCrownPick,
  removeCrownPick,
} from "@/lib/crown";
import {
  ORACLE_MULTIPLIER,
  ORACLE_PASS_DOLLARS,
  ORACLE_PASS_DAYS,
  ORACLE_PICKS_PER_ROUND,
  formatCountdown,
  tierFor,
} from "@/lib/crown-math";
import { formatPassDate, formatUsd, hostOf, rankLabel } from "@/lib/format";
import { SITES, isSiteId, type SiteId } from "@/lib/sites";
import { getCrownHandle, getCrownToken, setCrownHandle } from "@/lib/crown-identity";
import { TrackSiteView } from "@/components/track-site-view";
import { SiteFavicon } from "@/components/site-favicon";
import { cn } from "@/lib/cn";
import type { CrownPayload } from "@/lib/types";

export const Route = createFileRoute("/$site/crown")({
  component: CrownPage,
});

function CrownPage() {
  const { site: siteParam } = Route.useParams();
  const site = isSiteId(siteParam) ? siteParam : "founders";
  const cfg = SITES[site];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Token/handle live in localStorage (client-only); SSR renders them empty
  // and the effect fills them after hydration so the query can arm.
  const [token, setToken] = useState("");
  const [handle, setHandle] = useState(() => getCrownHandle());
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setToken(getCrownToken());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const query = useQuery({
    // `handle` rides along in the payload (leaderboard label) but is not part
    // of the cache key — typing must not re-fetch; the blur commit invalidates.
    queryKey: ["crown", site, token],
    queryFn: () => getCrown({ data: { site, token, handle } }),
    staleTime: 4000,
    refetchInterval: 20000,
    enabled: token.length > 0,
  });
  const data = query.data;
  const closesIn = data ? formatCountdown(new Date(data.closesAt).getTime() - now) : "—";

  async function commitPick(listingId: string, replaceId?: string) {
    try {
      await placeCrownPick({ data: { site, token, handle, listingId, replaceId } });
      await queryClient.invalidateQueries({ queryKey: ["crown", site] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pick failed.");
    }
  }

  async function dropPick(listingId: string) {
    try {
      await removeCrownPick({ data: { site, token, listingId } });
      await queryClient.invalidateQueries({ queryKey: ["crown", site] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove the pick.");
    }
  }

  async function buyPass() {
    try {
      const { orderId } = await createOracleOrder({ data: { site, token, handle } });
      navigate({ to: "/$site/checkout/$orderId", params: { site, orderId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the pass purchase.");
    }
  }

  function saveHandle(value: string) {
    const clean = value.trim().slice(0, 24);
    setHandle(clean);
    setCrownHandle(clean);
    if (clean) void queryClient.invalidateQueries({ queryKey: ["crown", site] });
  }

  function share() {
    const streakLine =
      data && data.me.streak > 0 ? ` — ${data.me.streak} in a row` : "";
    const text = `I'm calling the crown on ${cfg.wordmark}.lol${streakLine}. Who holds #1 at midnight? ${window.location.origin}/${site}/crown`;
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <TrackSiteView site={site} />
      <p className="text-xs uppercase tracking-kicker text-subtle">
        The crown · settles at 00:00 UTC
      </p>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display-site text-4xl tracking-tight sm:text-5xl">
          Who holds the crown?
        </h1>
        <p className="tabular text-sm text-subtle">Closes in {closesIn}</p>
      </div>
      <p className="mt-3 max-w-xl text-sm text-muted">
        Tonight's #1 on {cfg.wordmark} wins the crown at midnight UTC. Pick who you
        think holds it when the clock runs out. Free, one pick a day — no account.
      </p>

      {data ? (
        <CrownBoard
          data={data}
          site={site}
          onPick={(id, replaceId) => void commitPick(id, replaceId)}
          onDrop={(id) => void dropPick(id)}
          onBuy={() => void buyPass()}
          onShare={share}
          copied={copied}
          handle={handle}
          onHandle={saveHandle}
        />
      ) : (
        <div className="mt-8 h-64 rounded-xl bg-surface shadow-[var(--shadow-border)]" />
      )}
    </div>
  );
}

function CrownBoard({
  data,
  site,
  onPick,
  onDrop,
  onBuy,
  onShare,
  copied,
  handle,
  onHandle,
}: {
  data: CrownPayload;
  site: SiteId;
  onPick: (listingId: string, replaceId?: string) => void;
  onDrop: (listingId: string) => void;
  onBuy: () => void;
  onShare: () => void;
  copied: boolean;
  handle: string;
  onHandle: (value: string) => void;
}) {
  const cfg = SITES[site];
  const totalPicks = data.candidates.reduce((sum, c) => sum + c.pickCount, 0);
  const leader = data.candidates.find((c) => c.isLeader) ?? data.candidates[0];
  const [draft, setDraft] = useState(handle);
  useEffect(() => setDraft(handle), [handle]);

  if (data.candidates.length === 0) {
    return (
      <div className="mt-8 rounded-xl bg-surface p-10 text-center shadow-[var(--shadow-border)]">
        <Crown className="mx-auto size-8 text-subtle" />
        <p className="mt-3 font-display-site text-2xl">No crown to win yet</p>
        <p className="mt-2 text-sm text-muted">
          The board is empty. The first bid places the first crown — the game
          switches on with it.
        </p>
        <Button asChild className="mt-6">
          <Link to="/$site/bid" params={{ site }}>
            {cfg.cta}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px]">
      <div className="flex flex-col gap-6">
        {leader ? (
          <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
            <p className="text-xs uppercase tracking-kicker text-subtle">
              Holding the crown
            </p>
            <div className="mt-3 flex items-start gap-3">
              <SiteFavicon url={leader.url} title={leader.title} size="lg" />
              <div className="min-w-0 flex-1">
                <Link
                  to="/$site/listing/$id"
                  params={{ site, id: leader.id }}
                  className="font-display-site text-2xl tracking-tight hover:underline"
                >
                  {leader.title}
                </Link>
                <p className="mt-1 truncate text-sm text-muted">{hostOf(leader.url)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tabular text-xl font-medium">{formatUsd(leader.bidCents)}</p>
                <p className="text-xs uppercase tracking-wider text-subtle">
                  rank {rankLabel(leader.rank)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Tonight's field</h2>
            <p className="tabular text-xs text-subtle">
              {totalPicks} pick{totalPicks === 1 ? "" : "s"} in
              {data.me.hasPass ? " · crowd odds live" : ""}
            </p>
          </div>
          <ol className="mt-4 flex flex-col gap-2">
            {data.candidates.map((cand) => (
              <CandidateRow
                key={cand.id}
                cand={cand}
                site={site}
                showShare={data.me.hasPass}
                totalPicks={totalPicks}
                onPick={() => onPick(cand.id)}
                onDrop={() => onDrop(cand.id)}
              />
            ))}
          </ol>
          <p className="mt-3 text-xs text-subtle">
            {data.me.picks.length} of {data.me.pickLimit} picks used this round.
            {data.me.hasPass
              ? " Oracle Pass active."
              : ` Free tier: 1 pick a day. Oracle: ${ORACLE_PICKS_PER_ROUND} picks, ${ORACLE_MULTIPLIER}× points.`}
          </p>
        </div>

        <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Your standing</h2>
              <p className="mt-1 text-xs text-subtle">
                {tierFor(data.me.wins) === "—"
                  ? "No wins yet — pick a horse."
                  : `${tierFor(data.me.wins)} tier · ${data.me.wins} wins · best streak ${data.me.bestStreak}`}
              </p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="tabular text-lg font-medium">{data.me.points}</p>
                <p className="text-xs uppercase tracking-wider text-subtle">points</p>
              </div>
              <div>
                <p className="tabular text-lg font-medium">{data.me.streak}</p>
                <p className="text-xs uppercase tracking-wider text-subtle">streak</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Field label="Your handle" hint="Shown on the oracle board. Stored in this browser only.">
              <Input
                value={draft}
                placeholder="Crowner"
                maxLength={24}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => onHandle(draft)}
              />
            </Field>
            {data.lastResult ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-raised px-3 py-2.5">
                <Trophy className="size-4 shrink-0 text-subtle" />
                <p className="min-w-0 text-sm text-muted">
                  <span className="font-medium text-fg">
                    {data.lastResult.winnerTitle ?? "Nobody held it"}
                  </span>{" "}
                  took the crown {data.lastResult.roundDay}
                  {data.lastResult.youWon ? " — you called it." : "."}
                </p>
              </div>
            ) : null}
            <Button variant="ghost" className="mt-4 h-9" onClick={onShare}>
              {copied ? "Copied" : "Share this board's crown"}
            </Button>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-6">
        <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-fg" />
            <h2 className="text-sm font-medium">Oracle Pass</h2>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-muted">
            <li>· Up to 5 picks a day (free is 1)</li>
            <li>· {ORACLE_MULTIPLIER}× points on every win</li>
            <li>· Live crowd odds on each pick</li>
            <li>· ORACLE badge on the board</li>
          </ul>
          {data.me.hasPass && data.me.passExpiresAt ? (
            <div className="mt-4">
              <p className="text-xs text-up">
                Active until {formatPassDate(data.me.passExpiresAt)} (UTC)
              </p>
              <Button variant="outline" className="mt-3 w-full" onClick={onBuy}>
                Extend {ORACLE_PASS_DAYS} more days · ${ORACLE_PASS_DOLLARS}
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-xs text-subtle">
                ${ORACLE_PASS_DOLLARS} for {ORACLE_PASS_DAYS} days · INR at checkout
              </p>
              <Button className="mt-3 w-full" onClick={onBuy}>
                Get the Oracle Pass
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
          <h2 className="text-sm font-medium">Oracle board · top 10</h2>
          {data.leaderboard.length === 0 ? (
            <p className="mt-3 text-xs text-subtle">
              No settled rounds yet. First points land at midnight.
            </p>
          ) : (
            <ol className="mt-3 flex flex-col">
              {data.leaderboard.map((row, i) => (
                <li
                  key={`${row.handle}-${i}`}
                  className={cn(
                    "flex items-center justify-between gap-2 border-b border-border py-2 last:border-b-0",
                    row.isYou && "bg-raised px-2 -mx-2 rounded-md",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="tabular w-5 text-xs text-subtle">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {row.handle}
                      {row.isYou ? " (you)" : ""}
                    </span>
                    {row.isOracle ? (
                      <span className="rounded-sm bg-raised px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-subtle">
                        oracle
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular text-sm">
                    {row.points}
                    {row.streak > 1 ? (
                      <span className="ml-1 text-xs text-subtle">
                        · {row.streak} in a row
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  );
}

function CandidateRow({
  cand,
  site,
  showShare,
  totalPicks,
  onPick,
  onDrop,
}: {
  cand: CrownPayload["candidates"][number];
  site: SiteId;
  showShare: boolean;
  totalPicks: number;
  onPick: () => void;
  onDrop: () => void;
}) {
  const share =
    totalPicks > 0 ? Math.round((cand.pickCount / totalPicks) * 100) : 0;
  return (
    <li className="flex items-center gap-3 rounded-lg bg-raised/50 px-3 py-2.5">
      <span className="tabular w-7 shrink-0 text-xs text-subtle">
        {rankLabel(cand.rank)}
      </span>
      <SiteFavicon url={cand.url} title={cand.title} size="sm" />
      <span className="min-w-0 flex-1">
        <Link
          to="/$site/listing/$id"
          params={{ site, id: cand.id }}
          className="block truncate text-sm font-medium hover:underline"
        >
          {cand.title}
        </Link>
        <span className="block truncate text-xs text-subtle">
          {hostOf(cand.url)} · {formatUsd(cand.bidCents)}
        </span>
      </span>
      {showShare ? (
        <span className="hidden w-24 shrink-0 sm:block">
          <span className="block h-1.5 overflow-hidden rounded-full bg-border">
            <span
              className="block h-full rounded-full bg-fg/70"
              style={{ width: `${Math.max(2, share)}%` }}
            />
          </span>
          <span className="tabular mt-0.5 block text-right text-[11px] text-subtle">
            {cand.pickCount} · {share}%
          </span>
        </span>
      ) : (
        <span className="tabular w-10 shrink-0 text-right text-xs text-subtle">
          {cand.pickCount}
        </span>
      )}
      {cand.picked ? (
        <button
          type="button"
          onClick={onDrop}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md bg-fg px-3 text-xs font-medium text-bg hover:opacity-90"
        >
          <X className="size-3.5" /> Picked
        </button>
      ) : (
        <Button variant="outline" className="h-9 shrink-0" onClick={onPick}>
          Pick
        </Button>
      )}
    </li>
  );
}
