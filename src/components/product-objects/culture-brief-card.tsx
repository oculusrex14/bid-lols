import { cn } from "@/lib/cn";
import { MoneyValue } from "@/components/ui/money";

/**
 * RC5 §21.2/§21.4: the CultureBid brief poster (hero) and gallery tile.
 * Product object: 16:9 local media, 16px radius, one soft shadow. The
 * sample variant is labelled EXAMPLE with visible text; the real variant
 * renders only stored fields (usageNotes, never inferred rights).
 * Presentation only: no authority, no database, no payment.
 */

export function CultureBriefCard({
  sample,
  title,
  support,
  rewardMinor,
  currency,
  slotsTaken,
  slotsCap,
  licenseLine,
  media,
  note,
  className,
}: {
  /** true = labelled example; false = real brief (stored fields only). */
  sample: boolean;
  title: string;
  support?: string;
  rewardMinor: number;
  currency?: string;
  slotsTaken: number;
  slotsCap: number;
  licenseLine: string;
  /** Local media URL (public/sample-media/... or the real brief art). */
  media: string;
  /** Visible sample disclaimer. */
  note?: string;
  className?: string;
}) {
  return (
    <figure
      className={cn("brief-poster", className)}
      data-example={sample ? "true" : undefined}
      aria-label={sample ? `Example brief: ${title}` : `Creative brief: ${title}`}
    >
      <img
        src={media}
        alt=""
        className="brief-poster-media"
        loading="lazy"
      />
      {sample ? (
        <span className="example-ribbon !top-3 !right-3">Example</span>
      ) : null}
      <div className="brief-poster-body">
        <p className="brief-poster-title text-fg">{title}</p>
        {support ? (
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{support}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <MoneyValue minor={rewardMinor} currency={currency} size="md" className="text-accent" trimZeroDecimals />
          <span>
            {slotsTaken}/{slotsCap} creator slot{slotsCap === 1 ? "" : "s"}
          </span>
          <span>{licenseLine}</span>
        </div>
        {sample && note ? (
          <p className="mt-2 text-xs text-subtle">{note}</p>
        ) : null}
      </div>
    </figure>
  );
}

/** The compact gallery tile (sample wall / browse): media + overlay text. */
export function CultureBriefTile({
  sample,
  category,
  title,
  rewardMinor,
  currency,
  slotsTaken,
  slotsCap,
  licenseLine,
  media,
}: {
  sample: boolean;
  category: string;
  title: string;
  rewardMinor: number;
  currency?: string;
  slotsTaken: number;
  slotsCap: number;
  licenseLine: string;
  media: string;
}) {
  return (
    <figure
      className="brief-tile"
      data-example={sample ? "true" : undefined}
      aria-label={sample ? `Example ${category} brief` : `${category} brief`}
    >
      <img src={media} alt="" className="brief-poster-media" loading="lazy" />
      <div className="brief-tile-overlay" aria-hidden="true" />
      <figcaption className="brief-tile-content">
        <div>
          {sample ? <span className="obj-microlabel mb-1 block text-white/90">Sample</span> : null}
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
            {category}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug">{title}</p>
        </div>
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <MoneyValue minor={rewardMinor} currency={currency} size="sm" className="text-white" trimZeroDecimals />
          <span className="text-white/80">
            {slotsTaken}/{slotsCap} · {licenseLine}
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
