import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser, toErrorResponse } from "@/lib/authz";
import { createReview } from "@/lib/marketplace/reviews.server";

/**
 * Client-safe review serverFns (Phase 01, FR-8). The reviewee is NEVER named
 * by the client: the engine derives it from the verified work relationship.
 */

const reviewInput = z
  .object({
    workType: z.enum(["BOUNTY", "PROJECT"]),
    workId: z.string().trim().min(4).max(64),
    direction: z.enum(["SPONSOR_TO_PROVIDER", "PROVIDER_TO_SPONSOR"]),
    quality: z.number().int().min(1).max(5).optional(),
    communication: z.number().int().min(1).max(5).optional(),
    timeliness: z.number().int().min(1).max(5).optional(),
    clarity: z.number().int().min(1).max(5).optional(),
    body: z.string().trim().max(4000).default(""),
  })
  .strict();

export const createReviewFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => reviewInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; revieweeUserId: string } | { ok: false; code: string; message: string }> => {
      try {
        const session = await requireUser();
        const result = await createReview({
          workType: data.workType,
          workId: data.workId,
          reviewerUserId: session.user.id,
          direction: data.direction,
          quality: data.quality,
          communication: data.communication,
          timeliness: data.timeliness,
          clarity: data.clarity,
          body: data.body,
        });
        return { ok: true, revieweeUserId: result.revieweeUserId };
      } catch (err) {
        const mapped = toErrorResponse(err);
        if (mapped) return { ok: false, ...mapped.body };
        return { ok: false, code: "error", message: "Could not create review." };
      }
    },
  );
