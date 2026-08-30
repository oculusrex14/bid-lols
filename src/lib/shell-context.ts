import { createServerFn } from "@tanstack/react-start";
import type { ProductKey } from "@/lib/host";

/**
 * Shared page context for the auth-aware shell (RC1, R5). One serverFn gives
 * every route loader the minimal session facts the ProductShell needs for
 * navigation — no PII, no client-supplied identity.
 *
 * IMPORTANT (RC1 fix): the logic lives in plain async functions so it can be
 * called from OTHER serverFn handlers without going through the RPC layer.
 * createServerFn calls inside createServerFn handlers fail with
 * "Server function info not found" in TanStack Start.
 */

export type ShellMe = {
  id: string;
  name: string;
  handle: string | null;
  emailVerified: boolean;
  role: string;
} | null;

/**
 * RC5 §18: the public-safe funding status. The value is derived from the
 * single authority, moneyMode() in src/lib/payments/provider.ts (off /
 * sandbox / live) — never from the capability matrix, never a second flag.
 * Only the mode string crosses to the client: no credentials, no env.
 */
export type FundingMode = "off" | "sandbox" | "live";

export type ShellContext = {
  me: ShellMe;
  funding: FundingMode;
};

async function fundingMode(): Promise<FundingMode> {
  try {
    // provider.ts is server-only (node:crypto); the dynamic import keeps the
    // client graph clean. moneyMode() itself is a pure env reader.
    const { moneyMode } = await import("@/lib/payments/provider");
    return moneyMode();
  } catch {
    // Fail closed to the safe state: no funding claims, ever.
    return "off";
  }
}

/** Plain async — callable from other serverFn handlers without RPC overhead. */
export async function getShellContext(): Promise<ShellContext> {
  const funding = await fundingMode();
  try {
    const { getSession } = await import("@/lib/authz");
    const session = await getSession();
    if (!session) return { me: null, funding };
    let handle: string | null = null;
    try {
      const { getOrCreateProfile } = await import("@/lib/profiles.server");
      handle = (await getOrCreateProfile(session.user.id)).handle ?? null;
    } catch (err) {
      // RC3, S-10.1: a missing handle degrades display only (signed-in
      // without a visible handle); log so the fault is not silent.
      console.error("[shell-context] profile handle lookup failed:", err);
      handle = null;
    }
    return {
      me: {
        id: session.user.id,
        name: session.user.name || session.user.email.split("@")[0],
        handle,
        emailVerified: session.user.emailVerified,
        role: session.user.role ?? "user",
      },
      funding,
    };
  } catch (err) {
    // RC3, S-10.1: shell navigation may degrade to anonymous (no PII either
    // way), but the failure must be logged — silent nulls hid a whole class
    // of infrastructure faults in RC2 and earlier.
    console.error("[shell-context] shell context degraded to anonymous:", err);
    return { me: null, funding };
  }
}

/** The serverFn wrapper for loaders that need the shell context directly. */
export const shellContext = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShellContext> => getShellContext(),
);


/**
 * Combined page shell context: active product (server-derived from Host) +
 * the auth-aware `me`. One serverFn so route loaders stay one-liners.
 */
export type MarketplaceShell = { product: ProductKey; me: ShellMe; funding: FundingMode };

/** Plain async — callable from other serverFn handlers. */
export async function getMarketplaceShell(): Promise<MarketplaceShell> {
  const { currentProductKey } = await import("@/lib/host");
  const { me, funding } = await getShellContext();
  return { product: await currentProductKey(), me, funding };
}

/** The serverFn wrapper. */
export const marketplaceShell = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketplaceShell> => getMarketplaceShell(),
);
