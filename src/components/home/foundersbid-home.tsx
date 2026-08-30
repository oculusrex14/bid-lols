import { Kicker } from "@/components/home/shared";
import { JsonLd } from "@/components/seo";
import { websiteSchema } from "@/lib/schema";
import { FoundingAccess } from "@/components/founding-access";
import type { ShellMe } from "@/components/product-shell";
import type { HomePreview } from "@/lib/marketplace/home-preview.server";
import { MoneyValue } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/layout";
import { deadlinePhrase, absoluteDate } from "@/lib/reltime";
import { FoundersWorkTicket } from "@/components/product-objects/founders-work-ticket";
import { ExampleBadge } from "@/components/product-objects/example-badge";
import { FOUNDERS_WORK_TICKET_EXAMPLE } from "@/lib/sample-content";
import { categoriesFor } from "@/lib/marketplace/categories";

/**
 * FoundersBid home (RC5 §20): the workshop paper. One operational spine
 * (buttons, money, status) + the manila work ticket as the hero object.
 *
 * Honesty rules:
 *  - "Open now" shows REAL open bounties only, or a designed empty stage
 *    that says so;
 *  - "Sample work" is a separate, labelled section (every ticket EXAMPLE);
 *  - the funding state is the shell chip (moneyMode), not repeated essay
 *    paragraphs here.
 */
// The REAL filter vocabulary (same source as the creation UI and the
// /bounties filter chips): every link lands on a working URL-backed filter.
const CATEGORIES = categoriesFor("foundersbid");

type HomeOpenItem = Extract<HomePreview, { kind: "bounties" }>["items"];

/** A second sample ticket for the labelled "Sample work" section. */
const SAMPLE_RESEARCH_TICKET = {
  example: true as const,
  title: "Teardown of three competitor pricing pages",
  category: "Research",
  duration: "2 weeks",
  rewardMinor: 40_000_00,
  currency: "INR",
  slotsTaken: 0,
  slotsCap: 3,
  note: "Example work. Not a live bounty.",
};

export function FoundersbidHome({ me, preview }: { me?: ShellMe | null; preview: HomePreview }) {
  const openItems = preview.kind === "bounties" ? preview.items : [];
  void me;
  return (
    <>
      <FoundersHero openItems={openItems} />
      <OpenNowSection openItems={openItems} />
      <SampleWorkSection />
      <ModesChooser />
      <CategoriesSection />
      <WriteUpSection />
      <JsonLd data={[websiteSchema("foundersbid")]} />
      <section className="canvas-brand pb-16">
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

/** 1 — Hero: statement left, the work ticket right (sample or real). */
function FoundersHero({ openItems }: { openItems: HomeOpenItem }) {
  const first = openItems[0];
  return (
    <section className="founders-brand-layer canvas-brand grid grid-cols-1 gap-10 pt-14 sm:pt-20 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Kicker>FoundersBid</Kicker>
        <h1 className="obj-hero-type mt-5 max-w-[16ch] sm:max-w-none">
          Get startup work done{" "}
          <span className="block text-subtle">without hiring a whole team.</span>
        </h1>
        <p className="obj-hero-lead mt-5 text-muted">
          Work that is too small for a full-time hire and too important to
          sit in the backlog. Post it with a budget, a deadline, and a cap on
          who takes part.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink href="/post" size="lg">
            I have work to post
          </ButtonLink>
          <ButtonLink href="/bounties" variant="secondary" size="lg">
            I want to take work
          </ButtonLink>
        </div>
      </div>
      <div className="lg:col-span-5">
        {first ? (
          <FoundersWorkTicket
            sample={false}
            title={first.title}
            category={first.category}
            duration={deadlinePhrase(first.submission_deadline)}
            rewardMinor={first.reward_total_minor}
            currency={first.currency}
            slotsTaken={first.participants}
            slotsCap={first.participant_cap}
          />
        ) : (
          <FoundersWorkTicket
            sample
            title={FOUNDERS_WORK_TICKET_EXAMPLE.title}
            category={FOUNDERS_WORK_TICKET_EXAMPLE.category}
            duration={FOUNDERS_WORK_TICKET_EXAMPLE.duration}
            rewardMinor={FOUNDERS_WORK_TICKET_EXAMPLE.rewardMinor}
            currency={FOUNDERS_WORK_TICKET_EXAMPLE.currency}
            slotsTaken={FOUNDERS_WORK_TICKET_EXAMPLE.slotsTaken}
            slotsCap={FOUNDERS_WORK_TICKET_EXAMPLE.slotsCap}
          />
        )}
        <p className="mt-3 text-xs text-subtle">
          {first
            ? "Live opportunity, opening now on the board below."
            : "The first live bounties will open in this shape."}
        </p>
      </div>
    </section>
  );
}

/** 2 — Open now: REAL open work only, board-style cards. */
function OpenNowSection({ openItems }: { openItems: HomeOpenItem }) {
  return (
    <section className="canvas-brand mt-14 sm:mt-16">
      <SectionHeader
        title="Open now"
        aside={
          <a href="/bounties" className="text-xs font-medium text-accent underline underline-offset-4">
            Browse all
          </a>
        }
      />
      {openItems.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openItems.map((b) => (
            <JobCard key={b.id} item={b} />
          ))}
        </div>
      ) : (
        <div
          className="mt-4 rounded-md border border-dashed border-line-strong bg-surface/40 p-6 sm:p-8"
          data-testid="open-now-empty"
        >
          <p className="font-display-site text-lg tracking-tight">
            No open bounties yet.
          </p>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            A bounty is bounded work with a fixed reward and a deadline: the
            sponsor posts it, a capped set of people compete, and the winner
            is paid the advertised amount.
          </p>
          <div className="mt-4">
            <ButtonLink href="/post" variant="secondary">
              Post the first bounty
            </ButtonLink>
          </div>
        </div>
      )}
    </section>
  );
}

/** One real job card: the board's row, as a card. */
function JobCard({ item }: { item: HomeOpenItem[number] }) {
  const sponsor = item.sponsor_handle
    ? `@${item.sponsor_handle}`
    : item.sponsor_name ?? null;
  return (
    <a
      href={`/bounties/${item.id}`}
      className="group rounded-md border border-line bg-surface p-4 transition-colors duration-150 hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Wrapping title (never truncate: a nowrap min-content would push
              the card — and the page — wide at 390px). */}
          <p className="text-[15px] font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">
            {item.title}
          </p>
          <p className="mt-1 text-xs text-subtle">
            {item.category}
            {sponsor ? ` · by ${sponsor}` : ""}
          </p>
        </div>
        <MoneyValue
          minor={item.reward_total_minor}
          currency={item.currency}
          size="lg"
          className="shrink-0 text-accent"
          trimZeroDecimals
        />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs text-subtle">
        <span title={absoluteDate(item.submission_deadline)}>
          {item.participants}/{item.participant_cap} taking part ·{" "}
          {deadlinePhrase(item.submission_deadline)}
        </span>
        <StatusBadge status={item.status} />
      </div>
    </a>
  );
}

/** 3 — Sample work: separate from "Open now", every ticket labelled. */
function SampleWorkSection() {
  const e = FOUNDERS_WORK_TICKET_EXAMPLE;
  return (
    <section className="canvas-brand mt-14 sm:mt-16">
      <SectionHeader
        title="Sample work"
        aside={<ExampleBadge text="SAMPLE, NOT LIVE" />}
      />
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <FoundersWorkTicket
          sample
          title={e.title}
          category={e.category}
          duration={e.duration}
          rewardMinor={e.rewardMinor}
          currency={e.currency}
          slotsTaken={e.slotsTaken}
          slotsCap={e.slotsCap}
          note={e.note}
        />
        <FoundersWorkTicket
          sample
          title={SAMPLE_RESEARCH_TICKET.title}
          category={SAMPLE_RESEARCH_TICKET.category}
          duration={SAMPLE_RESEARCH_TICKET.duration}
          rewardMinor={SAMPLE_RESEARCH_TICKET.rewardMinor}
          currency={SAMPLE_RESEARCH_TICKET.currency}
          slotsTaken={SAMPLE_RESEARCH_TICKET.slotsTaken}
          slotsCap={SAMPLE_RESEARCH_TICKET.slotsCap}
          note={SAMPLE_RESEARCH_TICKET.note}
        />
      </div>
    </section>
  );
}

/** 4 — Bounty vs Project: a clear two-mode chooser (RC5 §20.8). */
function ModesChooser() {
  return (
    <section className="canvas-brand mt-14 sm:mt-16">
      <SectionHeader title="Two ways to post the same kind of work" />
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-md border border-line bg-surface p-5">
          <p className="obj-microlabel text-accent">Bounty</p>
          <h2 className="mt-2 font-display-site text-xl tracking-tight">
            Compete. Submit. The sponsor reviews.
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            <li>Several qualified people compete on a bounded task</li>
            <li>Each participant submits their best attempt</li>
            <li>The sponsor reviews the submissions and picks the winner</li>
            <li>The advertised reward is paid, exactly as posted</li>
          </ul>
          <div className="mt-4">
            <ButtonLink href="/bounties/new" variant="secondary" size="sm">
              Post a bounty
            </ButtonLink>
          </div>
        </div>
        <div className="rounded-md border border-line bg-surface p-5">
          <p className="obj-microlabel text-accent">Project</p>
          <h2 className="mt-2 font-display-site text-xl tracking-tight">
            Propose. The sponsor chooses one.
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            <li>Providers propose before any deliverable work</li>
            <li>The sponsor chooses one provider from the proposals</li>
            <li>Work runs through milestones, each paid on approval</li>
            <li>Deadline extensions are approved, logged, and neutral</li>
          </ul>
          <div className="mt-4">
            <ButtonLink href="/projects/new" variant="secondary" size="sm">
              Post a project
            </ButtonLink>
          </div>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-xs text-subtle">
        Posts open today as drafts. Funding is not live yet, so nothing on
        this network takes payment right now.
      </p>
    </section>
  );
}

/** 5 — Categories (presentation chips, all link into real filters). */
function CategoriesSection() {
  return (
    <section className="canvas-brand mt-14">
      <SectionHeader title="Kinds of work you can post" />
      <ul className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <a
              href={`/bounties?category=${encodeURIComponent(category)}`}
              className="inline-block rounded-full border border-line bg-chip px-3 py-1.5 text-sm text-muted transition-colors duration-150 hover:border-line-strong hover:text-fg"
            >
              {category}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 6 — Educational, secondary. */
function WriteUpSection() {
  return (
    <section className="canvas-brand mt-14 py-6">
      <SectionHeader title="The write up" />
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
        When a job should be a competition, when it should be a proposal, and
        what the rules look like before the work starts.
      </p>
      <a
        href="/blog/bounty-or-project"
        className="mt-2 inline-block text-sm font-medium text-accent underline underline-offset-4"
      >
        Small startup jobs are too important for a backlog
      </a>
    </section>
  );
}
