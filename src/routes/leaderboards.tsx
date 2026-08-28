import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { boardFn, BOARD_NAMES, type LeaderboardRow } from "@/lib/marketplace/reputation";
import { getSession } from "@/lib/authz";

/**
 * /leaderboards — Bidthrone's discovery surface (Phase 04, FR-3, RC1 R8).
 * Every board ranks by its own dedicated metric, computed live from
 * verified marketplace outcomes. A board with no one over the sample floor
 * shows an honest empty state, never seeded rows.
 */
type BoardSection = {
  board: string;
  title: string;
  blurb: string;
  rows: LeaderboardRow[];
};

const TITLES: Record<string, { title: string; blurb: string }> = {
  most_experience: { title: "Most experience", blurb: "Verified completions across the network: bounties won, projects completed, teams captained." },
  most_wins: { title: "Most bounty wins", blurb: "Members with the most first-place awards." },
  most_complete: { title: "Most completed", blurb: "Projects carried to completion." },
  top_captains: { title: "Top captains", blurb: "Team projects captained to completion." },
  top_sponsors: { title: "Top sponsors", blurb: "Sponsors with the most funded, completed work on the network." },
  most_quality: { title: "Highest rated", blurb: "Average review quality from completed work. Requires at least three reviews to appear." },
  most_reliable: { title: "Most reliable", blurb: "Completion ratio: completed work over started work, with a minimum of two completions to appear." },
  rising: { title: "Rising", blurb: "Verified completions in the last 90 days." },
};

/** How the board's own metric value reads on a row. */
function metricLabel(board: string, row: LeaderboardRow): string {
  switch (board) {
    case "most_wins":
      return `${row.metric} win${row.metric === 1 ? "" : "s"}`;
    case "most_complete":
      return `${row.metric} project${row.metric === 1 ? "" : "s"}`;
    case "top_captains":
      return `${row.metric} captained`;
    case "top_sponsors":
      return `${row.metric} funded completion${row.metric === 1 ? "" : "s"}`;
    case "most_quality":
      return `quality ${Number(row.metric).toFixed(2)} avg`;
    case "most_reliable":
      return `${Math.round(row.metric * 100)}% completion rate`;
    case "rising":
      return `${row.metric} in 90 days`;
    case "most_experience":
    default:
      return `${row.metric} verified`;
  }
}

const loadBoards = createServerFn({ method: "GET" }).handler(async () => {
  const product = await currentProductKey();
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  const session = await getSession();
  const sections: BoardSection[] = [];
  for (const board of BOARD_NAMES) {
    const r = await boardFn({ data: { board, limit: 8 } });
    if (r.ok) {
      const meta = TITLES[board] ?? { title: board, blurb: "" };
      sections.push({ board, title: meta.title, blurb: meta.blurb, rows: r.rows });
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
          Each board below ranks one thing, and it comes from the marketplace,
          not from a member's self-report: completed bounties, completed
          projects, captained teams, and the reviews attached to them. Boards
          are network-wide, because reputation crosses products.
        </p>

        {!anyData ? (
          <div className="mt-10 rounded-lg border-2 border-dashed border-fg/20 bg-surface p-10 text-center" data-testid="new-network">
            <h2 className="font-display-site text-xl tracking-tight">
              No verified outcomes yet.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              A member appears on a board only when the work behind it has
              completed on the network. Until then the boards stay empty, and
              the page says so instead of filling space.
            </p>
            <a
              href="/blog/reputation-from-completed-work"
              className="mt-5 inline-flex h-10 items-center rounded-md border-2 border-fg/20 px-4 text-sm font-medium"
            >
              Why reputation is built from completed work
            </a>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {d.sections.map((s) => (
              <section key={s.board} className="rounded-lg border-2 border-fg/15 bg-surface p-5" data-testid={`board-${s.board}`}>
                <h2 className="font-display-site text-lg tracking-tight">{s.title}</h2>
                <p className="mt-1 text-xs text-subtle">{s.blurb}</p>
                {s.rows.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">
                    Not enough verified data for this board yet.
                  </p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {s.rows.map((r, i) => (
                      <li key={r.userId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-4 text-right text-xs text-subtle">{i + 1}.</span>
                          <span className="font-medium">{r.displayName ?? r.handle ?? "member"}</span>
                          {r.handle ? <span className="text-xs text-subtle">@{r.handle}</span> : null}
                        </span>
                        <span className="text-xs text-muted">{metricLabel(s.board, r)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 text-xs leading-relaxed text-subtle">
          Methodology: every board ranks by its own metric, computed from
          completed marketplace outcomes. Experience counts verified
          completions (bounty wins, project completions, captained units).
          Quality requires at least three reviews. Reliability requires at
          least two completions. No payment or placement input changes a rank.
        </p>
      </div>
    </ProductShell>
  );
}
