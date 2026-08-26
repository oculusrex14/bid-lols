import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Legal"
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg",
        className,
      )}
    >
      <Link to="/terms" className="underline-offset-4 hover:underline">
        Terms
      </Link>
      <Link to="/privacy" className="underline-offset-4 hover:underline">
        Privacy
      </Link>
      <Link to="/refund" className="underline-offset-4 hover:underline">
        Refund
      </Link>
      <Link to="/contact" className="underline-offset-4 hover:underline">
        Contact
      </Link>
    </nav>
  );
}
