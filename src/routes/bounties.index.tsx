import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { listOpenBounties } from "@/lib/marketplace/queries.server";
import { formatMinor } from "@/lib/money";

/**
 * /bounties — the public marketplace listing (Phase 01, FR-3). Server-side
 * filtering + cursor pagination over indexed queries; honest empty state.
 * Marketplace routes are FoundersBid surfaces; other hosts 302 (middleware).
 */
const loadBounties = createServerFn({ method: "GET" })
  .validator((input: { category?: string; sort?: string; cursor?: string | null; rewardMin?: number }) =>
    z
      .object({
        category: z.string().trim().max(40).optional(),
        sort: z.enum(["newest", "ending_soon", "reward"]).default("newest"),
        cursor: z.string().nullable().default(null),
        rewardMin: z.number().int().min(1).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const product = await currentProductKey();
    const { me } = await (await import("@/lib/shell-context")).getShellContext();
    const result = await listOpenBounties(sql, product, {
      category: data.category,
      sort: data.sort as "newest" | "ending_soon" | "reward",
      cursor: data.cursor,
      rewardMinMinor: data.rewardMin,
      limit: 20,
    });
    return { ...result, product, me };
  });

export const Route = createFileRoute("/bounties/")({
  validateSearch: z.object({
    category: z.string().optional(),
    sort: z.enum(["newest", "ending_soon", "reward"]).optional(),
    cursor: z.string().optional(),
  }),
  loaderDeps: ({ search }) => [search.category, search.sort, search.cursor],
  loader: ({ deps }) =>
    loadBounties({ data: { category: deps[0], sort: deps[1] ?? "newest", cursor: deps[2] ?? null } }),
  component: BountiesPage,
});

function BountiesPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const appliedSort = search.sort ?? "newest";
  const hasFilters = Boolean(search.category || (search.sort && search.sort !== "newest"));

  return (
    <ProductShell site={data.product} me={data.me}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">FoundersBid</p>
            <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">Open bounties</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Funded problems, real rewards. Every listing here is funded before
              it can be open — the advertised reward is exactly what winners
              receive.
            </p>
          </div>
          <Link
            to="/bounties/new"
            className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
          >
            Post a bounty
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filters">
          {["newest", "ending_soon", "reward"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                void navigate({ to: "/bounties", search: { ...search, sort: s as never, cursor: undefined } });
              }}
              className={
                appliedSort === s
                  ? "rounded-full border-2 border-fg bg-fg px-3 py-1 text-xs font-semibold text-bg"
                  : "rounded-full border-2 border-fg/20 px-3 py-1 text-xs font-medium"
              }
            >
              {s === "newest" ? "Newest" : s === "ending_soon" ? "Ending soon" : "Top reward"}
            </button>
          ))}
          {hasFilters ? (
            <button
              type="button"
              className="rounded-full px-3 py-1 text-xs text-subtle underline underline-offset-2"
              onClick={() => void navigate({ to: "/bounties", search: {} })}
            >
              Clear
            </button>
          ) : null}
        </div>

        {data.items.length === 0 ? (
          <div className="mt-10 rounded-lg border-2 border-dashed border-fg/20 bg-surface p-10 text-center">
            <h2 className="font-display-site text-xl tracking-tight">
              {hasFilters ? "No open bounties match those filters yet." : "No open bounties yet."}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              FoundersBid just opened its marketplace — the first funded bounties
              will appear here as sponsors post them. Nothing on this page is
              fabricated; empty means empty.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/bounties/new" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg">
                Post the first bounty
              </Link>
              <Link to="/" className="inline-flex h-10 items-center rounded-md border-2 border-fg/20 px-4 text-sm font-medium">
                How FoundersBid works
              </Link>
            </div>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {data.items.map((b) => (
              <li key={b.id}>
                <Link
                  to="/bounties/$id"
                  params={{ id: b.id }}
                  className="block rounded-lg border-2 border-fg/15 bg-surface p-4 transition-colors hover:border-fg/40 sm:p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
                        {b.category} · {b.reward_structure.replaceAll("_", " ").toLowerCase()}
                      </p>
                      <h2 className="mt-1 truncate font-display-site text-lg tracking-tight">{b.title}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {b.participants}/{b.participant_cap} participants · ends{" "}
                        {new Date(b.submission_deadline).toISOString().slice(0, 10)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display-site text-xl tracking-tight text-accent">
                        {formatMinor(b.reward_total_minor, b.currency)}
                      </p>
                      <p className="text-xs text-subtle">{b.status}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {data.nextCursor ? (
          <div className="mt-6 text-center">
            <button
              type="button"
              className="inline-flex h-10 items-center rounded-md border-2 border-fg/20 px-4 text-sm font-medium"
              onClick={() => {
                void navigate({
                  to: "/bounties",
                  search: { ...search, cursor: data.nextCursor ?? undefined },
                });
              }}
            >
              Older bounties →
            </button>
          </div>
        ) : null}
      </div>
    </ProductShell>
  );
}