import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

/**
 * Network Spine (RC3, S-32..34): designed data-surface states.
 * "Initial empty", "filtered empty" and "error" are different messages with
 * different next actions — the UI never says "no results" when the query
 * failed, and never hides a failure behind an empty list.
 */

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("py-12 text-center", className)} data-testid="empty-state">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "We couldn't load this.",
  body,
  requestId,
  onRetry,
  className,
}: {
  title?: string;
  body?: ReactNode;
  requestId?: string | null;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("py-12 text-center", className)} data-testid="error-state" role="alert">
      <AlertTriangle className="mx-auto size-6 text-danger" aria-hidden="true" />
      <h2 className="mt-3 text-lg font-semibold tracking-tight">{title}</h2>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</p> : null}
      {requestId ? <p className="mt-2 text-xs text-subtle">Request ID: {requestId}</p> : null}
      {onRetry ? (
        <div className="mt-5 flex justify-center">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="size-3.5" aria-hidden="true" /> Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function InlineNotice({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "up" | "warn" | "down";
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-sm border border-fg/15 bg-surface px-3 py-2 text-sm leading-relaxed",
        tone === "up" && "border-up/30 text-up",
        tone === "warn" && "border-warn/30 text-warn",
        tone === "down" && "border-danger/30 text-danger",
        tone === "neutral" && "text-muted",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Row-shaped skeleton for marketplace lists (matches the final geometry). */
export function LoadingRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-0", className)} aria-hidden="true" data-testid="loading-rows">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row-line flex items-center gap-4 px-1 py-4">
          <div className="skeleton h-5 w-24" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-3 w-1/3" />
          </div>
          <div className="skeleton hidden h-5 w-16 sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Metric block skeleton with stable dimensions (no layout shift). */
export function MetricSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-7 w-28" />
    </div>
  );
}
