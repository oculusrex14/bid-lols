import { createFileRoute, useSearch } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { boardFn, type LeaderboardRow } from "@/lib/marketplace/reputation";
import {
  BOARD_REGISTRY,
  type BoardKey,
} from "@/lib/marketplace/leaderboard-registry";
import { getSession } from "@/lib/authz";
import { Avatar, SkillTags } from "@/components/ui/identity";
import { PageHeader } from "@/components/ui/layout";
import { InlineNotice } from "@/components/ui/states";

/**
 * /leaderboards — Bidthrone's discovery surface. RC5 §23.13: a board
 * selector + the selected board's ledger, not twelve giant empty tables.
 * Every board ranks its own dedicated metric from the single registry
 * (RC5 §5.5); an empty board keeps its headers and row chrome and says so
 * honestly. Rankings are not for sale.
 */
type BoardSection = {
  board: BoardKey;
  title: string;
  metric: string;
  minimumEvidence: string;
  explanation: string;
  rows: LeaderboardRow[];
};

const loadBoards = createServerFn({ method: "GET" }).handler(async () => {
  const product = await currentProductKey();
  const { me, funding } = await (await import("@/lib/shell-context")).getShellContext();
  const session = await getSession();
  const sections: BoardSection[] = [];
  for (const spec of BOARD_REGISTRY) {
    const r = await boardFn({ data: { board: spec.key, limit: 10 } });
    if (r.ok) {
      sections.push({
        board: spec.key,
        title: spec.title,
        metric: spec.metric,
        minimumEvidence: spec.minimumEvidence,
        explanation: spec.explanation,
        rows: r.rows,
      });
    }
  }
  return { product, me, funding, sections, viewerId: session?.user.id ?? null };
});

export const Route = createFileRoute("/leaderboards")({
  validateSearch: (search: Record<string, unknown>) => ({
    board: typeof search.board === "string" ? search.board : undefined,
  }),
  loader: () => loadBoards(),
  component: LeaderboardsPage,
});

function boardFromSearch(search: { board?: string }): BoardKey {
  return (BOARD_REGISTRY.some((s) => s.key === search.board) ? search.board : undefined) as
    | BoardKey
    | undefined ?? "most_experience";
}

function LeaderboardsPage() {
  const d = Route.useLoaderData();
  const search = useSearch({ from: "/leaderboards" });
  const selected = boardFromSearch(search);
  const current = d.sections.find((s) => s.board === selected) ?? d.sections[0];

  return (
    <ProductShell site={d.product as ProductKey} me={d.me} funding={d.funding}>
      <div className="canvas-wide pb-16">
        <PageHeader
          kicker="Bidthrone"
          title="Leaderboards"
          lead="Each board ranks one thing, computed from the marketplace and re-verified on every read: completed bounties, completed projects, captained teams, and the reviews attached to them. Boards are network-wide, because reputation crosses products. Pick a board to read its ledger."
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <BoardRail current={current.board} sections={d.sections} />
          <BoardLedger board={current} />
        </div>

        <InlineNotice className="mt-10">
          Methodology: every board ranks by its own metric, shown on each row.
          Factual boards count verified completions; the Bid Index boards rank
          the personal 300-900 trust model (BI-1.0) with stricter evidence
          floors; Most Reliable ranks the provider reliability pillar as a
          percentage, never as a 300-900 number. No payment or placement input
          changes a rank.
        </InlineNotice>
      </div>
    </ProductShell>
  );
}

/** One board: title, metric explanation, the ledger, honest empty chrome. */
function BoardLedger({
  board,
}: {
  board: BoardSection;
}) {
  const spec = BOARD_REGISTRY.find((s) => s.key === board.board)!;
  return (
    <section
      className="obj-ledger min-w-0 lg:col-span-8"
      aria-label={board.title}
      data-testid={`board-${board.board}`}
    >
      <div className="obj-ledger-head">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{board.title}</h2>
          <p className="mt-0.5 text-xs text-subtle">{board.explanation}</p>
        </div>
        <p className="shrink-0 text-right text-xs text-subtle">
          Ranks by: {spec.metric}
          <span className="mt-1 block text-subtle/80">{board.minimumEvidence}</span>
        </p>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <caption className="sr-only">{board.title} ledger</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-kicker text-subtle">
              <th scope="col" className="obj-cell w-10">Rank</th>
              <th scope="col" className="obj-cell">Member</th>
              <th scope="col" className="obj-cell text-right tabular">{spec.metric}</th>
            </tr>
          </thead>
          <tbody>
            {board.rows.length === 0 ? (
              <tr>
                <td className="obj-cell" aria-hidden="true"></td>
                <td className="obj-cell">
                  <div className="obj-ghost-bar w-40" aria-hidden="true" />
                  <p className="mt-2 text-xs text-muted">No eligible records yet.</p>
                </td>
                <td className="obj-cell text-right">
                  <div className="obj-ghost-bar ml-auto w-16" aria-hidden="true" />
                </td>
              </tr>
            ) : (
              board.rows.map((r, i) => (
                <tr key={r.userId}>
                  <td className="obj-cell text-right text-xs font-semibold tabular text-subtle">
                    {i + 1}
                  </td>
                  <td className="obj-cell">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.displayName ?? r.handle ?? "member"} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {r.displayName ?? r.handle ?? "member"}
                          {r.handle ? (
                            <span className="ml-1.5 text-xs text-subtle">@{r.handle}</span>
                          ) : null}
                        </span>
                        {r.skills.length > 0 ? (
                          <SkillTags skills={r.skills} max={2} className="mt-0.5" />
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td className="obj-cell tabular text-right text-xs font-medium">
                    {spec.format(r.metric, r.experience)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The board selector: all registry boards, one active, link-backed. */
function BoardRail({
  current,
  sections,
}: {
  current: BoardKey;
  sections: BoardSection[];
}) {
  return (
    <nav
      aria-label="Leaderboard boards"
      className="obj-board-rail min-w-0 lg:col-span-4"
      data-testid="board-rail"
    >
      <p className="px-3 py-2 text-xs font-semibold uppercase tracking-kicker text-subtle">
        Boards
      </p>
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {sections.map((s) => {
          const active = s.board === current;
          return (
            <li key={s.board} className="shrink-0 lg:shrink">
              <a
                href={`/leaderboards?board=${s.board}`}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "obj-rail-active block rounded-sm px-3 py-2 text-sm font-semibold"
                    : "block rounded-sm px-3 py-2 text-sm text-muted transition-colors duration-150 hover:text-fg"
                }
              >
                <span className="block">{s.title}</span>
                <span className="block text-[11px] font-normal normal-case tracking-normal text-subtle">
                  {s.metric}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
