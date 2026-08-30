import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Network Spine (RC3, S-20/S-21): the shared button. Every control in the
 * network has the same six states — default, hover, focus (global
 * :focus-visible ring), active, disabled, loading — so a user who learned
 * FoundersBid behaves identically on Bidthrone.
 */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const base = cn(
    "inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60",
    size === "sm" && "h-8 px-3 text-xs",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-5 text-sm",
    variant === "primary" && "bg-accent text-accent-fg hover:bg-accent/90 active:bg-accent/80",
    variant === "secondary" && "border border-fg/25 text-fg hover:border-fg/50 active:bg-raised",
    variant === "ghost" && "text-muted hover:text-fg active:bg-raised",
    variant === "danger" && "text-danger hover:bg-danger/10 active:bg-danger/20",
    className,
  );
  return (
    <button
      type={type}
      className={base}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Square icon-only control (theme toggle, menu, close). >=44px hit area. */
export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children?: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-sm text-muted transition-colors duration-150 hover:text-fg active:bg-raised disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Primary-action link styled as a button (real anchors keep their href). */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-colors duration-150",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-sm",
        variant === "primary" && "bg-accent text-accent-fg hover:bg-accent/90 active:bg-accent/80",
        variant === "secondary" && "border border-fg/25 text-fg hover:border-fg/50 active:bg-raised",
        variant === "ghost" && "text-muted hover:text-fg active:bg-raised",
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}
