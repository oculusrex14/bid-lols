import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Network Spine (RC3, S-23): page morphology primitives.
 * A page is sections with hierarchy, not a stack of equal-weight cards:
 * PageHeader anchors, SectionHeader divides, narrative is borderless.
 */

export function PageHeader({
  kicker,
  title,
  lead,
  actions,
  className,
}: {
  kicker?: string;
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-fg/10 pb-6 pt-8", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          {kicker ? (
            <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">{kicker}</p>
          ) : null}
          <h1 className="mt-1.5 font-display-site text-3xl tracking-tight sm:text-4xl">{title}</h1>
          {lead ? <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">{lead}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  aside,
  className,
}: {
  title: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-baseline justify-between gap-2", className)}>
      <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">{title}</h2>
      {aside ? <div className="text-sm text-muted">{aside}</div> : null}
    </div>
  );
}

/** A form step: heading + optional description, then the step's fields. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
