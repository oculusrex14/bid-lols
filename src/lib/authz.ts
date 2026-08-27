import { auth, type AuthSession } from "@/lib/auth.server";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Server-side authorization primitives (Phase 01, FR-1/§9).
 *
 * EVERY protected action goes through these helpers — user identity, admin
 * role and account status are read from the server-side session (Better Auth),
 * never from client input. serverFns catch AuthzError at their boundary and
 * map it to the machine-readable { code, message } error envelope.
 */

// Single source of the pure error type + boundary mapping (RC1, R4): kept in
// authz-shared.ts so client-graph modules can reference it without pulling
// the server-only auth chain into the browser.
import { AuthzError } from "@/lib/authz-shared";
export { AuthzError, toErrorResponse } from "@/lib/authz-shared";

/**
 * The active session for the current request, or null. Safe to call from any
 * server context (serverFns, route loaders via start handlers).
 */
export async function getSession(): Promise<AuthSession | null> {
  const request = getRequest();
  if (!request) return null;
  try {
    return await auth.api.getSession({ headers: request.headers });
  } catch {
    return null;
  }
}

export type ActingUser = AuthSession["user"];

/** A user whose account is neither suspended nor banned. */
export function accountBlocked(user: ActingUser & { status?: string }): boolean {
  return user.status === "suspended" || user.banned === true;
}

/** 401 when unauthenticated; 403 when the account is suspended/banned. */
export async function requireUser(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new AuthzError(401, "auth_required", "Sign in to continue.");
  }
  if (accountBlocked(session.user as ActingUser & { status?: string })) {
    throw new AuthzError(403, "account_suspended", "This account is suspended.");
  }
  return session;
}

/** 401 unauthenticated; 403 suspended; 403 not an admin. Admin role is server-side only. */
export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireUser();
  if (session.user.role !== "admin") {
    throw new AuthzError(403, "admin_required", "Admin access required.");
  }
  return session;
}

/**
 * Money-facing actions additionally require a verified email (FR-1/FR-7).
 * Without a mail provider, `email_verified` is only reachable through an
 * audited admin verification — the documented degraded path.
 */
export function requireVerifiedEmail(session: AuthSession): void {
  if (!session.user.emailVerified) {
    throw new AuthzError(
      403,
      "email_unverified",
      "Verify your email address before handling money.",
    );
  }
}