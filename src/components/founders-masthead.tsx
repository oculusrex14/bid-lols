import { SITES } from "@/lib/sites";
import { cn } from "@/lib/cn";

export function FoundersMasthead({
  size = "page",
}: {
  size?: "page" | "panel";
}) {
  const cfg = SITES.founders;
  return (
    <header className={cn("masthead text-center", size === "panel" && "masthead-panel")}>
      <p className="text-xs uppercase tracking-kicker text-fg">
        Vol. 01 · The founding record
      </p>
      <h1
        className={cn(
          "font-display italic tracking-tight",
          size === "page" ? "mt-3 text-5xl sm:text-7xl" : "mt-2 text-4xl sm:text-5xl",
        )}
      >
        {cfg.wordmark}
        <span className="text-muted">.lol</span>
      </h1>
      <p
        className={cn(
          "mx-auto max-w-xl font-display italic text-fg",
          size === "page" ? "mt-4 text-xl sm:text-2xl" : "mt-3 text-lg",
        )}
      >
        {cfg.tagline}
      </p>
      <p className="mt-3 text-xs uppercase tracking-wider text-subtle">{cfg.kicker}</p>
    </header>
  );
}
