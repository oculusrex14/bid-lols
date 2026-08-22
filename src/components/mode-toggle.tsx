import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyMode, readMode, type Mode } from "@/lib/mode";
import { cn } from "@/lib/cn";

export function ModeToggle({ variant = "bar" }: { variant?: "bar" | "inline" }) {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const current = readMode();
    setMode(current);
    applyMode(current);
  }, []);

  function pick(next: Mode) {
    applyMode(next);
    setMode(next);
    window.dispatchEvent(new CustomEvent("bidlol:mode", { detail: next }));
  }

  const switches = (
    <div
      role="group"
      aria-label="Color mode"
      className="inline-flex h-11 shrink-0 items-center rounded-md bg-surface p-0.5 shadow-[var(--shadow-border)]"
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

  return (
    <div
      id="appearance-toggle"
      className="flex w-full items-center justify-between gap-3 rounded-md bg-raised px-3 py-2 shadow-[var(--shadow-border)]"
    >
      <p className="text-xs font-medium uppercase tracking-kicker text-fg">Appearance</p>
      {switches}
    </div>
  );
}
