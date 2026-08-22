import { type FormEvent, useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createBidOrder, createSwapOrder, getManaged } from "@/lib/board-fns";
import { formatUsd, hostOf, rankLabel } from "@/lib/format";
import { rememberOwned } from "@/lib/owned";
import { COPY, isSiteId, type SiteId } from "@/lib/sites";
import { FounderSocials } from "@/components/founder-socials";
import { CultureValues } from "@/components/culture-values";
import { SiteFavicon } from "@/components/site-favicon";
import { ManageLinkSave } from "@/components/manage-link-save";

export const Route = createFileRoute("/$site/manage/$token")({
  loader: ({ params }) => getManaged({ data: { token: params.token } }),
  component: ManagePage,
});

function ManagePage() {
  const { site: siteParam, token } = Route.useParams();
  const site = isSiteId(siteParam) ? siteParam : "founders";
  const navigate = useNavigate();
  const initial = Route.useLoaderData();
  const managed = useQuery({
    queryKey: ["managed", token],
    queryFn: () => getManaged({ data: { token } }),
    placeholderData: initial,
  });

  const listing = managed.data?.listing;
  const quote = managed.data?.quote;
  const [manageUrl, setManageUrl] = useState("");

  useEffect(() => {
    setManageUrl(window.location.href);
    if (listing && isSiteId(listing.site)) {
      rememberOwned({
        site: listing.site,
        listingId: listing.id,
        token,
        title: listing.title,
      });
    }
  }, [listing, token]);

  if (managed.isError) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-display-site text-3xl">Manage link not valid</h1>
        <p className="mt-3 text-muted">
          {managed.error instanceof Error
            ? managed.error.message
            : "This token does not match a listing."}
        </p>
        <Link to="/$site" params={{ site }} className="mt-6 inline-block text-sm hover:underline">
          {COPY.backToBoard}
        </Link>
      </div>
    );
  }

  if (!listing) {
    return <div className="mx-auto h-64 max-w-lg rounded-xl bg-surface shadow-[var(--shadow-border)]" />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs uppercase tracking-kicker text-subtle">Manage listing</p>
      <div className="mt-3 flex items-start gap-3">
        <SiteFavicon url={listing.url} title={listing.title} size="lg" />
        <div className="min-w-0">
          {listing.site === "founders" && listing.team ? (
            <>
              <p className="text-xs uppercase tracking-kicker text-subtle">Founding team</p>
              <h1 className="mt-1 font-display text-4xl italic tracking-tight">{listing.team}</h1>
              <p className="mt-2 text-muted">
                {listing.title}
                <span className="text-subtle"> · {hostOf(listing.url)}</span>
              </p>
            </>
          ) : listing.site === "culture" ? (
            <>
              <p className="text-xs uppercase tracking-kicker text-subtle">Company culture</p>
              <h1 className="mt-1 font-display-site text-4xl tracking-tight">{listing.title}</h1>
              <p className="mt-2 text-sm text-muted">{hostOf(listing.url)}</p>
            </>
          ) : (
            <>
              <h1 className="font-display-site text-4xl tracking-tight">{listing.title}</h1>
              {listing.team ? <p className="mt-2 text-sm text-muted">{listing.team}</p> : null}
              <p className="mt-2 text-sm text-muted">{hostOf(listing.url)}</p>
            </>
          )}
        </div>
      </div>
      {listing.site === "founders" ? (
        <FounderSocials socials={listing.socials} className="mt-4" />
      ) : listing.site === "culture" ? (
        <>
          <CultureValues values={listing.values} className="mt-4" />
          {listing.team ? (
            <p className="mt-3 font-display italic text-muted">“{listing.team}”</p>
          ) : null}
        </>
      ) : null}

      {manageUrl ? <ManageLinkSave href={manageUrl} /> : null}

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Rank" value={rankLabel(listing.rank)} />
        <Stat label="Bid" value={formatUsd(listing.bidCents)} />
        <Stat label="Visits" value={listing.clicks.toLocaleString()} />
        <Stat label="Swaps used" value={String(listing.swapCount)} />
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            const url = window.location.href;
            await navigator.clipboard.writeText(url);
            toast.success(COPY.copied);
          }}
        >
          {COPY.copyManage}
        </Button>
        <Button asChild variant="ghost">
          <Link to="/$site/listing/$id" params={{ site, id: listing.id }}>
            View listing
          </Link>
        </Button>
      </div>

      <RebidForm
        site={site}
        url={listing.url}
        title={listing.title}
        tagline={listing.tagline}
        team={listing.team}
        currentDollars={listing.bidCents / 100}
        onOrder={(orderId) =>
          navigate({ to: "/$site/checkout/$orderId", params: { site, orderId } })
        }
      />

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-display-site text-2xl">Swap the URL</h2>
        {quote && !quote.allowed ? (
          <p className="mt-3 text-sm text-danger">{quote.reason}</p>
        ) : quote && quote.allowed ? (
          <>
            <p className="mt-3 text-sm text-muted">
              {quote.note} Fee {formatUsd(quote.feeCents)} at {Math.round(quote.rate * 100)}%,
              with a $10 floor and $2,500 cap.
              {quote.remaining != null
                ? ` ${quote.remaining} swap${quote.remaining === 1 ? "" : "s"} left after this.`
                : " Unlimited at this rank."}
            </p>
            <SwapForm
              token={token}
              onOrder={(orderId) =>
                navigate({ to: "/$site/checkout/$orderId", params: { site, orderId } })
              }
            />
          </>
        ) : null}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-3 shadow-[var(--shadow-border)]">
      <dt className="text-xs uppercase tracking-wider text-subtle">{label}</dt>
      <dd className="mt-1 tabular text-lg font-medium">{value}</dd>
    </div>
  );
}

function RebidForm({
  site,
  url,
  title,
  tagline,
  team,
  currentDollars,
  onOrder,
}: {
  site: SiteId;
  url: string;
  title: string;
  tagline: string;
  team: string;
  currentDollars: number;
  onOrder: (orderId: string) => Promise<unknown> | unknown;
}) {
  const [amount, setAmount] = useState(String(Math.ceil(currentDollars) + 1));
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { orderId } = await createBidOrder({
        data: {
          site,
          url,
          title,
          tagline,
          team,
          amountDollars: Number(amount),
        },
      });
      await onOrder(orderId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start re-bid.");
    } finally {
      setBusy(false);
    }
  }

  const dollars = Number(amount);
  const diff = Number.isInteger(dollars) ? dollars - currentDollars : 0;

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-10 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
      <h2 className="font-display-site text-2xl">Re-bid</h2>
      <p className="mt-2 text-sm text-muted">{COPY.rebidHint}</p>
      <div className="mt-4">
        <Field label="New total (USD)">
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          />
        </Field>
      </div>
      {diff > 0 ? (
        <p className="mt-3 text-sm text-muted">
          Charge today <span className="tabular text-fg">{formatUsd(diff * 100)}</span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-danger">Must beat {formatUsd(currentDollars * 100)}.</p>
      )}
      <Button type="submit" className="mt-4" disabled={busy || diff <= 0}>
        {busy ? "Opening checkout…" : COPY.payDifference}
      </Button>
    </form>
  );
}

function SwapForm({
  token,
  onOrder,
}: {
  token: string;
  onOrder: (orderId: string) => Promise<unknown> | unknown;
}) {
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { orderId } = await createSwapOrder({ data: { token, newUrl } });
      await onOrder(orderId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start swap.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-5 flex flex-col gap-3">
      <Field label="New destination URL">
        <Input
          required
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://"
        />
      </Field>
      <Button type="submit" disabled={busy} variant="outline">
        {busy ? "Opening checkout…" : COPY.swapUrl}
      </Button>
    </form>
  );
}
