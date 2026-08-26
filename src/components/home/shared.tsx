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

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
      {children}
    </p>
  );
}

/**
 * A card that is visibly, unambiguously an illustration (AC-2.2/2.4/2.6):
 * bordered, flagged with an EXAMPLE/DEMO chip, and captioned so no one can
 * mistake it for live marketplace activity.
 */
export function ExampleCard({
  label = "Example",
  children,
  caption,
}: {
  label?: string;
  children: ReactNode;
  caption?: string;
}) {
  return (
    <figure className="relative rounded-lg border-2 border-dashed border-fg/30 bg-raised/40 p-5">
      <span className="absolute -top-3 left-4 rounded-sm bg-accent px-2 py-0.5 text-[11px] font-semibold uppercase tracking-kicker text-accent-fg">
        {label}
      </span>
      <div className="pt-1">{children}</div>
      {caption ? (
        <figcaption className="mt-4 border-t border-border pt-3 text-xs text-subtle">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** A single step in the problem → outcome flow (bidthrone). */
export function FlowStep({
  index,
  title,
  body,
  last = false,
}: {
  index: number | string;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <li className="relative rounded-lg border-2 border-fg/20 bg-surface p-5">
      <span className="font-mono text-sm text-subtle">{index}</span>
      <h3 className="mt-1 font-display-site text-xl tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      {!last ? (
        <span
          aria-hidden="true"
          className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-lg text-subtle sm:block"
        >
          →
        </span>
      ) : null}
    </li>
  );
}
