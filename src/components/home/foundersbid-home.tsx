import { product } from "@/lib/host";
import { FoundingAccess } from "@/components/founding-access";
import { ExampleCard, Kicker, SectionLabel } from "@/components/home/shared";
import type { ShellMe } from "@/components/product-shell";

const CATEGORIES = [
  "Development",
  "AI automation",
  "Design",
  "Product",
  "Research",
  "Data",
  "Marketing & GTM",
  "Content",
  "Business operations",
];

/**
 * FoundersBid — operational home (RC1, R5). The marketplace software is live:
 * accounts, open bounties/projects, and discovery exist. Funding is intentionally disabled
 * until a payout rail exists, so the page says that plainly instead of
 * implying the work isn't real. Bounty vs Project is explained up front.
 */
export function FoundersbidHome({ me }: { me?: ShellMe | null }) {
  const cfg = product("foundersbid");

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>FoundersBid · Startup execution marketplace</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          Fund startup work
          <span className="block text-subtle">with money on the table.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Two ways to get real work done for a funded price — a bounded bounty
          competitors race on, or a project where proposals come first and one
          provider is selected before any work begins. The budget is stated
          before the work exists.
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
            Browse opportunities
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
          Marketplace preview is open — accounts, bounties, projects and
          discovery are live. Funding opens when the payout rail is enabled;
          until then work stays an honest draft and no payment can be made on
          this site.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-5">
        <SectionLabel>The two modes</SectionLabel>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border-2 border-fg/20 bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
              Bounty
            </p>
            <h2 className="mt-2 font-display-site text-2xl tracking-tight">
              Compete on bounded work.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A sponsor publishes one bounded piece of work with a fixed reward
              and a participant cap. Qualified participants compete; the
              sponsor picks the winner, who is paid on a verified outcome.
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
              Proposals first. One gets picked.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Larger client work: providers submit a proposal (approach, quote,
              milestones) before any deliverable work. The sponsor selects one,
              funds it, and the work runs through the milestones.
            </p>
            <a href="/projects/new" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
              Post a project
            </a>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <ExampleCard
            label="Example · Bounty"
            caption="Illustrative only — this is not a live bounty and has never been."
          >
            <p className="font-display-site text-lg tracking-tight">
              Cut onboarding drop-off for a B2B SaaS
            </p>
            <p className="mt-2 text-sm text-muted">
              Development · bounded to three weeks · reward ₹85,000 ·
              qualified bidders compete, sponsor verifies the outcome before
              settlement.
            </p>
          </ExampleCard>
          <ExampleCard
            label="Example · Project"
            caption="Illustrative only — no proposals have been submitted or selected."
          >
            <p className="font-display-site text-lg tracking-tight">
              A native iOS companion app, proposed first
            </p>
            <p className="mt-2 text-sm text-muted">
              Development · budget ₹4,50,000 · providers submit proposals;
              one is selected and funded before any work begins.
            </p>
          </ExampleCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-5">
        <SectionLabel>What the money will fund</SectionLabel>
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
          heading="Get updates from FoundersBid."
          intro="We email people on this list when funding opens, when new categories land, and at launch moments. One email per update — no payment, no spam."
          ctaLabel="Get launch updates"
        />
        <p className="mt-2 text-xs text-subtle">
          {cfg.apex} — secondary newsletter; the marketplace above is the product.
        </p>
      </section>
    </>
  );
}