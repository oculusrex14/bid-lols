/**
 * Product capability model (RC1, R4) — THE central authority for which
 * product serves which marketplace capability, on which host, and where a
 * visitor should be sent otherwise.
 *
 * READ behavior: permanent/canonical redirect to the owning product's origin
 * (301 at the middleware layer; the shared matrix in host-seo-shared.mjs is
 * the single source so middleware, dev twin, and app code never disagree).
 * WRITE behavior: enforced server-side in every creation/mutation entry point
 * via assertProductCapability / assertEntityProduct — never by routing alone.
 *
 * Matrix:
 *   foundersbid: bounties, projects, graveyard
 *   culturebid:  bounties (creative)
 *   bidception:  bidception (parent/nested work)
 *   bidthrone:   reputation (leaderboards, bid index)
 *   shared:      profiles, auth, dashboard, notifications (all hosts)
 */
import { linkOrigin, type ProductKey } from "@/lib/host";
import { AuthzError } from "@/lib/authz-shared";
import {
  capabilityForPath as capabilityForPathShared,
  canonicalProductForCapability as canonicalShared,
  hasCapability as hasCapabilityShared,
  productCapabilities as productCapabilitiesShared,
} from "../../../scripts/host-seo-shared.mjs";

export type Capability =
  | "bounties"
  | "projects"
  | "graveyard"
  | "bidception"
  | "reputation"
  | "profiles"
  | "auth"
  | "dashboard"
  | "notifications";

// ---- READ side (shared single source) ------------------------------------
export function productCapabilities(product: ProductKey): Capability[] {
  return productCapabilitiesShared(product) as Capability[];
}
export function hasCapability(product: ProductKey, capability: Capability): boolean {
  return hasCapabilityShared(product, capability);
}
export function canonicalProductForCapability(capability: Capability): ProductKey | null {
  return canonicalShared(capability) as ProductKey | null;
}
export function capabilityForPath(pathname: string): Capability | null {
  return capabilityForPathShared(pathname) as Capability | null;
}

/**
 * READ redirect target: absolute URL when the host product cannot serve the
 * path's capability; null otherwise. Used by the middleware (list/create
 * routes) — detail routes redirect entity-aware in their loaders.
 */
export function readRedirectFor(
  hostProduct: ProductKey,
  pathname: string,
): string | null {
  const cap = capabilityForPath(pathname);
  if (!cap || hasCapability(hostProduct, cap)) return null;
  const canonical = canonicalProductForCapability(cap);
  if (!canonical) return null;
  return `${linkOrigin(canonical)}${pathname}`;
}

// ---- WRITE side -----------------------------------------------------------
/**
 * WRITE enforcement: throws AuthzError(403, "wrong_product") when the host
 * product cannot serve the capability. Used at every creation/mutation entry
 * point — independent of any page routing.
 */
export function assertProductCapability(product: ProductKey, capability: Capability): void {
  if (!hasCapability(product, capability)) {
    throw new AuthzError(
      403,
      "wrong_product",
      `This action is not available on this site — it belongs to another product of the network.`,
    );
  }
}

/**
 * Entity-scoped WRITE enforcement: the entity's own product must match the
 * request host's product (work happens where it was created).
 */
export function assertEntityProduct(entityProduct: string, hostProduct: ProductKey): void {
  if (entityProduct !== hostProduct) {
    throw new AuthzError(
      403,
      "wrong_product",
      "This record belongs to another product of the network; manage it on its own site.",
    );
  }
}

/** The host product of the current request (server-only). */
export async function requestProductKey(): Promise<ProductKey> {
  const { serverProductKey } = await import("@/lib/host.server");
  return serverProductKey();
}
