import { cn } from "@/lib/cn";
import { MoneyValue } from "@/components/ui/money";
import { ExampleBadge } from "./example-badge";

/**
 * RC5 §20.3/§20.4: the FoundersBid manila work ticket. Product object:
 * the raw visual values (paper color, clipped tab, tape, ribbon) live in
 * the PRODUCT OBJECT LAYER of src/styles.css; this component only places
 * real or sample fields into the morphology.
 *
 * - Sample mode: the labelled example (data-example="true", ribbon).
 * - Live mode: the SAME folder shape with real fields, no ribbon.
 * Presentation only: no authority, no database, no payment.
 */

export function FoundersWorkTicket({
  sample,
  title,
  category,
  duration,
  rewardMinor,
  currency,
  slotsTaken,
  slotsCap,
  note = "Example work. Not a live bounty.",
  className,
}: {
  /** true = labelled example with ribbon; false = real work, same shape. */
  sample: boolean;
  title: string;
  category: string;
  duration: string;
  rewardMinor: number;
  currency?: string;
  slotsTaken: number;
  slotsCap: number;
  /** Sample disclaimer (visible text, RC5 §12). */
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("work-ticket", className)}
      data-example={sample ? "true" : undefined}
      aria-label={sample ? "Example work ticket (not live)" : "Work ticket"}
    >
      {sample ? <span className="work-ticket-tape" aria-hidden="true" /> : null}
      {sample ? (
        <span className="example-ribbon">Example</span>
      ) : null}
      <p className="obj-microlabel work-ticket-subtle">Work ticket</p>
      <p className="work-ticket-title mt-2">{title}</p>
      <div className="work-ticket-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>{category}</span>
        <span>{duration}</span>
        {/* RC5.1 WS4: the work ticket is a marketing/product-object surface —
            zero minor units trim ("₹85,000" / "$1,000"), nonzero stay exact
            ("₹85,000.50" / "$1,000.50"). */}
        <MoneyValue minor={rewardMinor} currency={currency} size="md" className="work-ticket-accent" trimZeroDecimals />
        <span>
          {slotsTaken}/{slotsCap} slots
        </span>
      </div>
      {sample ? <p className="work-ticket-subtle mt-3 text-xs">{note}</p> : null}
    </div>
  );
}
