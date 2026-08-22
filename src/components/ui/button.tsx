import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "outline" | "danger";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:opacity-90 disabled:opacity-50",
  ghost:
    "bg-transparent text-fg hover:bg-raised disabled:opacity-50",
  outline:
    "bg-transparent text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)] disabled:opacity-50",
  danger:
    "bg-danger text-fg hover:opacity-90 disabled:opacity-50",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; asChild?: boolean }
>(function Button({ className, variant = "primary", type = "button", asChild, ...props }, ref) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(
        "inline-flex h-11 min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium",
        "transition-[opacity,transform,box-shadow,background-color] duration-150 ease-out",
        "active:not-disabled:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
});
