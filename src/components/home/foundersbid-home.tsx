import { product } from "@/lib/host";
import { FoundingAccess } from "@/components/founding-access";
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
 * FoundersBid home — plain, warm copy (RC1 copy pass). This site connects
 * founders who need work done with people who can do it. Bounty = bounded
 * competition. Project = proposals first, then one person is picked. Funding
 * is disabled until the payout rail exists, and the page says so honestly.
 */
export function FoundersbidHome({ me }: { me?: ShellMe | null }) {
  const cfg = product("foundersbid");

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>FoundersBid</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          Have work that needs doing?
          <span className="block text-subtle">Find people who can do it.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Post what you need — a website, research, a design, anything bounded
          and clear. Set a budget and a deadline. People who can do the work
          apply or compete. You review, choose, and pay when it's done right.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="/bounties/new"
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
          >
            Post work
          </a>
          <a
            href="/bounties"
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            See what's open
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
          You can create an account, set up a profile, and draft work right now.
          Payments aren't active yet — we'll switch that on once our payout
          provider is set up. Nothing on this site charges you today.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-5">
        <SectionLabel>Two ways to get work done</SectionLabel>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border-2 border-fg/20 bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
              Bounty
            </p>
            <h2 className="mt-2 font-display-site text-2xl tracking-tight">
              Post it. Let people compete.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              You describe one piece of work, set a reward and a deadline, and
              cap how many people can join. They submit their best attempt. You
              pick the one you like and pay them.
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
              Bigger work, done in stages.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              For larger jobs. People send you a proposal — their approach,
              their price, and a plan. You pick one person, agree on the
              milestones, and pay as each one is finished.
            </p>
            <a href="/projects/new" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
              Post a project
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <ExampleCard
            label="Example · Bounty"
            caption="This is an example. It is not a real listing."
          >
            <p className="font-display-site text-lg tracking-tight">
              Cut onboarding drop-off for a B2B SaaS
            </p>
            <p className="mt-2 text-sm text-muted">
              Development · three weeks · reward ₹85,000 · up to five people
              compete · you review each submission and pick the winner.
            </p>
          </ExampleCard>
          <ExampleCard
            label="Example · Project"
            caption="This is an example. It is not a real listing."
          >
            <p className="font-display-site text-lg tracking-tight">
              A native iOS companion app
            </p>
            <p className="mt-2 text-sm text-muted">
              Development · ₹4,50,000 · people send in proposals with their plan
              and price. You pick one person and pay as milestones are delivered.
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

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="foundersbid"
          heading="Want to know when payments go live?"
          intro="Leave your email and we'll let you know when you can start paying and getting paid. No spam, no marketing — just the one update that matters."
          ctaLabel="Notify me"
        />
      </section>
    </>
  );
}