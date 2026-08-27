import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  profileInputSchema,
  getOrCreateProfile,
  getUserEmail,
  saveProfile,
  getPublicProfile,
  suggestHandle,
  type ProfileRow,
  type PublicProfile,
} from "@/lib/profiles.server";
import { requireUser, toErrorResponse } from "@/lib/authz";

/**
 * Client-safe profile serverFns (Phase 01, FR-2). Every function authorizes
 * server-side: reads/writes are scoped to the SESSION user — a client can
 * never name another user in a write path (§9 IDOR rule).
 */

export type MyProfileView = {
  email: string;
  displayName: string;
  emailVerified: boolean;
  role: string;
  profile: Omit<ProfileRow, "user_id"> & { user_id?: string };
};

export const getMyProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    | { ok: true; profile: MyProfileView }
    | { ok: false; code: string; message: string }
  > => {
    try {
      const session = await requireUser();
      const row = await getOrCreateProfile(session.user.id);
      const u = await getUserEmail(session.user.id);
      return {
        ok: true,
        profile: {
          email: u?.email ?? session.user.email,
          displayName: u?.display_name ?? session.user.name,
          emailVerified: u?.email_verified ?? false,
          role: u?.role ?? "user",
          profile: row,
        },
      };
    } catch (err) {
      const mapped = toErrorResponse(err);
      return mapped
        ? { ok: false, ...mapped.body }
        : { ok: false, code: "error", message: "Could not load profile." };
    }
  },
);

export const saveMyProfile = createServerFn({ method: "POST" })
  .validator(profileInputSchema.parse)
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; handle: string }
      | { ok: false; code: string; message: string }
    > => {
      try {
        const session = await requireUser();
        const result = await saveProfile(session.user.id, data);
        return { ok: true, handle: result.handle };
      } catch (err) {
        const mapped = toErrorResponse(err);
        if (mapped) return { ok: false, ...mapped.body };
        return {
          ok: false,
          code: "validation",
          message: err instanceof Error ? err.message : "Invalid profile data.",
        };
      }
    },
  );

export const getProfileByHandle = createServerFn({ method: "GET" })
  .validator((input: { handle: string }) =>
    z.object({ handle: z.string().trim().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: true; profile: PublicProfile | null }> => {
    // Public read — no session required. Returns null when absent/suspended.
    return { ok: true, profile: await getPublicProfile(data.handle) };
  });

/** Used by /profile/:handle's loader (SSR) to also fetch by exact handle. */
export { suggestHandle, getOrCreateProfile, getUserEmail };