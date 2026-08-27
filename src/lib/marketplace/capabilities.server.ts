import { getSql } from "@/lib/db.server";
import { PRODUCT_KEYS, linkOrigin, type ProductKey } from "@/lib/host";
import { AuthzError } from "@/lib/authz-shared";
import {
  assertEntityProduct,
  assertProductCapability,
  requestProductKey,
  type Capability,
} from "@/lib/marketplace/capabilities";

/**
 * Server-side capability checks (RC1, R4). The pure matrix lives in
 * capabilities.ts; this module adds the DB-backed entity checks. Every
 * creation/mutation serverFn calls these INSIDE its try block — a violation
 * surfaces as the machine-readable wrong_product envelope via toErrorResponse.
 */

/** The request host must be able to serve `capability` at all. */
export async function assertHostCapability(capability: Capability): Promise<void> {
  assertProductCapability(await requestProductKey(), capability);
}

async function entityProduct(table: string, id: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql.query<{ product: string }>(`select product from ${table} where id = $1`, [id]);
  return rows[0]?.product ?? null;
}

async function checkEntityProduct(table: string, id: string): Promise<void> {
  const product = await entityProduct(table, id);
  if (product === null) {
    throw new AuthzError(404, "not_found", "Record not found.");
  }
  assertEntityProduct(product, await requestProductKey());
}

/** The entity's product must match the request host's product. */
export function assertBountyOnHost(bountyId: string): Promise<void> {
  return checkEntityProduct("bounties", bountyId);
}
export function assertProjectOnHost(projectId: string): Promise<void> {
  return checkEntityProduct("projects", projectId);
}
export function assertGraveyardListingOnHost(listingId: string): Promise<void> {
  return checkEntityProduct("graveyard_listings", listingId);
}
export function assertParentWorkOnHost(parentWorkId: string): Promise<void> {
  return checkEntityProduct("parent_works", parentWorkId);
}

export async function assertBountyOfApplicationOnHost(applicationId: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql.query<{ product: string }>(
    "select b.product from bounty_applications a join bounties b on b.id = a.bounty_id where a.id = $1",
    [applicationId],
  );
  if (rows.length === 0) throw new AuthzError(404, "not_found", "Record not found.");
  assertEntityProduct(rows[0].product, await requestProductKey());
}

export async function assertMilestoneProjectOnHost(milestoneId: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql.query<{ product: string }>(
    "select p.product from project_milestones m join projects p on p.id = m.project_id where m.id = $1",
    [milestoneId],
  );
  if (rows.length === 0) throw new AuthzError(404, "not_found", "Record not found.");
  assertEntityProduct(rows[0].product, await requestProductKey());
}

export async function assertGraveyardOfferListingOnHost(offerId: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql.query<{ product: string }>(
    "select g.product from graveyard_offers o join graveyard_listings g on g.id = o.listing_id where o.id = $1",
    [offerId],
  );
  if (rows.length === 0) throw new AuthzError(404, "not_found", "Record not found.");
  assertEntityProduct(rows[0].product, await requestProductKey());
}

export async function assertChildWorkParentOnHost(childWorkId: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql.query<{ product: string }>(
    "select p.product from child_works c join parent_works p on p.id = c.parent_work_id where c.id = $1",
    [childWorkId],
  );
  if (rows.length === 0) throw new AuthzError(404, "not_found", "Record not found.");
  assertEntityProduct(rows[0].product, await requestProductKey());
}

/**
 * Entity-aware READ redirect: when an entity belongs to another product than
 * the request host, the absolute URL on the entity's own origin (same path).
 * Detail-route loaders use this (the middleware cannot know entity products
 * without a DB hit). null = the entity belongs to this host (or is unknown —
 * the loader then renders its honest not-found state).
 */
export function entityRedirectFor(
  entityProduct: string | null,
  hostProduct: ProductKey,
  pathname: string,
): string | null {
  if (entityProduct === null || entityProduct === hostProduct) return null;
  if (!(PRODUCT_KEYS as readonly string[]).includes(entityProduct)) return null;
  return `${linkOrigin(entityProduct as ProductKey)}${pathname}`;
}
