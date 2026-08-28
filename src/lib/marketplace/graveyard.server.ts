import { getSql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { AuthzError } from "@/lib/authz";
import { insertAudit } from "@/lib/audit.server";
import { notify } from "@/lib/marketplace/notifications.server";

/**
 * Startup Graveyard engine (Phase 01B, FR-1..4). Listings + offers only —
 * the platform takes NO money and reports NO payment status until a safe
 * transaction rail exists (docs/ops/PAYOUTS.md). Safety invariants baked in:
 * no secrets in listing text, self-offer prevention, one accepted offer.
 */

export type ListingRow = {
  id: string;
  product: string;
  seller_user_id: string;
  title: string;
  slug: string;
  description: string;
  reason_of_death: string;
  includes: string[];
  technology: string[];
  screenshots: string[];
  liabilities: string;
  history_self_reported: string;
  transfer_checklist: string[];
  asking_price_minor: number | null;
  reserve_minor: number | null;
  currency: string;
  status: string;
};

/**
 * Detail-page projection (RC3, S-7.1). The row type MUST equal the SQL
 * projection exactly: RC3 ships the regression for the bug where `status`
 * was claimed by the type but not selected by the query, which silently
 * disabled every status-dependent control on the detail page.
 */
export type GraveyardDetailRow = {
  id: string;
  product: string;
  seller_user_id: string;
  title: string;
  description: string;
  reason_of_death: string;
  includes: string[];
  technology: string[];
  liabilities: string;
  history_self_reported: string;
  asking_price_minor: number | null;
  currency: string;
  status: string;
};

export async function getGraveyardDetail(listingId: string): Promise<GraveyardDetailRow | null> {
  const sql = await getSql();
  const rows = await sql.query<GraveyardDetailRow>(
    `select id, product, seller_user_id, title, description, reason_of_death,
            includes, technology, liabilities, history_self_reported,
            asking_price_minor, currency, status
     from graveyard_listings where id = $1`,
    [listingId],
  );
  return rows[0] ?? null;
}

function slugFor(title: string, seed: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${base || "asset"}-${seed.slice(-6)}`;
}

/** Advisory guard: obvious credential shapes must not be pasted into listings. */
export function looksLikeSecret(text: string): boolean {
  return /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{30,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})/.test(
    text,
  );
}

export type CreateListingInput = {
  sellerUserId: string;
  product: string;
  title: string;
  description: string;
  reasonOfDeath?: string;
  includes?: string[];
  technology?: string[];
  screenshots?: string[];
  liabilities?: string;
  historySelfReported?: string;
  transferChecklist?: string[];
  askingPriceMinor?: number;
  reserveMinor?: number;
};

export async function createListing(input: CreateListingInput): Promise<{ id: string; slug: string }> {
  const all = [
    input.title ?? "",
    input.description ?? "",
    input.reasonOfDeath ?? "",
    input.liabilities ?? "",
    input.historySelfReported ?? "",
    ...(input.includes ?? []),
  ].join("\n");
  if (looksLikeSecret(all)) {
    throw new AuthzError(
      422,
      "secret_shaped_text",
      "The listing text contains something that looks like an API key or credential. Secrets must NEVER be posted here — remove it and transfer credentials directly through the provider.",
    );
  }
  const sql = await getSql();
  const id = makeId("gyl_");
  const slug = slugFor(input.title, id);
  await sql.query(
    `insert into graveyard_listings
      (id, product, seller_user_id, title, slug, description, reason_of_death,
       includes, technology, screenshots, liabilities, history_self_reported,
       transfer_checklist, asking_price_minor, reserve_minor)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13::jsonb,$14,$15)`,
    [
      id,
      input.product,
      input.sellerUserId,
      input.title,
      slug,
      input.description,
      input.reasonOfDeath ?? "",
      JSON.stringify((input.includes ?? []).slice(0, 12)),
      JSON.stringify((input.technology ?? []).slice(0, 12)),
      JSON.stringify((input.screenshots ?? []).slice(0, 6)),
      input.liabilities ?? "",
      input.historySelfReported ?? "",
      JSON.stringify((input.transferChecklist ?? []).slice(0, 12)),
      input.askingPriceMinor ?? null,
      input.reserveMinor ?? null,
    ],
  );
  return { id, slug };
}

export async function publishListing(opts: {
  listingId: string;
  sellerUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  const claimed = await sql.query<{ id: string }>(
    `update graveyard_listings set status='LISTED', published_at=now(), updated_at=now()
     where id=$1 and seller_user_id=$2 and status='DRAFT' returning id`,
    [opts.listingId, opts.sellerUserId],
  );
  if (claimed.length !== 1) {
    return { ok: false, code: "invalid_state", message: "Listing is not a draft (or not yours)." };
  }
  return { ok: true };
}

export async function withdrawListing(opts: {
  listingId: string;
  sellerUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  const claimed = await sql.query<{ id: string }>(
    `update graveyard_listings set status='WITHDRAWN', withdrawn_at=now(), updated_at=now()
     where id=$1 and seller_user_id=$2 and status in ('DRAFT','LISTED') returning id`,
    [opts.listingId, opts.sellerUserId],
  );
  if (claimed.length !== 1) {
    return { ok: false, code: "invalid_state", message: "Only draft or listed assets can be withdrawn." };
  }
  return { ok: true };
}

export type OfferInput = {
  listingId: string;
  buyerUserId: string;
  amountMinor: number;
  message?: string;
};

export async function submitOffer(
  input: OfferInput,
): Promise<{ ok: true; offerId: string } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(
    async (tx): Promise<{ ok: true; offerId: string } | { ok: false; code: string; message: string }> => {
      const listing = (
        await tx.query<{ id: string; seller_user_id: string; status: string; title: string }>(
          "select id, seller_user_id, status, title from graveyard_listings where id = $1 for update",
          [input.listingId],
        )
      )[0];
      if (!listing) return { ok: false, code: "not_found", message: "Listing not found." };
      if (listing.seller_user_id === input.buyerUserId) {
        return { ok: false, code: "self_offer", message: "You cannot offer on your own listing." };
      }
      if (listing.status !== "LISTED") {
        return { ok: false, code: "not_listed", message: `Listing is ${listing.status}.` };
      }
      const existing = (
        await tx.query<{ id: string; status: string }>(
          "select id, status from graveyard_offers where listing_id = $1 and buyer_user_id = $2",
          [input.listingId, input.buyerUserId],
        )
      )[0];
      if (existing && existing.status !== "WITHDRAWN" && existing.status !== "REJECTED") {
        return { ok: false, code: "already_offered", message: "You already have an offer on this listing." };
      }
      if (existing) {
        // re-offer after rejection/withdrawal: revive the row
        await tx.query(
          "update graveyard_offers set status='PENDING', amount_minor=$3, message=$4, created_at=now(), decided_at=null where id=$1 and buyer_user_id=$2 returning id",
          [existing.id, input.buyerUserId, input.amountMinor, input.message ?? ""],
        );
        return { ok: true, offerId: existing.id };
      }
      const id = makeId("gyo_");
      await tx.query(
        `insert into graveyard_offers (id, listing_id, buyer_user_id, amount_minor, message)
         values ($1,$2,$3,$4,$5)`,
        [id, input.listingId, input.buyerUserId, input.amountMinor, input.message ?? ""],
      );
      await notify(tx, {
        userId: listing.seller_user_id,
        type: "proposal_received",
        title: "New offer on your graveyard listing",
        body: `An offer arrived for "${listing.title}".`,
        entityType: "GRAVEYARD_LISTING",
        entityId: listing.id,
        link: `/graveyard/${listing.id}`,
      });
      return { ok: true, offerId: id };
    },
  );
}

export async function decideOffer(opts: {
  offerId: string;
  sellerUserId: string;
  decision: "ACCEPT" | "REJECT";
}): Promise<{ ok: true; status: string } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const rows = (
      await tx.query<{
        id: string;
        listing_id: string;
        buyer_user_id: string;
        status: string;
        seller_user_id: string;
        listing_status: string;
        title: string;
      }>(
        `select o.id, o.listing_id, o.buyer_user_id, o.status,
                g.seller_user_id, g.status as listing_status, g.title
         from graveyard_offers o join graveyard_listings g on g.id = o.listing_id
         where o.id = $1 for update of o`,
        [opts.offerId],
      )
    )[0];
    if (!rows) return { ok: false, code: "not_found", message: "Offer not found." };
    if (rows.seller_user_id !== opts.sellerUserId) {
      return { ok: false, code: "forbidden", message: "Not your listing." };
    }
    if (rows.status !== "PENDING") {
      return { ok: false, code: "invalid_state", message: `Offer is ${rows.status}.` };
    }
    if (!["LISTED", "UNDER_OFFER"].includes(rows.listing_status)) {
      return { ok: false, code: "invalid_state", message: `Listing is ${rows.listing_status}.` };
    }
    if (opts.decision === "ACCEPT") {
      // Only ONE accepted offer may exist at a time.
      const accepted = await tx.query<{ n: number }>(
        "select count(*)::int as n from graveyard_offers where listing_id = $1 and status = 'ACCEPTED'",
        [rows.listing_id],
      );
      if ((accepted[0]?.n ?? 0) > 0) {
        return {
          ok: false,
          code: "offer_in_progress",
          message: "Another offer is already accepted. Reject it first to switch.",
        };
      }
      await tx.query(
        "update graveyard_offers set status='ACCEPTED', decided_at=now() where id=$1",
        [rows.id],
      );
      await tx.query(
        `update graveyard_listings set status='UNDER_OFFER', updated_at=now()
         where id=$1 and status='LISTED'`,
        [rows.listing_id],
      );
      await notify(tx, {
        userId: rows.buyer_user_id,
        type: "proposal_selected",
        title: "Your offer was accepted",
        body: `The seller accepted your offer on "${rows.title}". The transaction is completed directly between you — the platform does not hold funds. Use the transfer checklist to coordinate the handover.`,
        entityType: "GRAVEYARD_LISTING",
        entityId: rows.listing_id,
        link: `/graveyard/${rows.listing_id}`,
      });
      return { ok: true, status: "ACCEPTED" };
    }
    await tx.query(
      "update graveyard_offers set status='REJECTED', decided_at=now() where id=$1",
      [rows.id],
    );
    return { ok: true, status: "REJECTED" };
  });
}

export async function retractOffer(opts: {
  offerId: string;
  buyerUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  const claimed = await sql.query<{ id: string }>(
    "update graveyard_offers set status='WITHDRAWN', decided_at=now() where id=$1 and buyer_user_id=$2 and status='PENDING' returning id",
    [opts.offerId, opts.buyerUserId],
  );
  if (claimed.length === 0) {
    return { ok: false, code: "not_retractable", message: "Only pending offers can be retracted." };
  }
  return { ok: true };
}

/**
 * Mark TRANSFERRED: seller attests every checklist item is done. All money
 * happened (or will happen) directly between the parties — the platform
 * records the fact, never a payment status.
 */
export async function markTransferred(opts: {
  listingId: string;
  actorUserId: string;
  isAdmin?: boolean;
  checklistConfirmed: boolean;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const listing = (
      await tx.query<{ id: string; status: string; seller_user_id: string; title: string }>(
        "select id, status, seller_user_id, title from graveyard_listings where id = $1 for update",
        [opts.listingId],
      )
    )[0];
    if (!listing) return { ok: false, code: "not_found", message: "Listing not found." };
    const allowed = opts.isAdmin || listing.seller_user_id === opts.actorUserId;
    if (!allowed) return { ok: false, code: "forbidden", message: "Not your listing." };
    if (!["LISTED", "UNDER_OFFER"].includes(listing.status)) {
      return { ok: false, code: "invalid_state", message: `Listing is ${listing.status}.` };
    }
    if (!opts.checklistConfirmed) {
      return { ok: false, code: "checklist_required", message: "Confirm the transfer checklist first." };
    }
    await tx.query(
      "update graveyard_listings set status='TRANSFERRED', transferred_at=now(), updated_at=now() where id=$1",
      [opts.listingId],
    );
    await insertAudit(tx, {
      actorUserId: opts.actorUserId,
      action: opts.isAdmin ? "admin_force_transfer" : "graveyard_transferred",
      entityType: "GRAVEYARD_LISTING",
      entityId: opts.listingId,
    });
    return { ok: true };
  });
}

