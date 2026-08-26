import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { WAITLIST_ROLES, type WaitlistRole } from "@/lib/waitlist-shared";

/**
 * Client-safe founding-access capture (Phase 00.5, WS3).
 *
 * - `email` + `role` are validated server-side (zod); the origin product is
 *   derived SERVER-side from the request Host header — the client payload
 *   never decides which product an entry is attributed to (AC-3.2/3.6).
 * - `consent` must be an explicit true from the form's opt-in box.
 * - `company` is a hidden honeypot field: real users never fill it; a filled
 *   value gets a silent fake success and is NOT written (AC-3.3).
 * - No accounts, no sessions (AC-3.5).
 */

export type { WaitlistRole };
export const waitlistRoleSchema = z.enum(WAITLIST_ROLES);

export const joinFoundingAccess = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        email: z.email().max(320),
        role: waitlistRoleSchema,
        consent: z.boolean(),
        company: z.string().max(200).optional(),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    if (!import.meta.env.SSR) {
      throw new Error("joinFoundingAccess must run server-side");
    }
    if (!data.consent) {
      return { ok: false as const, code: "missing_consent" as const };
    }
    const { submitWaitlistEntry } = await import("@/lib/waitlist.server");
    const { serverProductKey } = await import("@/lib/host.server");
    // Honeypot: silent fake success, no write.
    if (data.company && data.company.trim().length > 0) {
      return { ok: true as const, created: true };
    }
    const outcome = await submitWaitlistEntry({
      email: data.email.trim(),
      role: data.role,
      productKey: serverProductKey(),
      // ip is read server-side from the active request when undefined
      // (submitWaitlistEntry) — the client payload never carries it.
    });
    if (!outcome.ok) return { ok: false as const, code: outcome.code };
    return { ok: true as const, created: outcome.created };
  });
