import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Camera, Clapperboard, Mic, PenTool, Tag, Type, Users, Video, Wrench } from "lucide-react";
import { currentProductKey, product, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { listOpenBounties } from "@/lib/marketplace/queries.server";
import { categoriesFor } from "@/lib/marketplace/categories";
import { statusLabel } from "@/lib/marketplace/status-labels";
import { deadlinePhrase, absoluteDate } from "@/lib/reltime";
import { MoneyValue } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { PageHeader } from "@/components/ui/layout";
import { FilterBar, FilterChip, SortControl } from "@/components/ui/market";
import { artForCategory } from "@/components/product-objects/category-art";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/seo";
import { itemListSchema } from "@/lib/schema";

/**
 * /bounties — the public marketplace browse (Phase 01, FR-3; RC3, S-24/S-26).
 * One route serves FoundersBid bounties and CultureBid creative bounties;
 * the product context (host) decides the morphology: dense scannable rows
 * (FoundersBid) vs. creative-format cards (CultureBid). All filters are
 * backed by the query layer and encoded in the URL (back/forward + deep
 * links work; nothing is a fake chip).
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
    const productKey = await currentProductKey();
    const { me, funding } = await (await import("@/lib/shell-context")).getShellContext();
    const result = await listOpenBounties(sql, productKey, {
      category: data.category,
      sort: data.sort,
      cursor: data.cursor,
      rewardMinMinor: data.rewardMin,
      limit: 20,
    });
    return { ...result, product: productKey, me, funding };
  });

export const Route = createFileRoute("/bounties/")({
  validateSearch: z.object({
    category: z.string().optional(),
    sort: z.enum(["newest", "ending_soon", "reward"]).optional(),
    cursor: z.string().optional(),
    rewardMin: z.coerce.number().int().min(0).optional(),
  }),
  loaderDeps: ({ search }) => [
    search.category,
    search.sort,
    search.cursor,
    search.rewardMin != null ? String(search.rewardMin) : undefined,
  ],
  loader: ({ deps }) =>
    loadBounties({
      data: {
        category: deps[0],
        sort: deps[1] ?? "newest",
        cursor: deps[2] ?? null,
        rewardMin: deps[3] ? Number(deps[3]) : undefined,
      },
    }),
  component: BountiesPage,
});

const FORMAT_ICONS: Record<string, typeof Camera> = {
  ugc: Users,
  "social content": Users,
  video: Video,
  "short video": Clapperboard,
  photography: Camera,
  illustration: PenTool,
  design: PenTool,
  naming: Tag,
  writing: Type,
  memes: Type,
  music: Mic,
  "brand challenge": Wrench,
};

function BountiesPage() {
  const data = Route.useLoaderData();
  const pKey = data.product as ProductKey;
  const isCulture = pKey === "culturebid";
  const listTitle = isCulture ? "Creative bounties" : "Open bounties";
  const articleSlug = isCulture ? "fair-creative-bounty" : "bounty-or-project";

  return (
    <ProductShell site={pKey} me={data.me} funding={data.funding}>
      <div className="canvas-wide pb-16">
        <PageHeader
          kicker={product(pKey).name}
          title={listTitle}
          lead={
            isCulture
              ? "Paid creative briefs with a published reward, a deadline, and a capped number of creator slots. Every brief states the rules before anyone starts."
              : "Bounded work with a fixed reward and a deadline. A bounty opens only once its reward is funded, and the advertised reward is exactly what the winner receives."
          }
          actions={
            <ButtonLink href="/bounties/new" variant="secondary">
              {isCulture ? "Post a brief" : "Post a bounty"}
            </ButtonLink>
          }
        />

        <Browse
          items={data.items}
          nextCursor={data.nextCursor}
          isCulture={isCulture}
          articleSlug={articleSlug}
          listTitle={listTitle}
        />

        {data.items.length > 0 ? (
          <JsonLd
            data={itemListSchema(
              pKey,
              data.items.map((b) => ({
                name: b.title,
                url: `${seoOrigin(pKey)}/bounties/${b.id}`,
              })),
            )}
          />
        ) : null}
      </div>
    </ProductShell>
  );
}

function Browse({
  items,
  nextCursor,
  isCulture,
  articleSlug,
  listTitle,
}: {
  items: Awaited<ReturnType<typeof loadBounties>>["items"];
  nextCursor: string | null;
  isCulture: boolean;
  articleSlug: string;
  listTitle: string;
}) {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const categories = categoriesFor((isCulture ? "culturebid" : "foundersbid") as ProductKey);
  const hasFilters = Boolean(search.category || search.sort || search.rewardMin || search.cursor);

  const setFilter = (patch: Record<string, string | number | undefined>) => {
    void navigate({
      to: "/bounties",
      search: { ...search, ...patch, cursor: undefined },
    });
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title={
          hasFilters
            ? "Nothing matches these filters."
            : isCulture
              ? "No open creative bounties yet."
              : "No open bounties yet."
        }
        body={
          hasFilters ? (
            <>
              Try clearing a filter, or post the work you are looking for instead of waiting for it to appear.
            </>
          ) : isCulture ? (
            <>
              Brands post creative briefs with a reward, a deadline, and a capped field of creators. The first live briefs will appear here.
            </>
          ) : (
            <>
              A bounty is bounded work with a fixed reward: the sponsor posts it, a capped set of people compete, and the winner is paid the advertised amount. The first live bounties will appear here.
            </>
          )
        }
        action={
          <>
            {hasFilters ? (
              <ButtonLink variant="secondary" size="sm" href="/bounties">
                Clear filters
              </ButtonLink>
            ) : null}
            <ButtonLink href="/bounties/new" size="sm">
              {isCulture ? "Post a brief" : "Post a bounty"}
            </ButtonLink>
            <Link to="/blog/$slug" params={{ slug: articleSlug }} className="inline-flex h-8 items-center rounded-sm border border-fg/25 px-3 text-xs font-medium">
              {isCulture ? "How a fair creative bounty works" : "Bounty or project: how the two modes differ"}
            </Link>
          </>
        }
      />
    );
  }

  return (
    <>
      <div className="mt-6">
        <BountyFilters
          categories={categories}
          search={search}
          resultCount={`${items.length} shown`}
          hasFilters={hasFilters}
          onFilter={setFilter}
        />
      </div>

      {isCulture ? (
        /* RC5 §21: the creative gallery (wide 2-up, mobile 1-up). */
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((b) => (
            <CultureCard key={b.id} bounty={b} />
          ))}
        </div>
      ) : (
        /* RC5 §20.7: the job board (3-up where comfortable, 2 tablet, 1 mobile). */
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((b) => (
            <FounderCard key={b.id} bounty={b} />
          ))}
        </div>
      )}

      {nextCursor ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-sm border border-fg/25 px-4 text-sm font-medium transition-colors duration-150 hover:border-fg/50"
            onClick={() => setFilter({ cursor: nextCursor ?? undefined })}
          >
            Older {listTitle.toLowerCase()}
          </button>
        </div>
      ) : null}
    </>
  );
}

function SponsorLine({ name, handle }: { name: string | null; handle: string | null }) {
  if (!name && !handle) return null;
  return (
    <span className="text-xs text-subtle">
      by {name ?? "a member"}
      {handle ? ` (@${handle})` : ""}
    </span>
  );
}

function FounderCard({ bounty: b }: { bounty: Awaited<ReturnType<typeof loadBounties>>["items"][number] }) {
  const deadline = deadlinePhrase(b.submission_deadline);
  return (
    <a
      href={`/bounties/${b.id}`}
      className="group rounded-md border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[15px] font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
          {b.title}
        </p>
        <div className="shrink-0 text-right">
          <MoneyValue minor={b.reward_total_minor} currency={b.currency} size="md" className="text-accent" trimZeroDecimals />
          <p className="text-[11px] text-subtle">advertised reward</p>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-subtle">
        {b.category} · {statusLabel(b.reward_structure)} · <SponsorLine name={b.sponsor_name} handle={b.sponsor_handle} />
      </p>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-subtle">
        <span title={absoluteDate(b.submission_deadline)}>
          {b.participants}/{b.participant_cap} taking part · {deadline}
        </span>
        <StatusBadge status={b.status} />
      </div>
    </a>
  );
}

function CultureCard({ bounty: b }: { bounty: Awaited<ReturnType<typeof loadBounties>>["items"][number] }) {
  const formats = b.creative?.formats ?? [];
  const Icon = formats.length > 0 ? (FORMAT_ICONS[formats[0]] ?? Camera) : Camera;
  // RC5 §21.6: real cards use only real stored fields. usageNotes when
  // present; never inferred perpetual / exclusive / paid amplification.
  const licenseLine = b.creative?.usageNotes ?? "See brief for usage terms";
  return (
    <Link
      to="/bounties/$id"
      params={{ id: b.id }}
      className="group block"
    >
      <figure className="brief-tile">
        <img src={artForCategory(b.category)} alt="" className="brief-poster-media" loading="lazy" />
        <div className="brief-tile-overlay" aria-hidden="true" />
        <figcaption className="brief-tile-content">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-sm bg-black/30 text-white">
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                {b.category}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium leading-snug">
              {b.title}
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <MoneyValue minor={b.reward_total_minor} currency={b.currency} size="sm" className="text-white" trimZeroDecimals />
            <span className="text-white/80">
              {b.participants}/{b.participant_cap} slots · {deadlinePhrase(b.submission_deadline)}
            </span>
          </div>
          <p className="text-[11px] text-white/70">{licenseLine}</p>
        </figcaption>
      </figure>
      <div className="mt-2 flex items-center justify-between px-1">
        <StatusBadge status={b.status} />
        <span className="text-xs text-subtle">
          {formats.slice(0, 2).join(" · ")}
          {b.creative?.targetPlatform ? ` · for ${b.creative.targetPlatform}` : ""}
        </span>
      </div>
    </Link>
  );
}

/** URL-backed browse filters (RC3, S-24): every control maps to a real query param. */
function BountyFilters({
  categories,
  search,
  resultCount,
  hasFilters,
  onFilter,
}: {
  categories: string[];
  search: { category?: string; sort?: "newest" | "ending_soon" | "reward"; cursor?: string; rewardMin?: number };
  resultCount: string;
  hasFilters: boolean;
  onFilter: (patch: Record<string, string | number | undefined>) => void;
}) {
  return (
    <FilterBar resultCount={resultCount}>
      {categories.map((c) => (
        <FilterChip
          key={c}
          active={search.category === c}
          onClick={() => onFilter({ category: search.category === c ? undefined : c })}
        >
          {c.charAt(0).toUpperCase() + c.slice(1)}
        </FilterChip>
      ))}
      <SortControl
        label="Sort"
        value={search.sort ?? "newest"}
        options={[
          { value: "newest", label: "Newest" },
          { value: "ending_soon", label: "Ending soon" },
          { value: "reward", label: "Top reward" },
        ]}
        onChange={(v) => onFilter({ sort: v === "newest" ? undefined : v })}
      />
      <label className="flex items-center gap-1.5 text-xs text-muted">
        <span>Min reward (₹)</span>
        <input
          type="number"
          min={0}
          value={search.rewardMin ?? ""}
          onChange={(e) => onFilter({ rewardMin: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="Any"
          className="h-9 w-28 rounded-sm border border-fg/20 bg-surface px-2 text-xs tabular"
        />
      </label>
      {hasFilters ? (
        <button
          type="button"
          onClick={() => onFilter({ category: undefined, sort: undefined, rewardMin: undefined })}
          className="h-9 px-2 text-xs text-subtle underline underline-offset-2"
        >
          Clear
        </button>
      ) : null}
    </FilterBar>
  );
}
