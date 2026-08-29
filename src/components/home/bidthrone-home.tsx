import { linkOrigin, product, PRODUCT_KEYS } from "@/lib/host";
import { FoundingAccess } from "@/components/founding-access";
import { JsonLd } from "@/components/seo";
import { bidNetworkOrganization, websiteSchema } from "@/lib/schema";
import type { ShellMe } from "@/components/product-shell";
import type { HomePreview } from "@/lib/marketplace/home-preview.server";
import type { LeaderboardRow } from "@/lib/marketplace/reputation";
import { Kicker } from "@/components/home/shared";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/identity";
import { SectionHeader } from "@/components/ui/layout";
import { InlineNotice } from "@/components/ui/states";

/**
 * Bidthrone home (RC3, S-28): data-first. The leaderboards and the Bid
 * Index ARE the page — real rows when they exist, honest empty states when
 * they don't. Explanatory chrome is minimal and secondary.
 */
type HomeBoards = Extract<HomePreview, { kind: "boards" }>["boards"];

export function BidthroneHome({ me, preview }: { me?: ShellMe | null; preview: HomePreview }) {
  const boards = preview.kind === "boards" ? preview.boards : [];
  const bidIndexReady = preview.kind === "boards" ? preview.bidIndexReady : false;
  const others = PRODUCT_KEYS.filter((key) => key !== "bidthrone");

  return (
    <>
      {/* Compact hero: the record, in one paragraph. */}
      <section className="canvas-wide pt-14 sm:pt-20">
        <Kicker>Bidthrone</Kicker>
        <h1 className="mt-4 max-w-3xl font-display-site text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl">
          Reputation built from work,{" "}
          <span className="block text-subtle">not self-promotion.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          A portfolio shows selected work. A testimonial is a selected
          opinion. A public profile here shows outcomes the platform
          verified: bounties won, projects completed, teams captained, and
          the reviews written by the people involved.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href="/leaderboards" size="lg">
            See the leaderboards
          </ButtonLink>
          <ButtonLink href="/bid-index" variant="secondary" size="lg">
            See the Bid Index
          </ButtonLink>
          {me ? (
            <a href="/dashboard" className="inline-flex h-11 items-center px-1 text-sm font-medium text-accent underline underline-offset-4">
              Your dashboard
            </a>
          ) : (
            <a href="/signup" className="inline-flex h-11 items-center px-1 text-sm font-medium text-accent underline underline-offset-4">
              Create an account
            </a>
          )}
        </div>
      </section>

      <LiveBoards boards={boards} />
      <MarketSignal bidIndexReady={bidIndexReady} />
      <Principles />
      {/* The rest of the network. */}
      <section className="canvas-wide mt-12">
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

      <section className="canvas-wide mt-12">
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

      <section className="canvas-wide mt-12 pb-16">
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
      {row.handle ? <span className="hidden text-xs text-subtle sm:block">@{row.handle}</span> : null}
    </li>
  );
}

function Principle({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-fg/10 pt-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}
/** The data: live boards when members have verified outcomes. */
function LiveBoards({ boards }: { boards: HomeBoards }) {
  return (
        <section className="canvas-wide mt-12 sm:mt-14">
          <SectionHeader
            title="Leaderboards"
            aside={
              <a href="/leaderboards" className="text-xs font-medium text-accent underline underline-offset-4">
                All boards and methodology
              </a>
            }
          />
          {boards.some((b) => b.rows.length > 0) ? (
            <div className="mt-4 grid gap-6 lg:grid-cols-3">
              {boards.map((b) => (
                <div key={b.key}>
                  <h2 className="text-sm font-semibold">{b.name}</h2>
                  <ol className="mt-2">
                    {b.rows.map((r, i) => (
                      <BoardRow key={r.userId} rank={i + 1} row={r} />
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <InlineNotice>
                No member has enough verified outcomes to rank yet. Boards fill
                from completed work only; nothing is seeded, and empty is
                better than fake.
              </InlineNotice>
            </div>
          )}
        </section>
  
  );
}
/** The market: the sample-gated Bid Index signal. */
function MarketSignal({ bidIndexReady }: { bidIndexReady: boolean }) {
  return (
        <section className="canvas-wide mt-12">
          <SectionHeader title="Bid Index" />
          {bidIndexReady ? (
            <div className="mt-4">
              <p className="max-w-2xl text-sm leading-relaxed text-muted">
                Market benchmarks now exist: categories with enough verified,
                settled outcomes publish their median, range, and sample size on
                the Bid Index.
              </p>
              <a href="/bid-index" className="mt-3 inline-block text-sm font-medium text-accent underline underline-offset-4">
                See the market data
              </a>
            </div>
          ) : (
            <div className="mt-4">
              <p className="max-w-2xl text-sm leading-relaxed text-muted">
                The Bid Index publishes only when a category has at least ten
                verified, settled outcomes. Until then it shows{" "}
                <span className="font-medium">Insufficient sample</span> instead
                of inventing a price. That is the product working as designed.
              </p>
              <a href="/bid-index" className="mt-3 inline-block text-sm font-medium text-accent underline underline-offset-4">
                See the current state
              </a>
            </div>
          )}
        </section>
  
  );
}
/** The principles, quiet: type + rules, not a card wall. */
function Principles() {
  return (
        <section className="canvas-wide mt-12">
          <SectionHeader title="How the record works" />
          <div className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Principle title="Earned from completed work">
              A member's numbers come from outcomes the platform verified:
              bounties won, projects carried to completion, teams captained.
              There is no self-declared input.
            </Principle>
            <Principle title="Not for sale">
              No placement fee, no featured slot, no button that boosts a
              profile. Every value on a public profile traces back to a
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
