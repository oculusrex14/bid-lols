import { linkOrigin, product, PRODUCT_KEYS } from "@/lib/host";
import { FoundingAccess } from "@/components/founding-access";
import type { ShellMe } from "@/components/product-shell";
import { FlowStep, Kicker, SectionLabel } from "@/components/home/shared";

/**
 * Bidthrone — the umbrella reputation/discovery network (Phase 00.5, AC-2.1).
 * Core line retained: "Put money on a problem. See who takes the throne."
 * No fake activity: the flow is a description of how the network will work,
 * and the only interactive element is the founding-access capture.
 */
export function BidthroneHome({ me }: { me?: ShellMe | null }) {
  const others = PRODUCT_KEYS.filter((key) => key !== "bidthrone");

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>The Bid Network</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          Put money on a problem.
          <span className="block text-subtle">See who takes the throne.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          The Bid Network is an internet bounty network. Sponsors fund real
          work with a real budget; qualified participants do it; the sponsor
          verifies the outcome; the solver earns a reputation that is
          recorded — never bought. The marketplaces are live; reputation
          builds from verified outcomes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/leaderboards"
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
          >
            View live leaderboards
          </a>
          <a
            href="/bid-index"
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            The Bid Index
          </a>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-5">
        <SectionLabel>How the network works</SectionLabel>
        <ol className="mt-4 grid gap-3 sm:grid-cols-4">
          <FlowStep
            index="01"
            title="Problem"
            body="A sponsor publishes a real problem with a real budget and a bounded scope."
          />
          <FlowStep
            index="02"
            title="Funded work"
            body="Qualified participants compete for it. The work is scoped, the reward is fixed, and nobody works on faith."
          />
          <FlowStep
            index="03"
            title="Verified outcome"
            body="The sponsor checks the result against the scope. Payment settles only on a verified outcome."
          />
          <FlowStep
            index="04"
            title="Earned reputation"
            body="The solver's reputation grows with verified completed work. It is a record, not a purchase."
            last
          />
        </ol>

        <div className="mt-10 rounded-lg border-2 border-fg bg-surface p-5 sm:p-6">
          <h2 className="font-display-site text-2xl tracking-tight">
            Reputation is not for sale.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            There is no way to buy a reputation on Bidthrone. It comes only
            from work that was done, verified, and settled. Everything else on
            the network is priced; reputation is not.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-5">
        <SectionLabel>The network</SectionLabel>
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
                    "Startup execution: funded work and proposals for founders, from development to go-to-market."}
                  {key === "culturebid" &&
                    "Creative bounties with fair, capped competition: funded briefs, a limited field, a paid winner."}
                  {key === "bidception" &&
                    "Nested, team-based bounties: one funded problem, decomposed into funded pieces a team works together."}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="bidthrone"
          heading="Get updates from Bidthrone."
          intro="We email people on this list about network milestones — new leaderboards, Bid Index releases, and launch moments. One email per update — no payment, no spam."
          ctaLabel="Get launch updates"
        />
      </section>

    </>
  );
}
