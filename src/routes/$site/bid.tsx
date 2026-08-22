import { type FormEvent, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { RankHint } from "@/components/rank-hint";
import { createBidOrder, getBoard, quoteBid } from "@/lib/board-fns";
import { formatUsd } from "@/lib/format";
import { COPY, MIN_BID_DOLLARS, SITES, isSiteId } from "@/lib/sites";
import { MAX_SOCIALS, clampSocials } from "@/lib/socials";
import { cn } from "@/lib/cn";

type BidSearch = { url?: string; amount?: string };

export const Route = createFileRoute("/$site/bid")({
  validateSearch: (search: Record<string, unknown>): BidSearch => ({
    url: typeof search.url === "string" ? search.url : undefined,
    amount: typeof search.amount === "string" ? search.amount : undefined,
  }),
  component: BidPage,
});

function emptySocials(): string[] {
  return Array.from({ length: MAX_SOCIALS }, () => "");
}

function BidPage() {
  const { site: siteParam } = Route.useParams();
  const site = isSiteId(siteParam) ? siteParam : "founders";
  const { url: prefillUrl, amount: prefillAmount } = Route.useSearch();
  const navigate = useNavigate();
  const cfg = SITES[site];
  const founders = site === "founders";

  const [url, setUrl] = useState(prefillUrl ?? "");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [team, setTeam] = useState("");
  const [socials, setSocials] = useState<string[]>(emptySocials);
  const [amount, setAmount] = useState(prefillAmount ?? String(MIN_BID_DOLLARS));
  const [quote, setQuote] = useState<string>("");
  const [charge, setCharge] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const filledFromExisting = useRef(false);
  const board = useQuery({
    queryKey: ["board", site],
    queryFn: () => getBoard({ data: { site } }),
    staleTime: 4000,
  });
  const leaderBidCents = board.data?.listings[0]?.bidCents ?? 0;
  const amountDollars = /^\d+$/.test(amount) ? Number(amount) : null;

  useEffect(() => {
    if (prefillUrl) setUrl(prefillUrl);
  }, [prefillUrl]);

  useEffect(() => {
    if (prefillAmount && /^\d+$/.test(prefillAmount)) setAmount(prefillAmount);
  }, [prefillAmount]);

  useEffect(() => {
    filledFromExisting.current = false;
  }, [url]);

  useEffect(() => {
    const dollars = Number(amount);
    if (!url.trim() || !Number.isInteger(dollars) || dollars < MIN_BID_DOLLARS) {
      setQuote("");
      setCharge(null);
      return;
    }
    const handle = window.setTimeout(() => {
      quoteBid({ data: { site, url, amountDollars: dollars } })
        .then((q) => {
          setQuote(q.message);
          setCharge(q.chargeCents);
          if (q.current && !filledFromExisting.current) {
            filledFromExisting.current = true;
            const current = q.current;
            setTitle((t) => t || current.title);
            setTagline((t) => t || current.tagline);
            setTeam((t) => t || current.team);
            if (current.socials.length) {
              setSocials((prev) => {
                if (prev.some((s) => s.trim())) return prev;
                const next = emptySocials();
                current.socials.forEach((s, i) => {
                  if (i < MAX_SOCIALS) next[i] = s;
                });
                return next;
              });
            }
          }
        })
        .catch((err: Error) => {
          setQuote(err.message);
          setCharge(null);
        });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [url, amount, site]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const dollars = Number(amount);
    setBusy(true);
    try {
      const { orderId } = await createBidOrder({
        data: {
          site,
          url,
          title,
          tagline,
          team,
          socials: founders ? clampSocials(socials) : [],
          amountDollars: dollars,
        },
      });
      await navigate({
        to: "/$site/checkout/$orderId",
        params: { site, orderId },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <p className="text-xs uppercase tracking-kicker text-subtle">Place a bid</p>
        <h1 className="mt-3 font-display-site text-4xl tracking-tight sm:text-5xl">
          {cfg.cta}
        </h1>
        <p className={founders ? "mt-3 font-display text-lg italic text-fg" : "mt-3 text-muted"}>
          {founders ? cfg.tagline : COPY.rebidHint}
        </p>

        <form onSubmit={(e) => void submit(e)} className="mt-8 flex flex-col gap-5">
          <Field label={founders ? "Listing title / Company name" : cfg.titleLabel} hint={cfg.titleHint}>
            <Input
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={cfg.name}
            />
          </Field>
          <Field label={founders ? "Page URL (about / team page)" : cfg.urlLabel} hint={cfg.urlHint}>
            <Input
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              inputMode="url"
              autoComplete="url"
            />
          </Field>
          <Field label={cfg.taglineLabel}>
            <Input
              maxLength={140}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder={cfg.tagline}
            />
          </Field>
          <Field
            label={founders ? "Founding team names" : cfg.extraLabel}
            hint={founders ? "The names sit first on the public board. People over product." : cfg.extraHint}
          >
            <Input
              maxLength={140}
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder={cfg.extraPlaceholder}
              required={founders}
            />
          </Field>
          {founders ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium text-fg">Founder socials (up to 5)</legend>
              <p className="text-xs text-subtle">
                X, LinkedIn, or a personal site. One founder per field. Shown as icons on the board.
              </p>
              {socials.map((value, i) => (
                <Field key={i} label={`Founder ${i + 1} social`}>
                  <Input
                    value={value}
                    onChange={(e) => {
                      const next = [...socials];
                      next[i] = e.target.value;
                      setSocials(next);
                    }}
                    placeholder="https://x.com/… or linkedin.com/in/…"
                    inputMode="url"
                  />
                </Field>
              ))}
            </fieldset>
          ) : null}
          <Field label="Bid total (USD)" hint={COPY.minBid}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Decrease bid"
                disabled={amountDollars == null || amountDollars <= MIN_BID_DOLLARS}
                onClick={() =>
                  setAmount(String(Math.max(MIN_BID_DOLLARS, (amountDollars ?? MIN_BID_DOLLARS) - 1)))
                }
                className={cn(
                  "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg shadow-[var(--shadow-border)]",
                  "hover:shadow-[var(--shadow-border-hover)] disabled:opacity-40",
                )}
              >
                <Minus className="size-4" />
              </button>
              <Input
                required
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                className="flex-1"
              />
              <button
                type="button"
                aria-label="Increase bid"
                onClick={() =>
                  setAmount(String((amountDollars ?? MIN_BID_DOLLARS) + 1))
                }
                className={cn(
                  "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg shadow-[var(--shadow-border)]",
                  "hover:shadow-[var(--shadow-border-hover)] disabled:opacity-40",
                )}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </Field>
          <RankHint amountDollars={amountDollars} leaderBidCents={leaderBidCents} />
          {quote ? (
            <p className="rounded-md bg-surface px-3 py-2.5 text-sm text-muted shadow-[var(--shadow-border)]">
              {quote}
              {charge != null ? (
                <span className="mt-1 block tabular text-fg">
                  Charge today {formatUsd(charge)}
                </span>
              ) : null}
            </p>
          ) : null}
          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy
              ? "Opening checkout…"
              : charge != null && charge < Number(amount) * 100
                ? COPY.payDifference
                : COPY.bidNow}
          </Button>
        </form>
      </div>
      <aside className="text-sm text-muted">
        <h2 className="text-fg">Before you pay</h2>
        <ul className="mt-3 space-y-2">
          {founders ? (
            <li>The founding team is the headline. The company URL stays secondary.</li>
          ) : null}
          <li>Cashfree sandbox in this preview. No real charge.</li>
          <li>You get a manage link after payment. Save it.</li>
          <li>The URL goes live the moment the order is marked paid.</li>
          <li>
            Swaps are later, from the manage page, and cost a cut of the current
            bid.
          </li>
        </ul>
      </aside>
    </div>
  );
}
