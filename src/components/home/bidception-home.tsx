import { FoundingAccess } from "@/components/founding-access";
import { JsonLd } from "@/components/seo";
import { websiteSchema } from "@/lib/schema";
import type { ShellMe } from "@/components/product-shell";
import { ExampleCard, Kicker, SectionLabel } from "@/components/home/shared";

const CHILDREN = [
  { name: "Landing page", amount: "₹30,000" },
  { name: "Demo video", amount: "₹20,000" },
  { name: "Launch outreach", amount: "₹25,000" },
  { name: "Post-launch analytics", amount: "₹15,000" },
];

/**
 * Bidception home (RC2, C4). Positioning: big project, one budget, the right
 * people for each part. The concept is new, so the page walks it in plain
 * steps and names the technical term ("nested bounty") only after the idea
 * is clear. No "coming next": drafts and the parent surface exist today;
 * funding is off network-wide and the note says so once.
 */
export function BidceptionHome({ me }: { me?: ShellMe | null }) {
  return (
    <>
      <section className="mx-auto w-full max-w-4xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>Bidception</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          Big project. One budget.
          <span className="block text-subtle">The right people for each part.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          A launch needs design, development, video, copy, and outreach. No
          one freelancer does all of it well. Bidception funds the whole
          project in a single budget, puts a captain in charge of the split,
          and gives each part to the person suited to it.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="/bidception/new"
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
          >
            Start a project
          </a>
          <a
            href="/bidception"
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            See team projects
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
          Parent projects can be created today. Funding is not enabled yet, so
          funded team projects do not appear on the site at the moment, and
          nothing on this site takes payment now.
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
              Launch a new product site: ₹100,000
            </p>
            <p className="mt-2 text-sm text-muted">
              The sponsor sets the total budget for everything the project
              needs. The total is public on the project page.
            </p>
          </div>

          <div className="ml-6 space-y-3 border-l-2 border-dashed border-fg/30 pl-5 pt-4">
            <div className="rounded-md border-2 border-fg/20 bg-raised/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
                Step 2 · Choose a captain
              </p>
              <p className="mt-1 text-sm font-medium">
                The sponsor picks a member for the coordination, and the
                captain is paid for it. Example: ₹10,000.
              </p>
            </div>
            {CHILDREN.map((child) => (
              <div
                key={child.name}
                className="rounded-md border-2 border-fg/20 bg-surface p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
                  Step 3 · Each part gets its own budget
                </p>
                <p className="mt-1 text-sm font-medium">
                  {child.name} · {child.amount}
                </p>
              </div>
            ))}
            <p className="text-xs text-subtle">
              ₹30,000 + ₹20,000 + ₹25,000 + ₹15,000 + ₹10,000 = ₹100,000.
              Every part is funded from the original budget. The engine
              refuses to allocate more than exists, so there are no hidden
              costs.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <ExampleCard
            label="Example"
            caption="This is an example. It is not a live project."
          >
            <p className="text-sm text-muted">
              Internally the model is a nested bounty: a funded parent with
              funded children. Each child is either a competitive bounty or a
              proposal-first project, and specialists take the parts they are
              good at. When every part is done, the project settles and any
              unused reserve goes back to the sponsor.
            </p>
          </ExampleCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 pb-14 sm:px-5">
        <SectionLabel>The write up</SectionLabel>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Why big freelance projects break under one person, what a paid
          captain does, and the budget rule that keeps nesting
          honest.
        </p>
        <a
          href="/blog/building-a-project-with-multiple-freelancers"
          className="mt-3 inline-block text-sm font-medium underline underline-offset-4"
        >
          Big freelance projects break when one person is expected to do everything
        </a>
      </section>

      <JsonLd data={[websiteSchema("bidception")]} />

      <section className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="bidception"
          defaultRole="captain"
          heading="Interested in captaining?"
          intro="Captains lead teams on funded projects and are paid for the coordination. Leave your email and we will write when funding opens."
          ctaLabel="Notify me"
        />
      </section>
    </>
  );
}
