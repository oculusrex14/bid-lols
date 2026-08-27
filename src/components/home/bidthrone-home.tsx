import { linkOrigin, product, PRODUCT_KEYS } from "@/lib/host";
import { FoundingAccess } from "@/components/founding-access";
import type { ShellMe } from "@/components/product-shell";
import { Kicker, SectionLabel } from "@/components/home/shared";

/**
 * Bidthrone home — plain, warm copy (RC1 copy pass). This is the network's
 * public profile and reputation layer: shows who has done real work, based
 * on completed projects — not on paying for placement.
 */
export function BidthroneHome({ me }: { me?: ShellMe | null }) {
  const others = PRODUCT_KEYS.filter((key) => key !== "bidthrone");

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>Bidthrone</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          Who does good work?
          <span className="block text-subtle">Here's the record.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Every person on the Bid Network has a public profile showing what
          they've actually completed — bounties won, projects finished, teams
          led. No self-reported claims. No paid placement. Just the record of
          real work, visible to anyone.
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
            Market rates
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
        <SectionLabel>How reputation works</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { title: "It comes from real work", body: "You can only build a reputation by completing funded work — bounties you won, projects you delivered, teams you led. There is no other way." },
            { title: "You can't buy it", body: "There is no button to boost your profile or skip the queue. Every number on your profile comes from something you actually finished." },
            { title: "Reviews are from real people", body: "After a project ends, both sides can leave a review. You see who said what and when. No anonymous drive-by ratings." },
            { title: "Disputes are recorded", body: "If something goes wrong, it shows in the record. We'd rather show an honest track record than a curated highlight reel." },
          ].map((m) => (
            <div key={m.title} className="rounded-lg border-2 border-fg/20 bg-surface p-5">
              <h2 className="font-display-site text-xl tracking-tight">{m.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
            </div>
          ))}
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
                    "Post work you need done — development, design, research, marketing. People apply or compete. You pay for results."}
                  {key === "culturebid" &&
                    "Brands post creative briefs — video, photography, design, writing. Creators submit. The brand picks."}
                  {key === "bidception" &&
                    "Bigger projects, built as a team. One sponsor funds it, a captain breaks it into pieces, and the team delivers."}
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="bidthrone"
          heading="Stay updated"
          intro="We'll email you when new leaderboards, market rates, or features go live. No spam — just the things that matter."
          ctaLabel="Notify me"
        />
      </section>
    </>
  );
}