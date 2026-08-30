import { cn } from "@/lib/cn";

/**
 * RC5 §12: the shared visible sample label. Every visual sample carries
 * this text (never color alone, per §32) plus data-example="true" on the
 * sample root.
 */
export function ExampleBadge({
  text = "EXAMPLE",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "obj-microlabel inline-flex items-center gap-1 rounded-full border border-fg/25 bg-chip px-2 py-0.5 font-semibold",
        className,
      )}
    >
      {text}
    </span>
  );
}
