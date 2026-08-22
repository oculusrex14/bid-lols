import { Linkedin } from "lucide-react";
import { parseSocials, type SocialKind } from "@/lib/socials";
import { cn } from "@/lib/cn";

function KindIcon({ kind }: { kind: SocialKind }) {
  if (kind === "linkedin") return <Linkedin className="size-4" />;
  if (kind === "x") {
    return (
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="currentColor">
        <path d="M12.6 1.5H14.8L9.9 7.1 15.6 14.5H11.1L7.6 9.9 3.5 14.5H1.2L6.5 8.5 1 1.5H5.6L8.7 5.7 12.6 1.5ZM11.8 13.2H13L4.9 2.7H3.6L11.8 13.2Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c2 2.2 2 9.8 0 12M8 2c-2 2.2-2 9.8 0 12" />
    </svg>
  );
}

export function FounderSocials({
  socials,
  className,
}: {
  socials: string[];
  className?: string;
}) {
  const links = parseSocials(socials);
  if (links.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {links.map((link) => (
        <li key={link.url}>
          <a
            href={link.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            title={link.label}
            aria-label={link.label}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-sm px-2.5 text-muted shadow-[var(--shadow-border)] hover:text-fg"
          >
            <KindIcon kind={link.kind} />
            <span className="sr-only">{link.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
