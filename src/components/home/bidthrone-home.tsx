import { linkOrigin, product, PRODUCT_KEYS, type ProductKey } from "@/lib/host";
import { FoundingAccess } from "@/components/founding-access";
import { JsonLd } from "@/components/seo";
import { bidNetworkOrganization, websiteSchema } from "@/lib/schema";
import type { ShellMe } from "@/components/product-shell";
import type { HomeMarketRate, HomePreview } from "@/lib/marketplace/home-preview.server";
import type { LeaderboardRow } from "@/lib/marketplace/reputation";
import { Kicker } from "@/components/home/shared";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/identity";
import { SectionHeader } from "@/components/ui/layout";
import { PublicRecordCard } from "@/components/product-objects/public-record-card";
import { GhostBoard } from "@/components/product-objects/ghost-board";
import { MarketRatesPreview } from "@/components/product-objects/market-rates-preview";

/**
 * Bidthrone home (RC5 §23): the public record. Data-first: the sample
 * record card shows the SHAPE of a real record (NR, zero counters, dashed
 * review slots, neutral timeline — no invented numbers or people), the
 * lower grid previews the two products that are Bidthrone's reason to
 * exist (the leaderboards and Market Rates), and the methodology teaser
 * points at /bid-index.
 *
 * Taxonomy (§23.12): the Bid Index is the personal 300-900 trust model;
 * Market Rates is the category pricing aggregate. They never share copy,
 * shapes, or numbers.
 */
type HomeBoards = Extract<HomePreview, { kind: "boards" }>["boards"];

export function BidthroneHome({ me, preview }: { me?: ShellMe | null; preview: HomePreview }) {
  const boards = preview.kind === "boards" ? preview.boards : [];
  const marketRates = preview.kind === "boards" ? (preview.marketRates ?? []) : [];
  const others = PRODUCT_KEYS.filter((key) => key !== "bidthrone");

  return (
    <>
      <ThroneHero me={me} />
      <ThroneGrid boards={boards} marketRates={marketRates} />
      <BidIndexTeaser />
      <Principles />
      <NetworkSection others={others} />
      <WriteUpSection />
      <section className="canvas-brand pb-16">
        <FoundingAccess
          site="bidthrone"
          heading="Stay updated"
          intro="We will email people on this list when funding opens or when a new leaderboard goes live. No other updates, no marketing list."
          ctaLabel="Notify me"
        />
      </section>
      <JsonLd data={[bidNetworkOrganization(), websiteSchema("bidthrone")]} />
    </>
  );
}

/** 1 — Hero: the statement left, the sample record right. */
function ThroneHero({ me }: { me?: ShellMe | null }) {
  const primary = me
    ? me.handle
      ? { label: "My profile", href: `/profile/${me.handle}` }
      : { label: "Dashboard", href: "/dashboard" }
    : { label: "Create your record", href: "/signup" };
  return (
    <section className="canvas-brand grid grid-cols-1 gap-10 pt-14 sm:pt-20 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Kicker>Bidthrone</Kicker>
        <h1 className="obj-hero-type mt-5">
          Reputation built{" "}
          <span className="block">from work,</span>{" "}
          <span className="block text-subtle">not self-promotion.</span>
        </h1>
        <p className="obj-hero-lead mt-5 text-muted">
          A portfolio shows selected work. A testimonial is a selected
          opinion. A public record here shows outcomes the platform
          verified: bounties won, projects completed, teams captained, and
          the reviews written by the people involved.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href={primary.href} size="lg">
            {primary.label}
          </ButtonLink>
          <ButtonLink href="/bid-index" variant="secondary" size="lg">
            The Bid Index
          </ButtonLink>
          <ButtonLink href="/leaderboards" variant="secondary" size="lg">
            Leaderboards
          </ButtonLink>
          <ButtonLink href="/market-rates" variant="secondary" size="lg">
            Market rates
          </ButtonLink>
        </div>
      </div>
      <div className="lg:col-span-5">
        <PublicRecordCard />
      </div>
    </section>
  );
}

/**
 * 2 — The lower grid (§23.9): leaderboard preview (left, 1.1fr) and Market
 * Rates preview (right, 0.9fr). Not the old aggregate "Bid Index" preview.
 */
function ThroneGrid({
  boards,
  marketRates,
}: {
  boards: HomeBoards;
  marketRates: HomeMarketRate[];
}) {
  return (
    <section className="canvas-brand mt-14 sm:mt-16 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      {/* min-w-0 on both grid items: the ghost ledger min-width table must
          scroll inside its container, never push the page (390px). */}
      <div className="min-w-0">
        <SectionHeader
          title="Leaderboard preview"
          aside={
            <a href="/leaderboards" className="text-xs font-medium text-accent underline underline-offset-4">
              All boards
            </a>
          }
        />
        <div className="mt-4">
          <LeaderboardPreview boards={boards} />
        </div>
      </div>
      <div className="min-w-0">
        <SectionHeader
          title="Market rates"
          aside={
            <a href="/market-rates" className="text-xs font-medium text-accent underline underline-offset-4">
              See the market data
            </a>
          }
        />
        <div className="mt-4" data-testid="home-market-rates">
          <MarketRatesPreview rows={marketRates} />
        </div>
      </div>
    </section>
  );
}

/** Real rows when any board has members; otherwise the ghost ledger. */
function LeaderboardPreview({ boards }: { boards: HomeBoards }) {
  if (!boards.some((b) => b.rows.length > 0)) {
    return (
      <GhostBoard
        headers={["Member", "Metric"]}
        note="No eligible records yet. Boards fill from completed work only; nothing is seeded, and empty is better than fake."
      />
    );
  }
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {boards.map((b) => (
        <div key={b.key}>
          <h2 className="text-sm font-semibold">{b.name}</h2>
          {b.rows.length === 0 ? (
            <p className="mt-2 text-xs text-muted">No eligible records yet.</p>
          ) : (
            <ol className="mt-2">
              {b.rows.map((r, i) => (
                <BoardRow key={r.userId} rank={i + 1} row={r} />
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}

function BoardRow({ rank, row }: { rank: number; row: LeaderboardRow }) {
  const name = row.displayName ?? (row.handle ? `@${row.handle}` : "member");
  return (
    <li className="row-line flex items-center gap-3 py-2.5">
      <span className="w-5 shrink-0 text-right text-xs font-semibold tabular text-subtle">{rank}</span>
      <Avatar name={name} size="sm" />
      <a
        href={row.handle ? `/profile/${row.handle}` : "/leaderboards"}
        className="min-w-0 flex-1 truncate text-sm font-medium hover:underline hover:underline-offset-4"
      >
        {name}
      </a>
    </li>
  );
}

function Principle({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function Principles() {
  return (
    <section className="canvas-brand mt-14">
      <SectionHeader title="How the record works" />
      <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Principle title="Earned from completed work">
          A member's numbers come from outcomes the platform verified:
          bounties won, projects carried to completion, teams captained.
          There is no self-declared input.
        </Principle>
        <Principle title="Not for sale">
          No placement fee, no featured slot, no button that boosts a
          profile. Every value on a public record traces back to a
          completed outcome.
        </Principle>
        <Principle title="Reviews from the people involved">
          After a piece of work completes, both sides leave a review tied to
          that specific job. You see who wrote what, and when.
        </Principle>
        <Principle title="Disputes stay in the record">
          When something goes wrong, the record shows it next to the
          completion. An honest track record beats a curated highlight reel.
        </Principle>
      </div>
    </section>
  );
}

/** The Bid Index methodology teaser (§23.14: personal 300-900, not pricing). */
function BidIndexTeaser() {
  return (
    <section className="canvas-brand mt-14">
      <SectionHeader
        title="The Bid Index"
        aside={
          <a href="/bid-index" className="text-xs font-medium text-accent underline underline-offset-4">
            Methodology and your report
          </a>
        }
      />
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
        The Bid Index is a personal 300 to 900 trust score built from what
        actually happened: work completed, commitments honoured, disputes
        resolved, and the size and difficulty of the obligations involved.
        Three role scores (Provider, Sponsor, Captain) keep the picture
        honest. It is not a credit score, it cannot be bought, and it starts
        as NR until real evidence exists.
      </p>
    </section>
  );
}

function NetworkSection({ others }: { others: ProductKey[] }) {
  return (
    <section className="canvas-brand mt-14">
      <SectionHeader title="What the network does" />
      <div className="mt-4">
        {others.map((key) => {
          const p = product(key);
          return (
            <a
              key={key}
              href={`${linkOrigin(key)}/`}
              className="row-line flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1 py-3 transition-colors duration-150 hover:bg-surface/70"
            >
              <span className="font-display-site text-lg tracking-tight">{p.name}</span>
              <span className="text-xs text-subtle">{p.apex}</span>
              <span className="min-w-0 flex-1 text-sm text-muted">
                {key === "foundersbid" &&
                  "Startup work with a published budget: bounties for bounded competitive work, projects when you choose one provider first."}
                {key === "culturebid" &&
                  "Paid creative briefs with capped entries and rules that are public before the work starts."}
                {key === "bidception" &&
                  "One project, one budget, a team of specialists. A paid captain splits the work into funded parts."}
              </span>
              <span aria-hidden="true" className="text-sm text-subtle">→</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function WriteUpSection() {
  return (
    <section className="canvas-brand mt-14 pb-4">
      <SectionHeader title="The write up" />
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        Why portfolios, testimonials, and star averages each hide something,
        and what a public work record shows instead.
      </p>
      <a
        href="/blog/reputation-from-completed-work"
        className="mt-2 inline-block text-sm font-medium text-accent underline underline-offset-4"
      >
        A portfolio tells you what someone says they did. We want the work record.
      </a>
    </section>
  );
}
