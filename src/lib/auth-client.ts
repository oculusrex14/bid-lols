import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client (Phase 01, FR-1). Talks to /api/auth/* on the same
 * origin; session state comes back through React hooks (useSession).
 * The server (auth.server.ts) is the authority for every authorization
 * decision — this client only carries the session cookie and calls endpoints.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;