import { useState } from "react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey, product as productInfo, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { JsonLd } from "@/components/seo";
import { breadcrumbSchema } from "@/lib/schema";
import { getSession } from "@/lib/authz";
import { entityRedirectFor } from "@/lib/marketplace/capabilities.server";
import {
  submitOfferFn,
  decideOfferFn,
  retractOfferFn,
  markTransferredFn,
  withdrawListingFn,
  publishListingFn,
} from "@/lib/marketplace/graveyard";
import { graveyardControls } from "@/lib/marketplace/state";
import { statusLabel } from "@/lib/marketplace/status-labels";
import { MoneyValue } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { StickyPanel } from "@/components/ui/market";
import { InlineNotice } from "@/components/ui/states";

/**
 * /graveyard/:id — asset detail (Phase 01B, FR-2/FR-3; RC3, S-7.1/S-31).
 * RC3: the row comes from getGraveyardDetail (type == SQL projection —
 * status is selected), and every status-dependent control renders from the
 * graveyardControls matrix, so the UI can never offer what the engine
 * refuses. Screenshots are stored, not rendered (CSP, see RC3 spec 7.2).
 */
const loadDetail = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => z.object({ id: z.string().trim().min(4).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const session = await getSession();
    // Server-only module: dynamic import keeps the DB chain out of the
    // client bundle (import-protection gate).
    const { getGraveyardDetail } = await import("@/lib/marketplace/graveyard.server");
    const listing = await getGraveyardDetail(data.id);
    if (!listing) throw notFound();
    const product = await currentProductKey();
    const entityUrl = entityRedirectFor(listing.product, product, `/graveyard/${data.id}`);
    if (entityUrl) throw redirect({ to: entityUrl });

    const isSeller = Boolean(session && listing.seller_user_id === session.user.id);
    let offers: Array<{
      id: string; buyer_user_id: string; amount_minor: number; message: string;
      status: string; buyer_name: string | null; buyer_handle: string | null;
    }> = [];
    if (session) {
      offers = await (await getSql()).query(
        `select o.id, o.buyer_user_id, o.amount_minor, o.message, o.status,
                u.display_name as "buyer_name", pr.handle as "buyer_handle"
         from graveyard_offers o
         join users u on u.id = o.buyer_user_id
         left join profiles pr on pr.user_id = o.buyer_user_id
         where o.listing_id = $1
           ${isSeller ? "" : "and o.buyer_user_id = $2"}
         order by o.created_at asc`,
        isSeller ? [data.id] : [data.id, session.user.id],
      );
    }
    return {
      product: await currentProductKey(),
      me: (await (await import("@/lib/shell-context")).getShellContext()).me,
      listing,
      offers,
      isSeller,
      viewerUserId: session?.user.id ?? null,
    };
  });

export const Route = createFileRoute("/graveyard/$id")({
  loader: (ctx) => loadDetail({ data: { id: ctx.params.id } }),
  component: GraveyardDetailPage,
});

function GraveyardDetailPage() {
  const data = Route.useLoaderData();
  return <GraveyardDetailBody key={data.listing.id} data={data} />;
}

function GraveyardDetailBody({ data }: { data: NonNullable<Awaited<ReturnType<typeof loadDetail>>> }) {
  const l = data.listing;
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; message?: string }>, okNote: string) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await fn();
      setMessage(r.ok ? okNote : r.message ?? "Something went wrong.");
      if (r.ok) {
        await new Promise((res) => setTimeout(res, 600));
        location.reload();
      }
    } finally {
      setBusy(false);
    }
  }

  const status = l.status;
  const viewerOffer = data.offers.find((o) => o.buyer_user_id === data.viewerUserId) ?? null;
  const controls = graveyardControls({
    status,
    isSeller: data.isSeller,
    viewerOfferStatus: viewerOffer?.status ?? null,
  });
  const pKey = data.product as ProductKey;
  const origin = seoOrigin(pKey);

  return (
    <ProductShell site={data.product} me={data.me}>
      <div className="canvas-wide pb-16">
        <nav aria-label="Breadcrumb" className="pt-6 text-sm text-subtle">
          <Link to="/" className="hover:underline hover:underline-offset-4">
            {productInfo(pKey).name}
          </Link>
          <span aria-hidden="true"> / </span>
          <Link to="/graveyard" className="hover:underline hover:underline-offset-4">
            The Graveyard
          </Link>
        </nav>

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
          </div>
          <h1 className="mt-2 max-w-3xl font-display-site text-3xl tracking-tight sm:text-4xl">{l.title}</h1>
        </header>

        {message ? (
          <div className="mt-5" data-testid="action-message">
            <InlineNotice>{message}</InlineNotice>
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <GraveyardMain l={l} />
          </div>

          <div className="lg:col-span-4">
            <StickyPanel>
              <GraveyardPanel l={l} isSeller={data.isSeller} offers={data.offers} viewerOffer={viewerOffer} controls={controls} busy={busy} onRun={run} onDone={(m) => setMessage(m)} />
            </StickyPanel>
          </div>
        </div>

        <JsonLd
          data={breadcrumbSchema(pKey, [
            { name: productInfo(pKey).name, url: origin },
            { name: "The Graveyard", url: `${origin}/graveyard` },
            { name: l.title, url: `${origin}/graveyard/${l.id}` },
          ])}
        />
      </div>
    </ProductShell>
  );
}

/** The asset story: what it is, why it paused, what is included (RC3 S-31). */
function GraveyardMain({ l }: { l: NonNullable<Awaited<ReturnType<typeof loadDetail>>>["listing"] }) {
  return (
    <>
      <section aria-labelledby="h-project">
        <h2 id="h-project" className="text-sm font-semibold uppercase tracking-kicker text-subtle">The project</h2>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{l.description}</p>
      </section>
      {l.reason_of_death ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">Why it was paused</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{l.reason_of_death}</p>
        </section>
      ) : null}
      {l.includes.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">Included</h2>
          <ul className="mt-3 grid gap-1.5 text-[15px] sm:grid-cols-2">
            {l.includes.map((k) => (
              <li key={k} className="flex items-center gap-2">
                <span aria-hidden="true" className="text-accent">✓</span>
                {k}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {l.liabilities ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">Known liabilities</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{l.liabilities}</p>
        </section>
      ) : null}
      {l.history_self_reported ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">History (self-reported)</h2>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-muted">{l.history_self_reported}</p>
        </section>
      ) : null}
    </>
  );
}

/** Price, seller controls (status-driven), offer box, offer threads. */
function GraveyardPanel({
  l,
  isSeller,
  offers,
  viewerOffer,
  controls,
  busy,
  onRun,
  onDone,
}: {
  l: NonNullable<Awaited<ReturnType<typeof loadDetail>>>["listing"];
  isSeller: boolean;
  offers: NonNullable<Awaited<ReturnType<typeof loadDetail>>>["offers"];
  viewerOffer: NonNullable<Awaited<ReturnType<typeof loadDetail>>>["offers"][number] | null;
  controls: ReturnType<typeof graveyardControls>;
  busy: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string }>, okNote: string) => Promise<void>;
  onDone: (m: string) => void;
}) {
  return (
    <>
      <div className="rounded-md border border-fg/10 bg-surface/60 p-4">
        {l.asking_price_minor != null ? (
          <>
            <MoneyValue minor={Number(l.asking_price_minor)} currency={l.currency} size="xl" className="text-accent" />
            <p className="mt-0.5 text-xs text-subtle">asking price</p>
          </>
        ) : (
          <p className="text-sm font-medium">Open to offers</p>
        )}
      </div>

      {/* Seller controls (status-driven via graveyardControls). */}
      {isSeller ? (
        <div className="mt-4 space-y-3">
          {controls.canPublish ? (
            <div className="rounded-md border border-accent/40 bg-raised/40 p-4">
              <p className="text-sm font-medium">Publish this listing</p>
              <p className="mt-1 text-xs text-muted">It becomes visible in The Graveyard once published.</p>
              <Button className="mt-3 w-full" disabled={busy} onClick={() => void onRun(() => publishListingFn({ data: { listingId: String(l.id) } }), "Listing is live in the graveyard.")}>
                Publish
              </Button>
            </div>
          ) : null}
          {controls.canMarkTransferred ? (
            <Button className="w-full" disabled={busy} onClick={() => void onRun(() => markTransferredFn({ data: { listingId: String(l.id), checklistConfirmed: true } }), "Marked transferred.")}>
              Mark transferred (checklist done)
            </Button>
          ) : null}
          {controls.canWithdraw ? (
            <Button variant="danger" size="sm" className="w-full" disabled={busy} onClick={() => void onRun(() => withdrawListingFn({ data: { listingId: String(l.id) } }), "Listing withdrawn.")}>
              Withdraw listing
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Buyer: offer box. */}
      {controls.canOffer ? <OfferBox listingId={String(l.id)} currency={l.currency} onDone={onDone} /> : null}

      {!isSeller && viewerOffer ? (
        <div className="mt-4 rounded-md border border-fg/10 bg-surface/60 p-4" data-testid="my-offer">
          <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Your offer</p>
          <p className="mt-2 flex items-baseline justify-between gap-3 text-sm">
            <MoneyValue minor={Number(viewerOffer.amount_minor)} currency={l.currency} />
            <StatusBadge status={viewerOffer.status} />
          </p>
          {controls.canRetractOffer ? (
            <Button variant="ghost" size="sm" className="mt-2" disabled={busy} onClick={() => void onRun(() => retractOfferFn({ data: { offerId: String(viewerOffer.id) } }), "Offer retracted.")}>
              Retract offer
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Seller: all offers. */}
      {isSeller ? <SellerOffers l={l} offers={offers} busy={busy} canDecide={controls.canDecideOffers} onRun={onRun} /> : null}

      <p className="px-1 text-xs leading-relaxed text-subtle">
        Accepted offers are commitments completed directly between the buyer and the seller. The platform does not hold funds or credentials.
      </p>
    </>
  );
}

function SellerOffers({
  l,
  offers,
  busy,
  canDecide,
  onRun,
}: {
  l: NonNullable<Awaited<ReturnType<typeof loadDetail>>>["listing"];
  offers: NonNullable<Awaited<ReturnType<typeof loadDetail>>>["offers"];
  busy: boolean;
  canDecide: boolean;
  onRun: (fn: () => Promise<{ ok: boolean; message?: string }>, okNote: string) => Promise<void>;
}) {
  if (offers.length === 0) return null;
  return (
    <div className="mt-4 rounded-md border border-fg/10 bg-surface/60 p-4" data-testid="seller-offers">
      <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Offers ({offers.length})</p>
      <ul className="mt-3 space-y-3">
        {offers.map((o) => (
          <li key={o.id} className="border-t border-fg/10 pt-3 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="tabular text-sm font-medium">
                <MoneyValue minor={Number(o.amount_minor)} currency={l.currency} size="sm" /> · {statusLabel(o.status)}
              </p>
              <p className="text-xs text-subtle">
                {o.buyer_name ?? "member"}
                {o.buyer_handle ? ` (@${o.buyer_handle})` : ""}
              </p>
            </div>
            {o.message ? <p className="mt-1 text-sm text-muted">{o.message}</p> : null}
            {o.status === "PENDING" && canDecide ? (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void onRun(() => decideOfferFn({ data: { offerId: String(o.id), decision: "ACCEPT" } }), "Offer accepted. Coordinate the handover directly.")}
                >
                  Accept
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onRun(() => decideOfferFn({ data: { offerId: String(o.id), decision: "REJECT" } }), "Offer rejected.")}
                >
                  Reject
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OfferBox({ listingId, currency, onDone }: { listingId: string; currency: string; onDone: (m: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-4 rounded-md border border-fg/10 bg-surface/60 p-4"
      data-testid="offer-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        const r = await submitOfferFn({
          data: {
            listingId,
            amountRupees: Number(f.get("amountRupees")),
            message: String(f.get("message") ?? ""),
          },
        });
        setBusy(false);
        onDone(r.ok ? "Offer sent to the seller." : r.message);
      }}
    >
      <p className="text-sm font-semibold">Make an offer</p>
      <div className="mt-3 space-y-3">
        {/* RC5.1 WS13: the offer is denominated in the LISTING's currency
            (graveyard listings are INR in this release; the label never
            invents a symbol or mixes code + symbol). */}
        <Field label={`Your offer (${currency})`} required id="offer-amount">
          <Input id="offer-amount" name="amountRupees" type="number" required min={1} className="tabular" />
        </Field>
        <Field label="Terms or questions (optional)" id="offer-message">
          <Textarea id="offer-message" name="message" rows={3} maxLength={2000} />
        </Field>
      </div>
      <Button type="submit" loading={busy} className="mt-4 w-full">
        {busy ? "Sending…" : "Submit offer"}
      </Button>
    </form>
  );
}
