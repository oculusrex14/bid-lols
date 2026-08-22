import { COPY } from "@/lib/sites";
import { cn } from "@/lib/cn";

export function IndiaPaymentsNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-md bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted shadow-[var(--shadow-border)]",
        className,
      )}
    >
      {COPY.indiaPaymentsOnly}
    </p>
  );
}
