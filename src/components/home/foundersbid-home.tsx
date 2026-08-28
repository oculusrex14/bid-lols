import { product } from "@/lib/host";
import { FoundingAccess } from "@/components/founding-access";
import { JsonLd } from "@/components/seo";
import { websiteSchema } from "@/lib/schema";
import { ExampleCard, Kicker, SectionLabel } from "@/components/home/shared";
import type { ShellMe } from "@/components/product-shell";

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
 * FoundersBid home (RC2, C4). Positioning: get startup work done without
 * hiring a whole team. Two deliberately different modes: bounty (bounded
 * competition) and project (proposals first, one provider). Funding is off
 * network-wide; the note says so once and stays small.
 */
export function FoundersbidHome({ me }: { me?: ShellMe | null }) {
  const cfg = product("foundersbid");

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>FoundersBid</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          Get startup work done
          <span className="block text-subtle">without hiring a whole team.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          You have work that is too small for a full-time hire and too
          important to leave in the backlog. Post it with a clear scope, a
          budget, and a deadline. People who want to do it step forward. You
          review, choose, and pay when the work is done right.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="/post"
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
          >
            Post work
          </a>
          <a
            href="/bounties"
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            Find work
          </a>
          {me ? (
            <a href="/dashboard" className="text-sm font-medium underline underline-offset-4">
              Your dashboard
            </a>
          ) : (
            <a href="/signup" className="text-sm font-medium underline underline-offset-4">
              Create an account
            </a>
          )}
        </div>
        <p className="mt-5 max-w-2xl rounded-md border-2 border-fg/15 bg-raised/40 p-3 text-sm text-muted" data-testid="funding-note">
          Accounts, profiles, and drafts work today. Funding is not enabled
          yet, so nothing on this site takes payment now.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-5">
        <SectionLabel>Two ways to post the same kind of work</SectionLabel>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border-2 border-fg/20 bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
              Bounty
            </p>
            <h2 className="mt-2 font-display-site text-2xl tracking-tight">
              For work several people can try.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
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
            <a href="/bounties/new" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
              Post a bounty
            </a>
          </div>
          <div className="rounded-lg border-2 border-fg/20 bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
              Project
            </p>
            <h2 className="mt-2 font-display-site text-2xl tracking-tight">
              For work where you choose the person first.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Providers send you a proposal before doing any deliverable
              work: their approach, their evidence, their price, their
              milestones. You pick one person. The work is funded after
              selection and runs through the milestones, each paid when you
              approve it.
            </p>
            <a href="/projects/new" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
              Post a project
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <ExampleCard
            label="Example"
            caption="This is an example. It is not a live bounty."
          >
            <p className="font-display-site text-lg tracking-tight">
              Cut onboarding drop-off for a B2B SaaS
            </p>
            <p className="mt-2 text-sm text-muted">
              Development · three weeks · reward ₹85,000 · up to five people
              take part · you review each submission and pick the winner.
            </p>
          </ExampleCard>
          <ExampleCard
            label="Example"
            caption="This is an example. It is not a live project."
          >
            <p className="font-display-site text-lg tracking-tight">
              A native iOS companion app
            </p>
            <p className="mt-2 text-sm text-muted">
              Development · ₹4,50,000 · providers send proposals with their
              plan and price · you pick one person · payment runs through
              milestones.
            </p>
          </ExampleCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-5">
        <SectionLabel>Kinds of work you can post</SectionLabel>
        <ul className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <li
              key={category}
              className="rounded-full border-2 border-fg/20 bg-surface px-3 py-1.5 text-sm text-muted"
            >
              {category}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-5">
        <SectionLabel>How the two modes compare</SectionLabel>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          The full write up: when a job should be a competition, when it
          should be a proposal, and what the rules look like before the work
          starts.
        </p>
        <a
          href="/blog/bounty-or-project"
          className="mt-3 inline-block text-sm font-medium underline underline-offset-4"
        >
          Small startup jobs are too important for a backlog
        </a>
      </section>

      <JsonLd data={[websiteSchema("foundersbid")]} />

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-5">
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
