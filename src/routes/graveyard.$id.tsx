import { useState } from "react";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey, product as productInfo, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { getSql } from "@/lib/db.server";
import { formatMinor } from "@/lib/money";
import { JsonLd } from "@/components/seo";
import { breadcrumbSchema } from "@/lib/schema";
import { getSession } from "@/lib/authz";
import { entityRedirectFor } from "@/lib/marketplace/capabilities.server";
import { submitOfferFn, decideOfferFn, retractOfferFn, markTransferredFn, withdrawListingFn, publishListingFn } from "@/lib/marketplace/graveyard";

/**
 * /graveyard/:id — asset detail (Phase 01B, FR-2/FR-3). Offers and authority
 * context resolve server-side; transactions complete directly between parties.
 */
const loadDetail = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => z.object({ id: z.string().trim().min(4).max(64) }).parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const session = await getSession();
    const listing = (
      await sql.query<{
        id: string; product: string; seller_user_id: string; title: string; description: string;
        reason_of_death: string; includes: string[]; technology: string[];
        liabilities: string; history_self_reported: string;
        asking_price_minor: number | null; currency: string; status: string;
      }>(
        `select id, product, seller_user_id, title, description, reason_of_death, includes,
                technology, screenshots, liabilities, history_self_reported,
                asking_price_minor, currency, created_at
         from graveyard_listings where id = $1`,
        [data.id],
      )
    )[0];
    if (!listing) throw notFound();
    const product = await currentProductKey();
    const entityUrl = entityRedirectFor(listing.product, product, `/graveyard/${data.id}`);
    if (entityUrl) throw redirect({ to: entityUrl });

    let offers: Array<{
      id: string; buyer_user_id: string; amount_minor: number; message: string;
      status: string; buyer_name: string | null; buyer_handle: string | null;
    }> = [];
    if (session) {
      const isSeller = listing.seller_user_id === session.user.id;
      offers = await sql.query(
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
      isSeller: Boolean(session && listing.seller_user_id === session.user.id),
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

  return (
    <ProductShell site={data.product} me={data.me}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-subtle">
          <a href="/" className="underline-offset-4 hover:underline">
            {productInfo(data.product as ProductKey).name}
          </a>
          <span aria-hidden="true"> / </span>
          <a href="/graveyard" className="underline-offset-4 hover:underline">
            The Graveyard
          </a>
        </nav>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">{status}</p>
            <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">{l.title}</h1>
          </div>
          <div className="text-right">
            {l.asking_price_minor != null ? (
              <p className="font-display-site text-2xl tracking-tight text-accent">{formatMinor(Number(l.asking_price_minor), l.currency)}</p>
            ) : (
              <p className="text-sm text-muted">open to offers</p>
            )}
          </div>
        </div>

        {message ? (
          <p role="status" aria-live="polite" className="mt-4 rounded-md border-2 border-fg/15 bg-surface p-3 text-sm" data-testid="action-message">{message}</p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <section className="rounded-lg border-2 border-fg/15 bg-surface p-5">
              <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">The project</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{l.description}</p>
              {l.reason_of_death ? (
                <>
                  <h2 className="mt-5 text-xs font-medium uppercase tracking-kicker text-subtle">Why it was paused</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{l.reason_of_death}</p>
                </>
              ) : null}
              {l.includes.length > 0 ? (
                <>
                  <h2 className="mt-5 text-xs font-medium uppercase tracking-kicker text-subtle">Included</h2>
                  <ul className="mt-2 space-y-1 text-sm">
                    {l.includes.map((k) => <li key={k}>• {k}</li>)}
                  </ul>
                </>
              ) : null}
              {l.liabilities ? (
                <>
                  <h2 className="mt-5 text-xs font-medium uppercase tracking-kicker text-subtle">Known liabilities</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{l.liabilities}</p>
                </>
              ) : null}
              {l.history_self_reported ? (
                <>
                  <h2 className="mt-5 text-xs font-medium uppercase tracking-kicker text-subtle">History (self-reported)</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{l.history_self_reported}</p>
                </>
              ) : null}
            </section>
          </div>

          <div className="space-y-6">
            {data.isSeller ? (
              <>
                {status === "DRAFT" ? (
                  <section className="rounded-lg border-2 border-accent/40 bg-raised/40 p-4">
                    <p className="text-sm font-medium">Publish this listing</p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        await run(() => publishListingFn({ data: { listingId: String(l.id) } }), "Listing is live in the graveyard.");
                      }}
                      className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
                    >
                      Publish
                    </button>
                  </section>
                ) : null}

                {status === "UNDER_OFFER" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      await run(async () => markTransferredFn({ data: { listingId: String(l.id), checklistConfirmed: true } }), "Marked transferred.");
                    }}
                    className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
                  >
                    Mark transferred (checklist done)
                  </button>
                ) : null}

                {["DRAFT", "LISTED", "UNDER_OFFER"].includes(status) ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      await run(() => withdrawListingFn({ data: { listingId: String(l.id) } }), "Listing withdrawn.");
                    }}
                    className="text-sm text-danger underline underline-offset-2"
                  >
                    Withdraw listing
                  </button>
                ) : null}
              </>
            ) : null}

            {!data.isSeller && status === "LISTED" && !viewerOffer ? (
              <OfferBox listingId={String(l.id)} onDone={(m) => setMessage(m)} />
            ) : null}

            {!data.isSeller && viewerOffer ? (
              <section className="rounded-lg border-2 border-fg/15 bg-surface p-5" data-testid="my-offer">
                <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Your offer</h2>
                <p className="mt-2 text-sm">
                  {formatMinor(Number(viewerOffer.amount_minor), l.currency)} · {viewerOffer.status}
                </p>
                {viewerOffer.status === "PENDING" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      await run(() => retractOfferFn({ data: { offerId: String(viewerOffer.id) } }), "Offer retracted.");
                    }}
                    className="mt-2 text-xs text-muted underline underline-offset-2"
                  >
                    Retract offer
                  </button>
                ) : null}
              </section>
            ) : null}

            {data.isSeller && data.offers.length > 0 ? (
              <section className="rounded-lg border-2 border-fg/15 bg-surface p-5" data-testid="seller-offers">
                <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Offers ({data.offers.length})</h2>
                <ul className="mt-3 space-y-3">
                  {data.offers.map((o) => (
                    <li key={o.id} className="rounded-md border-2 border-fg/10 p-3 text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium">{formatMinor(Number(o.amount_minor), l.currency)} · {o.status}</p>
                        <p className="text-xs text-subtle">{o.buyer_name ?? "member"}{o.buyer_handle ? ` (@${o.buyer_handle})` : ""}</p>
                      </div>
                      {o.message ? <p className="mt-1 text-muted">{o.message}</p> : null}
                      {o.status === "PENDING" && ["LISTED", "UNDER_OFFER"].includes(status) ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              await run(() => decideOfferFn({ data: { offerId: String(o.id), decision: "ACCEPT" } }), "Offer accepted. Coordinate the handover directly.");
                            }}
                            className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-xs font-semibold text-accent-fg"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={async () => {
                              await run(() => decideOfferFn({ data: { offerId: String(o.id), decision: "REJECT" } }), "Offer rejected.");
                            }}
                            className="text-xs text-muted underline underline-offset-2"
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        <JsonLd
          data={breadcrumbSchema(data.product as ProductKey, [
            { name: productInfo(data.product as ProductKey).name, url: seoOrigin(data.product as ProductKey) },
            { name: "The Graveyard", url: `${seoOrigin(data.product as ProductKey)}/graveyard` },
            { name: l.title, url: `${seoOrigin(data.product as ProductKey)}/graveyard/${l.id}` },
          ])}
        />
      </div>
    </ProductShell>
  );
}

function OfferBox({
  listingId,
  onDone,
}: {
  listingId: string;
  onDone: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="rounded-lg border-2 border-fg/20 bg-surface p-5"
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
      <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Make an offer</h2>
      <input name="amountRupees" type="number" required min={1} placeholder="Your offer (₹)" className="mt-3 w-full rounded-md border-2 border-fg/20 bg-surface px-3 py-2.5 text-sm outline-none focus:border-fg/60" />
      <textarea name="message" rows={3} maxLength={2000} placeholder="Terms or questions (optional)" className="mt-3 w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
      <button type="submit" disabled={busy} className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg disabled:opacity-60">
        {busy ? "Sending…" : "Submit offer"}
      </button>
      <p className="mt-2 text-xs text-subtle">
        Accepted offers are commitments completed directly between you and the
        seller. The platform does not hold funds or credentials.
      </p>
    </form>
  );
}