import { linkOrigin, product, PRODUCT_KEYS } from "@/lib/host";
import { FoundingAccess } from "@/components/founding-access";
import { JsonLd } from "@/components/seo";
import { bidNetworkOrganization, websiteSchema } from "@/lib/schema";
import type { ShellMe } from "@/components/product-shell";
import { Kicker, SectionLabel } from "@/components/home/shared";

/**
 * Bidthrone home (RC2, C4). Positioning: reputation built from work, not
 * self-promotion. Signals described are only the implemented ones: verified
 * completions (bounty wins, project completions, captained units), reviews
 * from both sides of completed work, recorded disputes, and the sample-gated
 * Bid Index.
 */
export function BidthroneHome({ me }: { me?: ShellMe | null }) {
  const others = PRODUCT_KEYS.filter((key) => key !== "bidthrone");

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>Bidthrone</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          Reputation built from work,
          <span className="block text-subtle">not self-promotion.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          A portfolio shows selected work. A testimonial is a selected
          opinion. A star average hides context. A public profile here shows
          outcomes the platform verified: bounties won, projects completed,
          teams captained, and the reviews written by the people involved.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/leaderboards"
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
          >
            See the leaderboards
          </a>
          <a
            href="/bid-index"
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            See the Bid Index
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
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-5">
        <SectionLabel>How the record works</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              title: "Earned from completed work",
              body: "A member's numbers come from outcomes the platform verified: bounties won, projects carried to completion, teams captained. There is no self-declared input.",
            },
            {
              title: "Not for sale",
              body: "No placement fee, no featured slot, no button that boosts a profile. Every value on a public profile traces back to a completed outcome.",
            },
            {
              title: "Reviews from the people involved",
              body: "After a piece of work completes, both sides leave a review tied to that specific job. You see who wrote what, and when.",
            },
            {
              title: "Disputes stay in the record",
              body: "When something goes wrong, the record shows it next to the completion. An honest track record beats a curated highlight reel.",
            },
          ].map((m) => (
            <div key={m.title} className="rounded-lg border-2 border-fg/20 bg-surface p-5">
              <h2 className="font-display-site text-xl tracking-tight">{m.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-5">
        <SectionLabel>What the network does</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {others.map((key) => {
            const p = product(key);
            return (
              <a
                key={key}
                href={`${linkOrigin(key)}/`}
                className="rounded-lg border-2 border-fg/20 bg-surface p-5 transition-colors hover:border-fg/50"
              >
                <span className="font-display-site text-xl tracking-tight">{p.name}</span>
                <span className="mt-1 block text-xs uppercase tracking-kicker text-subtle">
                  {p.apex}
                </span>
                <span className="mt-3 block text-sm leading-relaxed text-muted">
                  {key === "foundersbid" &&
                    "Startup work with a published budget: bounties for bounded competitive work, projects when you choose one provider first."}
                  {key === "culturebid" &&
                    "Paid creative briefs with capped entries and rules that are public before the work starts."}
                  {key === "bidception" &&
                    "One project, one budget, a team of specialists. A paid captain splits the work into funded parts."}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-5">
        <SectionLabel>The write up</SectionLabel>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Why portfolios, testimonials, and star averages each hide something,
          and what a public work record shows instead.
        </p>
        <a
          href="/blog/reputation-from-completed-work"
          className="mt-3 inline-block text-sm font-medium underline underline-offset-4"
        >
          A portfolio tells you what someone says they did. We want the work record.
        </a>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="bidthrone"
          heading="Stay updated"
          intro="We will email people on this list when funding opens or when a new leaderboard goes live. No other updates, no marketing list."
          ctaLabel="Notify me"
        />
      </section>

      <JsonLd data={[bidNetworkOrganization(), websiteSchema("bidthrone")]} />
    </>
  );
}
