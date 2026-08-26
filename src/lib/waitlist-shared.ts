/**
 * Founding-access constants shared by the client (form + serverFn wrapper)
 * and the server-only writer (waitlist.server.ts). Kept in a plain module so
 * the `.server` DB layer never enters the client bundle (Phase 00.5, WS3).
 */

export const WAITLIST_ROLES = [
  "sponsor",
  "builder",
  "brand",
  "creator",
  "captain",
  "other",
] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

/** The consent statement captured with every entry (stored verbatim). */
export const WAITLIST_CONSENT_TEXT =
  "contacted by email about founding access to the Bid Network";
