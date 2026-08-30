import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyMode, readMode, type Mode } from "@/lib/mode";
import { cn } from "@/lib/cn";

/**
 * - "bar": the labelled appearance panel (footer/settings context).
 * - "inline": the two-button switch (legacy header context).
 * - "icon": a compact single-button light/dark toggle — the header's
 *   secondary control (Phase 00.5, AC-4.1: the CTA must stay primary).
 */
export function ModeToggle({
  variant = "bar",
  fallbackMode = "light",
}: {
  variant?: "bar" | "inline" | "icon";
  /** RC5 §9: the product's default mode (Bidthrone dark, the rest light). */
  fallbackMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(fallbackMode);

  useEffect(() => {
    const current = readMode(fallbackMode);
    setMode(current);
    applyMode(current);
  }, [fallbackMode]);

  function pick(next: Mode) {
    applyMode(next);
    setMode(next);
    window.dispatchEvent(new CustomEvent("bidlol:mode", { detail: next }));
  }

  const switches = (
    <div
      role="group"
      aria-label="Color mode"
      className="inline-flex h-11 shrink-0 items-center rounded-md border border-fg/15 bg-surface p-0.5"
    >
      <button
        type="button"
        aria-pressed={mode === "light"}
        onClick={() => pick("light")}
        className={cn(
          "inline-flex h-10 min-w-20 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium",
          mode === "light" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
        )}
      >
        <Sun className="size-4" />
        Light
      </button>
      <button
        type="button"
        aria-pressed={mode === "dark"}
        onClick={() => pick("dark")}
        className={cn(
          "inline-flex h-10 min-w-20 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-medium",
          mode === "dark" ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
        )}
      >
        <Moon className="size-4" />
        Dark
      </button>
    </div>
  );

  if (variant === "inline") return switches;

  if (variant === "icon") {
    const next: Mode = mode === "dark" ? "light" : "dark";
    return (
      <button
        type="button"
        onClick={() => pick(next)}
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={mode === "dark" ? "Light mode" : "Dark mode"}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm text-[color:var(--header-fg-soft)] transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--header-fg)_10%,transparent)] hover:text-[color:var(--header-fg)]"
      >
        {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    );
  }

  return (
    <div
      id="appearance-toggle"
      className="flex w-full items-center justify-between gap-3 rounded-md border border-fg/15 bg-raised px-3 py-2"
    >
      <p className="text-xs font-medium uppercase tracking-kicker text-fg">Appearance</p>
      {switches}
    </div>
  );
}
