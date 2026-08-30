import { cn } from "@/lib/cn";
import { BIDTHRONE_SAMPLE_RECORD } from "@/lib/sample-content";

/**
 * RC5 §23.3-23.8: the Bidthrone public record card. The SAMPLE variant is
 * the designed "what a record looks like" object: SAMPLE RECORD header,
 * @example member, EX avatar, Bid Index NR (never a fabricated number),
 * zero counters (the card is clearly sample, so 0/0/0 is truthful), three
 * dashed "No reviews yet" slots, and a neutral timeline with no fake
 * chronology. A future real variant can render a real member's facts
 * through the same morphology; until then only the sample exists.
 * Presentation only.
 */
export function PublicRecordCard({ className }: { className?: string }) {
  const r = BIDTHRONE_SAMPLE_RECORD;
  return (
    <div
      className={cn("record-card p-5 sm:p-6", className)}
      data-example="true"
      aria-label="Sample public record, not a real member"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="obj-microlabel record-card-subtle">Sample record</p>
        <p className="record-card-subtle text-[11px] font-semibold tracking-wide">
          NOT A REAL MEMBER
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span
          className="record-avatar flex size-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tracking-wide"
          aria-hidden="true"
        >
          {r.avatarInitials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight">{r.name}</p>
          <p className="record-card-subtle text-xs">@{r.handle}</p>
        </div>
      </div>

      <div className="record-card-line mt-4 border-t pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="record-card-subtle text-xs font-semibold uppercase tracking-wide">
            Bid Index · {r.modelVersion}
          </p>
          <p className="record-card-subtle text-xs">{r.bidIndexNote}</p>
        </div>
        <p className="mt-1 font-display-site text-4xl tracking-tight">
          {r.bidIndexStatus}
        </p>
        <p className="record-card-subtle mt-0.5 text-xs">
          Not enough history. A record starts as NR until real, verified
          work exists.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="record-stat">
          <p className="tabular text-lg font-semibold">{r.counters.bountiesWon}</p>
          <p className="record-card-subtle text-[11px]">bounties won</p>
        </div>
        <div className="record-stat">
          <p className="tabular text-lg font-semibold">{r.counters.projectsCompleted}</p>
          <p className="record-card-subtle text-[11px]">projects completed</p>
        </div>
        <div className="record-stat">
          <p className="tabular text-lg font-semibold">{r.counters.teamsCaptained}</p>
          <p className="record-card-subtle text-[11px]">teams captained</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {Array.from({ length: r.reviewSlots }).map((_, i) => (
          <div key={i} className="record-review-slot text-xs">
            No reviews yet
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="record-timeline" aria-hidden="true" />
        <p className="record-card-subtle mt-1.5 text-xs">{r.timelineLabel}</p>
      </div>
    </div>
  );
}
