import { type ReactNode } from "react";

/**
 * Shared pre-launch home blocks (Phase 00.5, WS2). Deliberately plain:
 * the four product homes compose these into different structures so the
 * domains read as different products, not one parked template.
 */

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-kicker text-subtle">{children}</p>
  );
}

// RC3 cleanup: the Phase 00.5 illustration devices (ExampleCard / FlowStep /
// SectionLabel) shipped no pages anymore and carried off-spine border-2 /
// rounded-lg shapes; the homes use hairline 1px dashed panels instead.
