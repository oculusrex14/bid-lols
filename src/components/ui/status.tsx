import { statusLabel } from "@/lib/marketplace/status-labels";
import { cn } from "@/lib/cn";

/**
 * Network Spine (RC3, S-31): the single semantic status treatment.
 * Human label + dot + color: never color-only, never the raw DB enum.
 * The raw value stays in `data-status` so tests and future tooling can
 * assert on machine state without parsing pixels.
 */

type Tone = "neutral" | "up" | "warn" | "down" | "accent";

const UP = new Set([
  "OPEN",
  "FUNDED",
  "ACTIVE",
  "COMPLETED",
  "LISTED",
  "APPROVED",
  "ACCEPTED",
  "SETTLED",
  "AWARDED",
  "PROPOSAL_SELECTED",
  "RESOLVED",
  "TRANSFERRED",
  "SELECTED",
  "READY",
]);
const WARN = new Set([
  "AWAITING_FUNDING",
  "APPLICATION_CLOSED",
  "SUBMISSION",
  "JUDGING",
  "SETTLING",
  "UNDER_OFFER",
  "UNDER_REVIEW",
  "MILESTONE_REVIEW",
  "COMPLETION_REVIEW",
  "IN_REVIEW",
  "PENDING",
  "SHORTLISTED",
  "OBLIGATION_CREATED",
]);
const DOWN = new Set([
  "CANCELLED",
  "EXPIRED",
  "DISPUTED",
  "FAILED",
  "DISQUALIFIED",
  "REJECTED",
  "WITHDRAWN",
  "CLOSED",
  "NOT_SELECTED",
  "BLOCKED",
  "DISMISSED",
]);

function toneFor(status: string): Tone {
  if (UP.has(status)) return "up";
  if (DOWN.has(status)) return "down";
  if (WARN.has(status)) return "warn";
  if (status === "DRAFT") return "neutral";
  return "accent";
}

const toneDot: Record<Tone, string> = {
  neutral: "bg-subtle",
  up: "bg-up",
  warn: "bg-warn",
  down: "bg-danger",
  accent: "bg-accent",
};
const toneText: Record<Tone, string> = {
  neutral: "text-muted",
  up: "text-up",
  warn: "text-warn",
  down: "text-danger",
  accent: "text-accent",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = toneFor(status);
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-fg/10 bg-surface px-2 py-0.5 text-xs font-medium",
        toneText[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", toneDot[tone])} aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}
