import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { isSiteId, SITES, COPY } from "@/lib/sites";
import { SwapPreview } from "@/components/swap-preview";

export const Route = createFileRoute("/$site/rules")({
  component: RulesPage,
});

function RulesPage() {
  const { site } = Route.useParams();
  if (!isSiteId(site)) return null;
  const cfg = SITES[site];

  return (
    <article className="mx-auto max-w-2xl">
      <p className="text-xs uppercase tracking-kicker text-subtle">Rulebook</p>
      <h1 className="mt-3 font-display-site text-4xl tracking-tight sm:text-5xl">
        How {cfg.wordmark} ranks
      </h1>
      <p className="mt-4 text-muted">{cfg.tagline}</p>

      <Section title="The board">
        <p>
          {cfg.description} Rank is a single number: the highest total bid sits
          at 01. There is no algorithm, no editorial slot, no free listing.
        </p>
      </Section>

      <Section title="Bidding">
        <ul className="list-disc space-y-2 pl-5">
          <li>{COPY.minBid}</li>
          <li>
            If the URL is new, you pay the full bid. If the URL is already on
            this board, you only pay the difference to the new total.
          </li>
          <li>
            A re-bid must strictly beat the current total. Ties go to whoever
            reached that amount first.
          </li>
          <li>Bids are public. The manage link is the only secret.</li>
        </ul>
      </Section>

      <Section title="What you can list">
        <p>
          {site === "founders"
            ? "Personal portfolios, about pages, team pages, studio sites — anything that shows who founded the thing. The founding names sit on the row."
            : site === "culture"
              ? "Careers pages, culture pages, and why-join-us pages. Company name first, then the culture statement, up to five values, and an optional quote."
              : "Marketing platforms, directories, pay-to-rank tools, newsletter sponsorship boards, community boards, and other visibility products. If leftover budget needs a next channel, it belongs here."}
        </p>
      </Section>

      <Section title="Tiered swap links">
        <p>
          A swap changes the destination URL of an existing listing. The listing
          keeps its bid, rank, and click count. Each swap is charged at the full
          rate for that swap number — never the difference between rates. A
          second swap is 35% of the current bid, not 35% minus the base.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-4 py-3">Current bid</th>
                <th className="px-4 py-3">Base rate (1st swap)</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-t border-border"><td className="px-4 py-2.5">Under $100</td><td className="px-4 py-2.5 tabular">10% of the bid</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">$100 – $999</td><td className="px-4 py-2.5 tabular">15% of the bid</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">$1,000 – $4,999</td><td className="px-4 py-2.5 tabular">20% of the bid</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">$5,000+</td><td className="px-4 py-2.5 tabular">25% of the bid</td></tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>Then clamp the fee: absolute minimum $10, absolute maximum $2,500.</li>
          <li>
            Ranks 1–50: three swaps for the life of the listing. 1st at the base
            rate. 2nd at a full 35% of the current bid. 3rd at a full 50% of the
            current bid.
          </li>
          <li>Rank 51 and below: unlimited swaps, always the base rate.</li>
        </ul>
        <div className="mt-4 overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)]">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-4 py-3">Example</th>
                <th className="px-4 py-3">1st (full base)</th>
                <th className="px-4 py-3">2nd (full 35%)</th>
                <th className="px-4 py-3">3rd (full 50%)</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-t border-border">
                <td className="px-4 py-2.5">$1,000, Top 50</td>
                <td className="px-4 py-2.5 tabular">20% = $200</td>
                <td className="px-4 py-2.5 tabular">35% = $350</td>
                <td className="px-4 py-2.5 tabular">50% = $500</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-4 py-2.5">$80, Top 50</td>
                <td className="px-4 py-2.5 tabular">10% = $8 → $10</td>
                <td className="px-4 py-2.5 tabular">35% = $28</td>
                <td className="px-4 py-2.5 tabular">50% = $40</td>
              </tr>
            </tbody>
          </table>
        </div>
        <SwapPreview />
      </Section>

      <Section title="Clicks">
        <p>
          Every visit from the board is counted. We do not store IPs, names, or
          emails. The counter is the only trail.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Every bid and swap settles on Cashfree Payments. Checkout shows the
          order id and UPI / card / net banking / wallet options. Rank updates
          only after Cashfree marks the order paid. Keep the manage link — it is
          how you re-bid and swap.
        </p>
      </Section>

      <Section title="What we will not do">
        <ul className="list-disc space-y-2 pl-5">
          <li>No accounts. The manage URL is the key.</li>
          <li>No fractional dollars on bids.</li>
          <li>No refunds after a bid or swap is marked paid.</li>
          <li>No burying a higher bid for any reason.</li>
        </ul>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display-site text-2xl tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-muted">{children}</div>
    </section>
  );
}
