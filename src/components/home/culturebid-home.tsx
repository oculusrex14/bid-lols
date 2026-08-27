import { FoundingAccess } from "@/components/founding-access";
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
 * CultureBid home — plain, warm copy (RC1 copy pass). Brands post creative
 * briefs; creators submit real work; the brand picks the winner. The rules
 * (capped entries, clear budget, stated reward) are the product.
 */
export function CulturebidHome({ me }: { me?: ShellMe | null }) {
  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>CultureBid</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          Creative work,
          <span className="block text-subtle">clear brief, fair rules.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Brands post what they need — a video, photos, a logo, a name. Creators
          submit their work within a capped entry limit. The brand reviews every
          entry and picks the one they like. Simple, honest, no surprises.
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
            See what's open
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
          You can create an account, build a creative profile, and draft briefs
          right now. Payments aren't active yet — we'll turn that on once our
          payout provider is ready.
        </p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-5">
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
        <SectionLabel>How it stays fair</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { title: "Clear rewards", body: "Every brief states what the winner gets, and whether there are prizes for runners-up. No vague promises." },
            { title: "Limited entries", body: "You decide how many creators can join. Nobody submits into a void — the field is capped and everyone knows before they start." },
            { title: "You pick the winner", body: "The brand reviews every submission and chooses. Creators keep the rights to entries that don't win." },
            { title: "Clear licensing", body: "The brief states what happens to the winning work. Non-winning entries stay with their creators." },
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
            caption="This is an example. It is not a real brief."
          >
            <p className="font-display-site text-lg tracking-tight">
              A 15-second product video for a launch
            </p>
            <p className="mt-2 text-sm text-muted">
              Video · winner ₹50,000 · two runner-up slots at ₹10,000 each ·
              up to four creators compete · the brand picks the winner.
            </p>
          </ExampleCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="culturebid"
          heading="Want to know when payments go live?"
          intro="Leave your email and we'll let you know when you can fund briefs and get paid for creative work. No spam — just the one update that matters."
          ctaLabel="Notify me"
        />
      </section>
    </>
  );
}