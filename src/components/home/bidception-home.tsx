import { FoundingAccess } from "@/components/founding-access";
import type { ShellMe } from "@/components/product-shell";
import { ExampleCard, Kicker, SectionLabel } from "@/components/home/shared";

const CHILDREN = [
  { name: "Landing page build", amount: "₹30,000" },
  { name: "Demo video", amount: "₹20,000" },
  { name: "Launch outreach", amount: "₹25,000" },
  { name: "Post-launch analytics", amount: "₹15,000" },
];

/**
 * Bidception — operational home (RC1, R5). Nested & team work: one funded
 * parent problem, a captain decomposes it into funded child units. The
 * labelled demo tree stays (it explains the shape honestly), but the hero and
 * CTAs are the live product: browse parent work, create parent work.
 */
export function BidceptionHome({ me }: { me?: ShellMe | null }) {
  return (
    <>
      <section className="mx-auto w-full max-w-4xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>Bidception · Nested &amp; team bounties</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          One problem.
          <span className="block text-subtle">A team forms around the money.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          A sponsor funds one parent problem. A captain is chosen to decompose
          it into funded child units, and the budget invariant holds: allocated
          + reserved + captain compensation can never exceed the funded
          budget. A team works to get them all done.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="/bidception"
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
          >
            Browse parent work
          </a>
          <a
            href="/bidception/new"
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            Create parent work
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
          The nested marketplace preview is open. Funding parent work opens when
          the payout rail is enabled; until then parent drafts stay drafts and no
          payment can be made on this site.
        </p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-5">
        <SectionLabel>How the nesting works</SectionLabel>
        <div className="mt-4 space-y-0">
          <div className="rounded-lg border-2 border-fg bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
              Parent project · funded
            </p>
            <p className="mt-1 font-display-site text-2xl tracking-tight">
              Launch a new product site — ₹100,000
            </p>
            <p className="mt-2 text-sm text-muted">
              The sponsor funds the whole problem. A captain is chosen to
              decompose it — and is compensated from the parent budget for doing so.
            </p>
          </div>

          <div className="ml-6 space-y-3 border-l-2 border-dashed border-fg/30 pl-5 pt-4">
            <div className="rounded-md border-2 border-fg/20 bg-raised/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
                Captain · compensated from the parent budget
              </p>
              <p className="mt-1 text-sm font-medium">Chooses the structure — ₹10,000</p>
            </div>
            {CHILDREN.map((child) => (
              <div
                key={child.name}
                className="rounded-md border-2 border-fg/20 bg-surface p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
                  Child unit · funded
                </p>
                <p className="mt-1 text-sm font-medium">
                  {child.name} — {child.amount}
                </p>
              </div>
            ))}
            <p className="text-xs text-subtle">
              ₹30,000 + ₹20,000 + ₹25,000 + ₹15,000 + ₹10,000 = ₹100,000. Every
              rupee of the parent budget is spoken for, up front.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <ExampleCard
            label="Demo"
            caption="This whole tree is a demonstration. Nothing here is a live project, and no captain has been chosen."
          >
            <p className="text-sm text-muted">
              The point of the shape: a team assembles around funded, bounded
              pieces of one problem — instead of one person taking a whole
              problem on faith.
            </p>
          </ExampleCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="bidception"
          defaultRole="captain"
          heading="Captain & team launches"
          intro="We email people on this list when parent-work funding opens and when captain seats become available. One email per update — no payment, no spam."
          ctaLabel="Get notified"
        />
      </section>
    </>
  );
}