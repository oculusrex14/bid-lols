import { formatCount } from "@/lib/hype";
import { cn } from "@/lib/cn";

export function HypeCounts({
  visitsToday,
  totalViews,
  className,
}: {
  visitsToday: number;
  totalViews: number;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted", className)}>
      <span className="tabular font-medium text-fg">{formatCount(visitsToday)}</span>
      {" visits today"}
      <span className="mx-2 text-subtle">·</span>
      <span className="tabular font-medium text-fg">{formatCount(totalViews)}</span>
      {" total views"}
    </p>
  );
}
