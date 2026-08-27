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

export type ShellContext = {
  me: ShellMe;
};

/** Plain async — callable from other serverFn handlers without RPC overhead. */
export async function getShellContext(): Promise<ShellContext> {
  try {
    const { getSession } = await import("@/lib/authz");
    const session = await getSession();
    if (!session) return { me: null };
    let handle: string | null = null;
    try {
      const { getOrCreateProfile } = await import("@/lib/profiles.server");
      handle = (await getOrCreateProfile(session.user.id)).handle ?? null;
    } catch {
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
    };
  } catch {
    return { me: null };
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
export type MarketplaceShell = { product: ProductKey; me: ShellMe };

/** Plain async — callable from other serverFn handlers. */
export async function getMarketplaceShell(): Promise<MarketplaceShell> {
  const { currentProductKey } = await import("@/lib/host");
  const { me } = await getShellContext();
  return { product: await currentProductKey(), me };
}

/** The serverFn wrapper. */
export const marketplaceShell = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketplaceShell> => getMarketplaceShell(),
);
