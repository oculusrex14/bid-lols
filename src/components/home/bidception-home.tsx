import { FoundingAccess } from "@/components/founding-access";
import type { ShellMe } from "@/components/product-shell";
import { ExampleCard, Kicker, SectionLabel } from "@/components/home/shared";

const CHILDREN = [
  { name: "Landing page", amount: "₹30,000" },
  { name: "Demo video", amount: "₹20,000" },
  { name: "Launch outreach", amount: "₹25,000" },
  { name: "Post-launch analytics", amount: "₹15,000" },
];

/**
 * Bidception home — plain, warm copy (RC1 copy pass). For bigger projects:
 * fund one thing, a captain breaks it into funded pieces, and a team works
 * on them together. Every rupee is accounted for up front.
 */
export function BidceptionHome({ me }: { me?: ShellMe | null }) {
  return (
    <>
      <section className="mx-auto w-full max-w-4xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>Bidception</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          One big project.
          <span className="block text-subtle">A team to build it.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Some projects are too big for one person. Here's how it works: you
          fund the whole project. Someone you choose — the captain — breaks it
          into smaller pieces. Each piece gets its own budget from the parent.
          A team builds them together, and you see exactly where every rupee
          goes.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="/bidception"
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
          >
            See what's open
          </a>
          <a
            href="/bidception/new"
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            Start a project
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
          You can create an account and draft a project right now. Payments
          aren't active yet — we'll turn that on once our payout provider is
          ready.
        </p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-5">
        <SectionLabel>How it works</SectionLabel>
        <div className="mt-4 space-y-0">
          <div className="rounded-lg border-2 border-fg bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
              Step 1 · Fund the project
            </p>
            <p className="mt-1 font-display-site text-2xl tracking-tight">
              Launch a new product site — ₹100,000
            </p>
            <p className="mt-2 text-sm text-muted">
              You put up the full budget for everything the project needs.
            </p>
          </div>

          <div className="ml-6 space-y-3 border-l-2 border-dashed border-fg/30 pl-5 pt-4">
            <div className="rounded-md border-2 border-fg/20 bg-raised/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
                Step 2 · Choose a captain
              </p>
              <p className="mt-1 text-sm font-medium">
                They manage the team and get paid for it — ₹10,000
              </p>
            </div>
            {CHILDREN.map((child) => (
              <div
                key={child.name}
                className="rounded-md border-2 border-fg/20 bg-surface p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
                  Step 3 · Each piece gets its own budget
                </p>
                <p className="mt-1 text-sm font-medium">
                  {child.name} — {child.amount}
                </p>
              </div>
            ))}
            <p className="text-xs text-subtle">
              ₹30,000 + ₹20,000 + ₹25,000 + ₹15,000 + ₹10,000 = ₹100,000.
              Every piece is funded from the original budget — no hidden costs.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <ExampleCard
            label="Example"
            caption="This is an example. It is not a real project."
          >
            <p className="text-sm text-muted">
              The idea: instead of hiring one person for everything, the work
              is broken into pieces that different people can do — each with
              its own budget and its own deadline.
            </p>
          </ExampleCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="bidception"
          defaultRole="captain"
          heading="Want to captain a project?"
          intro="Captains lead teams on funded projects. Leave your email and we'll let you know when the first projects open up."
          ctaLabel="Notify me"
        />
      </section>
    </>
  );
}