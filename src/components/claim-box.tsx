import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RankHint } from "@/components/rank-hint";
import { MIN_BID_DOLLARS, COPY, SITES, type SiteId } from "@/lib/sites";
import { takeFirstDollars } from "@/lib/socials";
import { cn } from "@/lib/cn";

export function ClaimBox({
  site,
  leaderBidCents,
}: {
  site: SiteId;
  leaderBidCents: number;
}) {
  const cfg = SITES[site];
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const take = takeFirstDollars(leaderBidCents);
  const dirty = useRef(false);
  const [amount, setAmount] = useState(take);
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!dirty.current) setAmount(take);
  }, [take]);

  const shown = draft ?? String(amount);
  const parsed = /^\d+$/.test(shown) ? Number(shown) : null;
  const leaderDollars = Math.round((leaderBidCents ?? 0) / 100);
  const takesFirst = parsed != null && parsed > leaderDollars;
  const headline =
    site === "founders"
      ? takesFirst || leaderDollars < 1
        ? "Claim #1"
        : "Bid your rank"
      : takesFirst || leaderDollars < 1
        ? "Outbid the leader"
        : "Bid your rank";
  const deck =
    site === "founders"
      ? takesFirst || leaderDollars < 1
        ? "Put the founding team on the first line of the board."
        : "Rank follows the bid. Highest total stands first."
      : takesFirst || leaderDollars < 1
        ? "Take the meta crown. Highest bid stands first."
        : "Rank follows the bid. Highest total stands first.";

  const display =
    focused || draft != null
      ? shown
      : new Intl.NumberFormat("en-US").format(amount);

  function mark(next: number) {
    dirty.current = true;
    const clamped = Math.max(MIN_BID_DOLLARS, Math.floor(next));
    setAmount(clamped);
    setDraft(null);
  }

  function bump(delta: number) {
    const base = parsed ?? amount;
    mark(base + delta);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const dollars = parsed != null && parsed >= MIN_BID_DOLLARS ? parsed : amount;
    const next = Math.max(MIN_BID_DOLLARS, dollars);
    mark(next);
    void navigate({
      to: "/$site/bid",
      params: { site },
      search: { url: url.trim() || undefined, amount: String(next) },
    });
  }

  return (
    <section
      data-claim-box
      className="rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6"
    >
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,19rem)] sm:items-end">
        <div>
          <p className="text-xs uppercase tracking-kicker text-subtle">
            {takesFirst && amount === take && leaderBidCents > 0
              ? "Live #1 price"
              : "Your bid"}
          </p>
          <h2 className="mt-2 font-display-site text-3xl tracking-tight sm:text-4xl">
            {headline}
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted">{deck}</p>
          <div className="mt-4 flex items-center gap-2 sm:gap-3">
            <StepButton
              label="Decrease bid"
              disabled={(parsed ?? amount) <= MIN_BID_DOLLARS}
              onClick={() => bump(-1)}
            >
              <Minus className="size-4" />
            </StepButton>
            <label className="flex min-w-0 items-baseline">
              <span className="sr-only">Bid amount in whole dollars</span>
              <span
                aria-hidden="true"
                className="tabular text-3xl font-medium sm:text-4xl"
              >
                $
              </span>
              <input
                value={display}
                onFocus={() => {
                  setFocused(true);
                  setDraft(String(amount));
                }}
                onBlur={() => {
                  setFocused(false);
                  const n = parsed;
                  mark(n == null ? amount : n);
                }}
                onChange={(e) => {
                  dirty.current = true;
                  const raw = e.target.value.replace(/[^\d]/g, "");
                  setDraft(raw);
                  if (/^\d+$/.test(raw)) setAmount(Number(raw));
                }}
                inputMode="numeric"
                className="tabular w-28 bg-transparent text-3xl font-medium text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-36 sm:text-4xl"
              />
            </label>
            <StepButton label="Increase bid" onClick={() => bump(1)}>
              <Plus className="size-4" />
            </StepButton>
          </div>
          <RankHint
            amountDollars={parsed}
            leaderBidCents={leaderBidCents}
            className="mt-2"
          />
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">{cfg.urlLabel}</span>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={cfg.urlHint}
              inputMode="url"
              autoComplete="url"
            />
          </label>
          <Button type="submit" className="h-12 w-full text-base">
            {COPY.bidNow}
          </Button>
          <p className="text-xs text-subtle">
            $5 minimum · Whole dollars · Re-bids only pay the difference
          </p>
        </form>
      </div>
    </section>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg shadow-[var(--shadow-border)]",
        "transition-[opacity,transform,box-shadow] duration-150 ease-out",
        "hover:shadow-[var(--shadow-border-hover)] active:not-disabled:scale-[0.96]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
