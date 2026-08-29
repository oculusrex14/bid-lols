import { cn } from "@/lib/cn";

/**
 * Network Spine (RC3, S-29): consistent marketplace identity.
 * No fake photos: an avatar is deterministic initials on a neutral fill
 * (or the product accent-soft when there is a display name to anchor it).
 */

function initialsOf(name: string | null | undefined, fallback = "?"): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-raised font-semibold text-muted",
        size === "sm" && "size-6 text-[10px]",
        size === "md" && "size-8 text-xs",
        size === "lg" && "size-10 text-sm",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

export function IdentityLine({
  name,
  handle,
  role,
  skills,
  href,
  size = "md",
  className,
}: {
  name: string;
  handle?: string | null;
  role?: string;
  skills?: string[];
  href?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const identity = (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <Avatar name={name} size={size === "sm" ? "sm" : "md"} />
      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-sm font-medium">{name}</span>
          {handle ? <span className="shrink-0 text-xs text-subtle">@{handle}</span> : null}
        </span>
        {role ? <span className="block text-xs text-subtle">{role}</span> : null}
      </span>
    </span>
  );
  return href ? (
    <a href={href} className="rounded-sm focus-visible:outline-2">
      {identity}
    </a>
  ) : (
    identity
  );
}

export function SkillTags({ skills, max = 4, className }: { skills: string[]; max?: number; className?: string }) {
  const shown = skills.slice(0, max);
  const rest = skills.length - shown.length;
  if (shown.length === 0) return null;
  return (
    <span className={cn("flex flex-wrap items-center gap-1", className)}>
      {shown.map((s) => (
        <span
          key={s}
          className="rounded-full border border-fg/10 bg-raised/60 px-2 py-0.5 text-[11px] font-medium text-muted"
        >
          {s}
        </span>
      ))}
      {rest > 0 ? <span className="text-[11px] text-subtle">+{rest}</span> : null}
    </span>
  );
}
