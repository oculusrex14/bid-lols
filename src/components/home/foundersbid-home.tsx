import { useState } from "react";
import type { WaitlistRole } from "@/lib/waitlist-shared";
import { FoundingAccess } from "@/components/founding-access";
import { ExampleCard, Kicker, SectionLabel } from "@/components/home/shared";

const CATEGORIES = [
  "Development",
  "AI automation",
  "Design",
  "Product",
  "Research",
  "Data",
  "Marketing & GTM",
  "Content",
  "Business operations",
];

/**
 * FoundersBid — the startup execution product (Phase 00.5, AC-2.2).
 * Two modes, both funded: BOUNTY (compete on bounded work) and PROJECT
 * (proposals first, one selected before work). Example cards are labelled
 * EXAMPLE and are not marketplace activity. The two CTAs preset the role in
 * the single founding-access form below — genuine capture, no simulation.
 */
export function FoundersbidHome() {
  const [presetRole, setPresetRole] = useState<WaitlistRole>("sponsor");

  const goAccess = (role: WaitlistRole) => {
    setPresetRole(role);
    document.getElementById("access")?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-4 pt-16 sm:px-5 sm:pt-24">
        <Kicker>FoundersBid · The startup execution product</Kicker>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          Fund startup work
          <span className="block text-subtle">with money on the table.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          Two ways to get real work done for a funded price. The budget is
          stated before the work exists — no vague promises.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => goAccess("sponsor")}
            className="inline-flex h-12 items-center rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg"
          >
            I need work done
          </button>
          <button
            type="button"
            onClick={() => goAccess("builder")}
            className="inline-flex h-12 items-center rounded-md border-2 border-fg/30 px-5 text-sm font-semibold hover:border-fg/60"
          >
            I want to build
          </button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-5">
        <SectionLabel>The two modes</SectionLabel>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border-2 border-fg/20 bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
              Mode 1 · Bounty
            </p>
            <h2 className="mt-2 font-display-site text-2xl tracking-tight">
              Compete on bounded work.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A sponsor publishes one bounded piece of work with a fixed
              reward. Multiple qualified participants compete on it. The
              sponsor picks the winner; the winner is paid on a verified
              outcome.
            </p>
          </div>
          <div className="rounded-lg border-2 border-fg/20 bg-surface p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
              Mode 2 · Project
            </p>
            <h2 className="mt-2 font-display-site text-2xl tracking-tight">
              Proposals first. One gets picked.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Providers submit proposals before any work starts. The sponsor
              reviews them and selects one — only then is the work funded and
              done. No speculative building, no unpaid audits.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <ExampleCard
            label="Example · Bounty"
            caption="Illustrative only — this is not a live bounty and has never been."
          >
            <p className="font-display-site text-lg tracking-tight">
              Cut onboarding drop-off for a B2B SaaS
            </p>
            <p className="mt-2 text-sm text-muted">
              Development · bounded to three weeks · reward ₹85,000 ·
              qualified bidders compete, sponsor verifies the outcome before
              settlement.
            </p>
          </ExampleCard>
          <ExampleCard
            label="Example · Project"
            caption="Illustrative only — no proposals have been submitted or selected."
          >
            <p className="font-display-site text-lg tracking-tight">
              A native iOS companion app, proposed first
            </p>
            <p className="mt-2 text-sm text-muted">
              Development · budget ₹4,50,000 · providers submit proposals;
              one is selected and funded before any work begins.
            </p>
          </ExampleCard>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-5">
        <SectionLabel>Where the money will sit</SectionLabel>
        <ul className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <li
              key={category}
              className="rounded-full border-2 border-fg/20 bg-surface px-3 py-1.5 text-sm text-muted"
            >
              {category}
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-5">
        <FoundingAccess
          site="foundersbid"
          defaultRole={presetRole}
          ctaLabel={presetRole === "sponsor" ? "I need work done — notify me" : "I want to build — notify me"}
        />
      </section>
    </>
  );
}
