import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createListing,
  publishListing,
  withdrawListing,
  submitOffer,
  decideOffer,
  retractOffer,
  markTransferred,
} from "@/lib/marketplace/graveyard.server";
import { requireUser, toErrorResponse } from "@/lib/authz";
import {
  assertHostCapability,
  assertGraveyardListingOnHost,
  assertGraveyardOfferListingOnHost,
} from "@/lib/marketplace/capabilities.server";

/**
 * Client-safe graveyard serverFns (Phase 01B). Envelope + authorization
 * discipline as the rest of the marketplace.
 */

const httpsUrl = z.string().trim().url().startsWith("https://").max(2048);

const createInput = z
  .object({
    title: z.string().trim().min(8).max(140),
    description: z.string().trim().min(20).max(20000),
    reasonOfDeath: z.string().trim().max(2000).default(""),
    includes: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
    technology: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
    screenshots: z.array(httpsUrl).max(6).default([]),
    liabilities: z.string().trim().max(4000).default(""),
    historySelfReported: z.string().trim().max(4000).default(""),
    transferChecklist: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
    askingPriceMajor: z.number().int().min(0).optional(),
    reserveMajor: z.number().int().min(0).optional(),
  })
  .strict();

export const createListingFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => createInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; id: string; slug: string } | { ok: false; code: string; message: string }> => {
      try {
        await assertHostCapability("graveyard");
        const session = await requireUser();
        const { serverProductKey } = await import("@/lib/host.server");
        const result = await createListing({
          sellerUserId: session.user.id,
          product: serverProductKey(),
          title: data.title,
          description: data.description,
          reasonOfDeath: data.reasonOfDeath,
          includes: data.includes,
          technology: data.technology,
          screenshots: data.screenshots,
          liabilities: data.liabilities,
          historySelfReported: data.historySelfReported,
          transferChecklist: data.transferChecklist,
          askingPriceMinor: data.askingPriceMajor != null ? data.askingPriceMajor * 100 : undefined,
          reserveMinor: data.reserveMajor != null ? data.reserveMajor * 100 : undefined,
        });
        return { ok: true, ...result };
      } catch (err) {
        const mapped = toErrorResponse(err);
        if (mapped) return { ok: false, ...mapped.body };
        return { ok: false, code: "validation", message: err instanceof Error ? err.message : "Invalid data." };
      }
    },
  );

export const publishListingFn = createServerFn({ method: "POST" })
  .validator((input: { listingId: string }) =>
    z.object({ listingId: z.string().trim().min(4).max(64) }).strict().parse(input),
  )
  .handler(async ({ data }) => {
    try {
      await assertGraveyardListingOnHost(data.listingId);
      const session = await requireUser();
      return await publishListing({ listingId: data.listingId, sellerUserId: session.user.id });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not publish listing." };
    }
  });

export const withdrawListingFn = createServerFn({ method: "POST" })
  .validator((input: { listingId: string }) =>
    z.object({ listingId: z.string().trim().min(4).max(64) }).strict().parse(input),
  )
  .handler(async ({ data }) => {
    try {
      await assertGraveyardListingOnHost(data.listingId);
      const session = await requireUser();
      return await withdrawListing({ listingId: data.listingId, sellerUserId: session.user.id });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not withdraw." };
    }
  });

export const submitOfferFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        listingId: z.string().trim().min(4).max(64),
        amountMajor: z.number().int().min(1),
        message: z.string().trim().max(2000).default(""),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      await assertGraveyardListingOnHost(data.listingId);
      const session = await requireUser();
      return await submitOffer({
        listingId: data.listingId,
        buyerUserId: session.user.id,
        amountMinor: data.amountMajor * 100,
        message: data.message,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not submit offer." };
    }
  });

export const decideOfferFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({ offerId: z.string().trim().min(4).max(64), decision: z.enum(["ACCEPT", "REJECT"]) })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      await assertGraveyardOfferListingOnHost(data.offerId);
      const session = await requireUser();
      return await decideOffer({
        offerId: data.offerId,
        sellerUserId: session.user.id,
        decision: data.decision,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not decide offer." };
    }
  });

export const retractOfferFn = createServerFn({ method: "POST" })
  .validator((input: { offerId: string }) =>
    z.object({ offerId: z.string().trim().min(4).max(64) }).strict().parse(input),
  )
  .handler(async ({ data }) => {
    try {
      await assertGraveyardOfferListingOnHost(data.offerId);
      const session = await requireUser();
      return await retractOffer({ offerId: data.offerId, buyerUserId: session.user.id });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not retract offer." };
    }
  });

export const markTransferredFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({ listingId: z.string().trim().min(4).max(64), checklistConfirmed: z.boolean() })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      await assertGraveyardListingOnHost(data.listingId);
      const session = await requireUser();
      return await markTransferred({
        listingId: data.listingId,
        actorUserId: session.user.id,
        checklistConfirmed: data.checklistConfirmed,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not mark transferred." };
    }
  });