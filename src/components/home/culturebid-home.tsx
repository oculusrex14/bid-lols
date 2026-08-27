import { useState } from "react";
import type { WaitlistRole } from "@/lib/waitlist-shared";
import { FoundingAccess } from "@/components/founding-access";
import { ExampleCard, Kicker, SectionLabel } from "@/components/home/shared";

const MECHANICS = [
  {
    title: "Winner takes all",
    body: "One brief, one winning piece, one paid winner. The field knows who won and why.",
  },
  {
    title: "Podium payout",
    body: "Runners-up can be paid on a stated podium — competition with a floor, not a cliff.",
  },
  {
    title: "Finalist pool",
    body: "Briefs can define a finalist pool with a stated amount per finalist, up front.",
  },
  {
    title: "Limited, approved slots",
    body: "The field is capped and qualified before work starts. No open flood of unpaid submissions.",
  },
];

const USE_CASES = [
  "UGC campaigns",
  "Short-form video",
  "Photography",
  "Design & identity",
  "Naming & copy",
  "Brand challenges",
];

/**
 * CultureBid — creative bounties with fair, capped competition
 * (Phase 00.5, AC-2.3). The fairness mechanics are explained conceptually —
 * this is what the rules will be, not a live board. The example brief is
 * labelled EXAMPLE.
 */
export function CulturebidHome() {
  const [presetRole, setPresetRole] = useState<WaitlistRole>("brand");

  const goAccess = (role: WaitlistRole) => {
    setPresetRole(role);
    document.getElementById("access")?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>CultureBid · Creative bounties, fairly run</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          Fund a creative brief.
          <span className="block text-subtle">Run it fair.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Creative work with real money on it — and rules that keep the
          competition fair for the people doing the work.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => goAccess("brand")}
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
          >
            I'm a brand
          </button>
          <button
            type="button"
            onClick={() => goAccess("creator")}
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            I'm a creator
          </button>
          <a
            href="/bounties"
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            Browse creative briefs
          </a>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-5">
        <SectionLabel>Briefs that will be funded</SectionLabel>
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
        <SectionLabel>The fairness mechanics</SectionLabel>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {MECHANICS.map((m) => (
            <div key={m.title} className="rounded-lg border-2 border-fg/20 bg-surface p-5">
              <h2 className="font-display-site text-xl tracking-tight">{m.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted">
          Capped, qualified participation exists for one reason: so creators
          are never asked to do speculative unpaid work at scale. Every brief
          will state its slots and its budget before anyone starts.
        </p>

        <div className="mt-10">
          <ExampleCard
            label="Example · Brief"
            caption="Illustrative only — no brief is live and no creator has been asked to work."
          >
            <p className="font-display-site text-lg tracking-tight">
              A 15-second product video for a launch
            </p>
            <p className="mt-2 text-sm text-muted">
              Winner ₹50,000 · two podium slots at ₹10,000 each · four approved
              creators compete · the brand picks the winner.
            </p>
          </ExampleCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="culturebid"
          defaultRole={presetRole}
          ctaLabel={presetRole === "brand" ? "I'm a brand — notify me" : "I'm a creator — notify me"}
        />
      </section>
    </>
  );
}
