import { cn } from "@/lib/cn";

/** Culturebid “why join us” chips. Keep them small so rows stay fast to paint. */
export function CultureValues({
  values,
  className,
}: {
  values: string[];
  className?: string;
}) {
  if (!values.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {values.map((value) => (
        <li
          key={value}
          className="rounded-sm px-2 py-1 text-xs text-muted shadow-[var(--shadow-border)]"
        >
          {value}
        </li>
      ))}
    </ul>
  );
}
