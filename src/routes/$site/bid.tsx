import { type FormEvent, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createBidOrder, quoteBid } from "@/lib/board-fns";
import { formatUsd } from "@/lib/format";
import { COPY, MIN_BID_DOLLARS, SITES, isSiteId } from "@/lib/sites";

type BidSearch = { url?: string };

export const Route = createFileRoute("/$site/bid")({
  validateSearch: (search: Record<string, unknown>): BidSearch => ({
    url: typeof search.url === "string" ? search.url : undefined,
  }),
  component: BidPage,
});

function BidPage() {
  const { site: siteParam } = Route.useParams();
  const site = isSiteId(siteParam) ? siteParam : "founders";
  const { url: prefillUrl } = Route.useSearch();
  const navigate = useNavigate();
  const cfg = SITES[site];

  const [url, setUrl] = useState(prefillUrl ?? "");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [team, setTeam] = useState("");
  const [amount, setAmount] = useState(String(MIN_BID_DOLLARS));
  const [quote, setQuote] = useState<string>("");
  const [charge, setCharge] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const filledFromExisting = useRef(false);

  useEffect(() => {
    if (prefillUrl) setUrl(prefillUrl);
  }, [prefillUrl]);

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
            setTitle((t) => t || q.current!.title);
            setTagline((t) => t || q.current!.tagline);
            setTeam((t) => t || q.current!.team);
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
        <p className="text-xs uppercase tracking-[0.2em] text-subtle">Place a bid</p>
        <h1 className="mt-3 font-display-site text-4xl tracking-tight sm:text-5xl">
          {cfg.cta}
        </h1>
        <p className="mt-3 text-muted">{COPY.rebidHint}</p>

        <form onSubmit={(e) => void submit(e)} className="mt-8 flex flex-col gap-5">
          <Field label={cfg.urlLabel} hint={cfg.urlHint}>
            <Input
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              inputMode="url"
              autoComplete="url"
            />
          </Field>
          <Field label={cfg.titleLabel} hint={cfg.titleHint}>
            <Input
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={cfg.name}
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
          <Field label={cfg.extraLabel} hint={cfg.extraHint}>
            <Input
              maxLength={140}
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder={cfg.extraPlaceholder}
            />
          </Field>
          <Field label="Bid total (USD)" hint={COPY.minBid}>
            <Input
              required
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            />
          </Field>
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
