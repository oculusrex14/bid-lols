import { FoundingAccess } from "@/components/founding-access";
import { JsonLd } from "@/components/seo";
import { websiteSchema } from "@/lib/schema";
import { ExampleCard, Kicker, SectionLabel } from "@/components/home/shared";
import type { ShellMe } from "@/components/product-shell";

const USE_CASES = [
  "UGC campaigns",
  "Short-form video",
  "Photography",
  "Design & identity",
  "Naming & copy",
  "Brand challenges",
];

/**
 * CultureBid home (RC2, C4). Positioning: a better way to commission
 * creative work. The page names the tension (brands want several directions;
 * creators should not do unlimited unpaid work) and the rules that resolve
 * it: capped entries, published reward structure, clear licensing, clear
 * deadline.
 */
export function CulturebidHome({ me }: { me?: ShellMe | null }) {
  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>CultureBid</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          A better way
          <span className="block text-subtle">to commission creative work.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Brands want to see several creative directions before they commit.
          Creators should not be pushed into unlimited unpaid work to get
          them. CultureBid resolves that tension with rules that are public
          before anyone starts: a clear brief, a published reward, a deadline,
          and a capped number of creator slots.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="/bounties/new"
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
          >
            Post a brief
          </a>
          <a
            href="/bounties"
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            Find creative work
          </a>
          {me ? (
            <a href="/settings/profile" className="text-sm font-medium underline underline-offset-4">
              Creator profile
            </a>
          ) : (
            <a href="/signup" className="text-sm font-medium underline underline-offset-4">
              Create an account
            </a>
          )}
        </div>
        <p className="mt-5 max-w-2xl rounded-md border-2 border-fg/15 bg-raised/40 p-3 text-sm text-muted" data-testid="funding-note">
          Accounts, creative profiles, and draft briefs work today. Funding
          is not enabled yet, so nothing on this site takes payment now.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-5">
        <SectionLabel>The tension, and the rules that handle it</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Capped entries",
              body: "The brand decides how many creators take part. Ten slots for a naming brief, four for a video. The field is fixed before anyone submits, so work is not thrown into a crowd.",
            },
            {
              title: "Published reward structure",
              body: "Every brief states the payout shape up front: winner takes all, a three-place podium, or a finalist pool with a winner premium. The exact split is written before entries open.",
            },
            {
              title: "Clear licensing",
              body: "The brief states what happens to the winning work. Non-winning entries stay with their creators unless the brief says otherwise. That sentence is on the page before you apply.",
            },
            {
              title: "A deadline and a judge",
              body: "Entries close on a date. The brand reviews every submission against the published brief and picks the winner. No mystery judging, no moving goalposts.",
            },
          ].map((m) => (
            <div key={m.title} className="rounded-lg border-2 border-fg/20 bg-surface p-5">
              <h2 className="font-display-site text-xl tracking-tight">{m.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <ExampleCard
            label="Example"
            caption="This is an example. It is not a live brief."
          >
            <p className="font-display-site text-lg tracking-tight">
              A 15-second product video for a launch
            </p>
            <p className="mt-2 text-sm text-muted">
              Video · winner ₹50,000 · two runner-up slots at ₹10,000 each ·
              four creator slots · the brand picks the winner against the
              published brief.
            </p>
          </ExampleCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-5">
        <SectionLabel>Kinds of creative work</SectionLabel>
        <ul className="mt-4 flex flex-wrap gap-2">
          {USE_CASES.map((useCase) => (
            <li
              key={useCase}
              className="rounded-full border-2 border-fg/20 bg-surface px-3 py-1.5 text-sm text-muted"
            >
              {useCase}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-5">
        <SectionLabel>The write up</SectionLabel>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Why open creative contests ask for free work, what a capped brief
          changes, and what this site is not.
        </p>
        <a
          href="/blog/fair-creative-bounty"
          className="mt-3 inline-block text-sm font-medium underline underline-offset-4"
        >
          A creative contest shouldn't mean 100 people working for free
        </a>
      </section>

      <JsonLd data={[websiteSchema("culturebid")]} />

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="culturebid"
          heading="Want to know when funding opens?"
          intro="Leave your email and we will write once creative briefs go live on CultureBid. No other updates, no marketing list."
          ctaLabel="Notify me"
        />
      </section>
    </>
  );
}
