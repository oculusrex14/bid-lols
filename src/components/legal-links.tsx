import { Link } from "@tanstack/react-router";
import type { SiteId } from "@/lib/sites";
import { cn } from "@/lib/cn";

export function LegalLinks({
  site,
  className,
}: {
  site: SiteId;
  className?: string;
}) {
  return (
    <nav
      aria-label="Legal"
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg",
        className,
      )}
    >
      <Link to="/$site/terms" params={{ site }} className="underline-offset-4 hover:underline">
        Terms
      </Link>
      <Link to="/$site/privacy" params={{ site }} className="underline-offset-4 hover:underline">
        Privacy
      </Link>
      <Link to="/$site/refund" params={{ site }} className="underline-offset-4 hover:underline">
        Refund
      </Link>
      <Link to="/$site/contact" params={{ site }} className="underline-offset-4 hover:underline">
        Contact
      </Link>
    </nav>
  );
}
