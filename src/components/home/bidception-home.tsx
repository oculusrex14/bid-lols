import { FoundingAccess } from "@/components/founding-access";
import { ExampleCard, Kicker, SectionLabel } from "@/components/home/shared";

const CHILDREN = [
  { name: "Landing page build", amount: "₹30,000" },
  { name: "Demo video", amount: "₹20,000" },
  { name: "Launch outreach", amount: "₹25,000" },
  { name: "Post-launch analytics", amount: "₹15,000" },
];

/**
 * Bidception — nested & team bounties (Phase 00.5, AC-2.4). A concrete,
 * labelled DEMO of the nesting: a ₹100,000 parent project, a captain paid
 * from the parent budget, four funded child bounties that reconcile to the
 * parent. Positioned clearly as the network's LATER product.
 */
export function BidceptionHome() {
  return (
    <>
      <section className="mx-auto w-full max-w-4xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>Bidception · Nested &amp; team bounties</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          One problem.
          <span className="block text-subtle">A team forms around the money.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Bidception is the network's later product: a funded parent problem
          that a chosen captain decomposes into funded child bounties, and a
          team works to get them all done.
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
              decompose it — and is paid from the parent budget for doing so.
            </p>
          </div>

          <div className="ml-6 space-y-3 border-l-2 border-dashed border-fg/30 pl-5 pt-4">
            <div className="rounded-md border-2 border-fg/20 bg-raised/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
                Captain · paid from the parent budget
              </p>
              <p className="mt-1 text-sm font-medium">Chooses the structure — ₹10,000</p>
            </div>
            {CHILDREN.map((child) => (
              <div
                key={child.name}
                className="rounded-md border-2 border-fg/20 bg-surface p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
                  Child bounty · funded
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
        <p className="rounded-lg border-2 border-fg/20 bg-surface p-5 text-sm leading-relaxed text-muted">
          <span className="font-semibold text-fg">A later product.</span>{" "}
          Bidception opens after the first two products have found their
          footing. Founding access for the network is open below — captain
          seats open here first.
        </p>
        <FoundingAccess site="bidception" defaultRole="captain" ctaLabel="Get notified" />
      </section>
    </>
  );
}
