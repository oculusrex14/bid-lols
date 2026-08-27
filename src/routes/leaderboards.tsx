import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { boardFn, BOARD_NAMES, type LeaderboardRow } from "@/lib/marketplace/reputation";
import { getSession } from "@/lib/authz";

/**
 * /leaderboards — Bidthrone's discovery surface (Phase 04, FR-3). Every board
 * is derived from genuine production marketplace data; a board with nobody
 * over the sample threshold shows an honest "new network" state — never
 * seeded or fabricated rows.
 */
type BoardSection = {
  board: string;
  title: string;
  blurb: string;
  rows: LeaderboardRow[];
};

const TITLES: Record<string, { title: string; blurb: string }> = {
  most_experience: { title: "Top Builders", blurb: "Most verified completions across the network." },
  most_wins: { title: "Most Bounty Wins", blurb: "Members with the most first-place wins." },
  most_complete: { title: "Most Completed", blurb: "Projects carried to completion." },
  most_quality: { title: "Highest Rated", blurb: "Strongest average review quality." },
  most_reliable: { title: "Most Reliable", blurb: "Best completion-to-dispute ratio." },
  rising: { title: "Rising", blurb: "Members gaining verified experience recently." },
  top_sponsors: { title: "Top Sponsors", blurb: "Sponsors with the most funded, completed work." },
};

const loadBoards = createServerFn({ method: "GET" }).handler(async () => {
  const product = await currentProductKey();
  const { me } = await shellContext();
  const session = await getSession();
  const sections: BoardSection[] = [];
  for (const board of BOARD_NAMES.slice(0, 6)) {
    const r = await boardFn({ data: { board, limit: 8 } });
    if (r.ok) {
      sections.push({ board, ...(TITLES[board] ?? { title: board, blurb: "" }), rows: r.rows });
    }
  }
  return { product, me, sections, viewerId: session?.user.id ?? null };
});

export const Route = createFileRoute("/leaderboards")({
  loader: () => loadBoards(),
  component: LeaderboardsPage,
});

function LeaderboardsPage() {
  const d = Route.useLoaderData();
  const anyData = d.sections.some((s) => s.rows.length > 0);
  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Bidthrone</p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">Leaderboards</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Reputation here is earned, never bought. Each board is computed live
          from verified marketplace outcomes — completed work, wins, milestones
          and reviews. A rank only appears when the work is real.
        </p>

        {!anyData ? (
          <div className="mt-10 rounded-lg border-2 border-dashed border-fg/20 bg-surface p-10 text-center" data-testid="new-network">
            <h2 className="font-display-site text-xl tracking-tight">A new network, honestly.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              No one has enough verified marketplace outcomes to rank yet. We
              would rather show you an empty board than fill it with fake
              names. Check back as real work gets completed.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {d.sections.map((s) => (
              <section key={s.board} className="rounded-lg border-2 border-fg/15 bg-surface p-5" data-testid={`board-${s.board}`}>
                <h2 className="font-display-site text-lg tracking-tight">{s.title}</h2>
                <p className="mt-1 text-xs text-subtle">{s.blurb}</p>
                {s.rows.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">Not enough verified data yet — this board will populate as real work completes.</p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {s.rows.map((r, i) => (
                      <li key={r.userId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-4 text-right text-xs text-subtle">{i + 1}.</span>
                          <span className="font-medium">{r.displayName ?? r.handle ?? "member"}</span>
                          {r.handle ? <span className="text-xs text-subtle">@{r.handle}</span> : null}
                        </span>
                        <span className="text-xs text-muted">{r.experience} verified</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs text-subtle">
          Methodology: experience = verified completions (bounty wins + completed
          projects + captained units); score = experience + 10·reliability +
          10·quality. No payment or placement can change a rank.
        </p>
      </div>
    </ProductShell>
  );
}