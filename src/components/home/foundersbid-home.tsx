import { FoundingAccess } from "@/components/founding-access";
import { JsonLd } from "@/components/seo";
import { websiteSchema } from "@/lib/schema";
import { Kicker } from "@/components/home/shared";
import type { ShellMe } from "@/components/product-shell";
import type { HomePreview } from "@/lib/marketplace/home-preview.server";
import { MoneyValue } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { SectionHeader } from "@/components/ui/layout";
import { deadlinePhrase, absoluteDate } from "@/lib/reltime";

const CATEGORIES = [
  "Web development",
  "Design",
  "Research",
  "Writing",
  "Data & analysis",
  "Marketing",
  "Automation",
  "Product",
];

/**
 * FoundersBid home (RC3, S-24): marketplace-first.
 * Hierarchy: hero (7/5, live preview when real inventory exists) -> open
 * work -> bounty vs project choice -> categories -> funding note (small,
 * once) -> educational link. No explanatory paragraph wall before the
 * marketplace.
 */
type HomeOpenItem = Extract<HomePreview, { kind: "bounties" }>["items"];

export function FoundersbidHome({ me, preview }: { me?: ShellMe | null; preview: HomePreview }) {
  const openItems = preview.kind === "bounties" ? preview.items : [];

  return (
    <>
      <HomeHero me={me} openItems={openItems} />
      {/* 2 — Real open work, or the honest empty state. */}
      <HomeOpenNow openItems={openItems} />

      <HomeModes />
      {/* 4 — Categories. */}
      <section className="canvas-wide py-6">
        <SectionHeader title="Kinds of work you can post" />
        <ul className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <li
              key={category}
              className="rounded-full border border-fg/15 bg-surface px-3 py-1.5 text-sm text-muted"
            >
              {category}
            </li>
          ))}
        </ul>
      </section>

      {/* 5 — Funding state: small, once, honest. */}
      <section className="canvas-wide py-6">
        <p className="max-w-2xl text-sm leading-relaxed text-muted" data-testid="funding-note">
          Accounts, profiles, and drafts work today. Funding is not enabled
          yet, so nothing on this site takes payment now.
        </p>
      </section>

      {/* 6 — Educational, secondary. */}
      <section className="canvas-wide py-6">
        <SectionHeader title="The write up" />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          When a job should be a competition, when it should be a proposal,
          and what the rules look like before the work starts.
        </p>
        <a
          href="/blog/bounty-or-project"
          className="mt-2 inline-block text-sm font-medium text-accent underline underline-offset-4"
        >
          Small startup jobs are too important for a backlog
        </a>
      </section>

      <JsonLd data={[websiteSchema("foundersbid")]} />

      {/* 7 — Launch updates, secondary. */}
      <section className="canvas-wide pb-16">
        <FoundingAccess
          site="foundersbid"
          heading="Want to know when funding opens?"
          intro="Leave your email and we will write once payments go live on FoundersBid. No other updates, no marketing list."
          ctaLabel="Notify me"
        />
      </section>
    </>
  );
}

/** 1 — Hero, 7/5 composition (RC3, S-24). */
function HomeHero({ me, openItems }: { me: ShellMe | null | undefined; openItems: HomeOpenItem }) {
    return (
                <section className="canvas-wide grid grid-cols-1 gap-8 pt-14 sm:pt-20 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Kicker>FoundersBid</Kicker>
            <h1 className="mt-4 font-display-site text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl">
              Get startup work done{" "}
              <span className="block text-subtle">without hiring a whole team.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              You have work that is too small for a full-time hire and too
              important to leave in the backlog. Post it with a clear scope, a
              budget, and a deadline. People who want to do it step forward.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/post"
                className="inline-flex h-12 items-center rounded-sm bg-accent px-5 text-sm font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent/90"
              >
                Post work
              </a>
              <a
                href="/bounties"
                className="inline-flex h-12 items-center rounded-sm border border-fg/25 px-5 text-sm font-semibold transition-colors duration-150 hover:border-fg/50"
              >
                Find work
              </a>
              {me ? (
                <a href="/dashboard" className="text-sm font-medium text-accent underline underline-offset-4">
                  Your dashboard
                </a>
              ) : (
                <a href="/signup" className="text-sm font-medium text-accent underline underline-offset-4">
                  Create an account
                </a>
              )}
            </div>
          </div>
  
          {/* Live marketplace preview, or a clearly labelled example. */}
          <div className="lg:col-span-5">
            {openItems.length > 0 ? (
              <div className="rounded-md border border-fg/10 bg-surface/60 p-4" aria-label="Live opportunities right now">
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Open right now</p>
                <ul className="mt-3 space-y-3">
                  {openItems.slice(0, 3).map((b) => (
                    <li key={b.id}>
                      <a href={`/bounties/${b.id}`} className="block rounded-sm p-2 -m-2 transition-colors duration-150 hover:bg-raised/60">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-sm font-semibold hover:underline hover:underline-offset-4">{b.title}</span>
                          <MoneyValue minor={b.reward_total_minor} currency={b.currency} size="sm" className="shrink-0 text-accent" />
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-subtle">
                          <span>{b.category} · {b.participants}/{b.participant_cap} taking part</span>
                          <span title={absoluteDate(b.submission_deadline)}>{deadlinePhrase(b.submission_deadline)}</span>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
                <a href="/bounties" className="mt-3 inline-block text-xs font-medium text-accent underline underline-offset-4">
                  See all open bounties
                </a>
              </div>
            ) : (
              <div className="rounded-md border border-fg/10 bg-surface/60 p-4" aria-label="Example opportunity (not live)">
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Example, not live work</p>
                <p className="mt-3 font-display-site text-lg tracking-tight">Cut onboarding drop-off for a B2B SaaS</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Development · three weeks · reward ₹85,000 · up to five people
                  take part · you review each submission and pick the winner.
                </p>
                <p className="mt-3 text-xs text-subtle">
                  This is an example. It is not a live bounty. The first live
                  bounties will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
  );
}

/** 2 — Real open work, or the honest empty state. */
function HomeOpenNow({ openItems }: { openItems: HomeOpenItem }) {
    return (
                <section className="canvas-wide mt-14 pb-4 sm:mt-16">
          <SectionHeader
            title="Open now"
            aside={
              <a href="/bounties" className="text-xs font-medium text-accent underline underline-offset-4">
                Browse all
              </a>
            }
          />
          {openItems.length > 0 ? (
            <div className="mt-4">
              {openItems.map((b) => (
                <a
                  key={b.id}
                  href={`/bounties/${b.id}`}
                  className="row-line flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-3 transition-colors duration-150 hover:bg-surface/70"
                >
                  <MoneyValue minor={b.reward_total_minor} currency={b.currency} className="w-28 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium hover:underline hover:underline-offset-4">{b.title}</span>
                  <span className="hidden text-xs text-subtle sm:block">
                    {b.category} · {b.participants}/{b.participant_cap} · {deadlinePhrase(b.submission_deadline)}
                  </span>
                  <StatusBadge status={b.status} />
                </a>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-fg/15 bg-surface/40 p-6 text-sm leading-relaxed text-muted">
              No open bounties yet. A bounty is bounded work with a fixed reward
              and a deadline: the sponsor posts it, a capped set of people
              compete, and the winner is paid the advertised amount.
            </div>
          )}
        </section>
  );
}

/** 3 — Bounty vs Project choice. */
function HomeModes() {
  return (
                <section className="canvas-wide py-10">
          <SectionHeader title="Two ways to post the same kind of work" />
          <div className="mt-5 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-display-site text-2xl tracking-tight">Bounty</h2>
              <p className="mt-1 text-sm font-medium text-accent">Several qualified people can compete on a bounded task.</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                You describe one bounded piece of work: a landing page concept,
                a research pass, a small development task, a design, an
                analysis. You set the reward, the deadline, and the cap on how
                many people take part. Each participant submits their best
                attempt. You review the submissions and pick the winner.
              </p>
              <p className="mt-2 text-sm text-muted">
                Not every job should be a contest. A bounty is for work where
                competition improves the result.
              </p>
              <a href="/bounties/new" className="mt-4 inline-block text-sm font-medium text-accent underline underline-offset-4">
                Post a bounty
              </a>
            </div>
            <div>
              <h2 className="font-display-site text-2xl tracking-tight">Project</h2>
              <p className="mt-1 text-sm font-medium text-accent">Choose one provider from proposals before work begins.</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Providers send you a proposal before doing any deliverable
                work: their approach, their evidence, their price, their
                milestones. You pick one person. The work is funded after
                selection and runs through the milestones, each paid when you
                approve it.
              </p>
              <a href="/projects/new" className="mt-4 inline-block text-sm font-medium text-accent underline underline-offset-4">
                Post a project
              </a>
            </div>
          </div>
        </section>
  );
}
