import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createBounty,
  publishBountyForFunding,
  applyToBounty,
  decideApplication,
  withdrawApplication,
  startWork,
  upsertSubmission,
  judgeBounty,
  sponsorCancelBounty,
  bountyFundingPlan,
} from "@/lib/marketplace/bounties.server";
import { requireUser, toErrorResponse, requireVerifiedEmail } from "@/lib/authz";
import { assertHostCapability, assertBountyOnHost, assertBountyOfApplicationOnHost } from "@/lib/marketplace/capabilities.server";
import { moneyMode } from "@/lib/payments/provider";
import { bountyFloorCopy, meetsBountyRewardFloor } from "@/lib/money";
import { REWARD_STRUCTURES } from "@/lib/marketplace/state";

/**
 * Client-safe bounty serverFns (Phase 01, FR-4). Every function:
 *  - validates input with zod at the boundary,
 *  - authorizes against the server-side session (never client identity),
 *  - returns a machine-readable { ok, code?, message? } envelope.
 * The origin product is derived server-side from the request Host (the 00.6
 * rule: the client payload never decides which product a write belongs to).
 */

const httpsLink = z.string().trim().url().startsWith("https://").max(2048);

const createBountyInput = z
  .object({
    title: z.string().trim().min(8).max(140),
    description: z.string().trim().min(20).max(20000),
    category: z.string().trim().min(2).max(40),
    skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    deliverables: z.string().trim().max(8000).default(""),
    acceptanceCriteria: z.string().trim().max(8000).default(""),
    // RC5.2: the floor is PER CURRENCY (the single authoritative policy in
    // money.ts): ₹1,000 (100,000 paise) INR / $50 (5,000 cents) USD.
    // Checked at object level together with the currency below.
    rewardTotalMinor: z.number().int().min(1).max(1_000_000_000_00),
    // RC5.1 WS8: the sponsor's explicit currency choice; z.enum fails
    // visibly on anything else (never silently assume INR).
    currency: z.enum(["INR", "USD"]).default("INR"),
    rewardStructure: z.enum(REWARD_STRUCTURES),
    rewardAllocations: z
      .array(
        z
          .object({
            place: z.number().int().min(1).max(200),
            amountMinor: z.number().int().min(1),
            label: z.string().trim().max(60).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
    applicationDeadline: z.string().datetime().nullable().default(null),
    submissionDeadline: z.string().datetime(),
    participantCap: z.number().int().min(1).max(200).default(10),
    qualificationMode: z
      .enum(["APPLICATION_ONLY", "SPONSOR_APPROVAL"])
      .default("SPONSOR_APPROVAL"),
    ipAndConfidentiality: z.string().trim().max(4000).default(""),
    creative: z
      .object({
        formats: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
        targetPlatform: z.string().trim().max(120).optional(),
        publicPostingRequired: z.boolean().optional(),
        performanceMeasured: z.boolean().optional(),
        usageNotes: z.string().trim().max(2000).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    // The launch floor is a product rule PER CURRENCY (not an FX
    // conversion): INR ₹1,000, USD $50. One source: CURRENCY_MONEY_POLICY.
    // Unknown currency already fails the enum above; this is the
    // authoritative boundary check either way.
    if (!meetsBountyRewardFloor(v.rewardTotalMinor, v.currency)) {
      ctx.addIssue({
        code: "custom",
        path: ["rewardTotalMinor"],
        message: `The advertised reward must be at least ${bountyFloorCopy(v.currency)} for a ${v.currency} bounty.`,
      });
    }
  });

async function requestProductKey(): Promise<string> {
  const { serverProductKey } = await import("@/lib/host.server");
  return serverProductKey();
}

export const createBountyFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => createBountyInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; id: string; slug: string } | { ok: false; code: string; message: string }
    > => {
      try {
        await assertHostCapability("bounties");
        const session = await requireUser();
        // NOTE: drafts are free and need no email verification — only the
        // FUNDING action does (publishBountyFn). Keeping drafts open lets
        // sponsors prepare work before verification (honest degraded path).
        const result = await createBounty({
          sponsorUserId: session.user.id,
          product: await requestProductKey(),
          title: data.title,
          description: data.description,
          category: data.category,
          skills: data.skills,
          deliverables: data.deliverables,
          acceptanceCriteria: data.acceptanceCriteria,
          rewardTotalMinor: data.rewardTotalMinor,
          currency: data.currency,
          rewardStructure: data.rewardStructure,
          rewardAllocations: data.rewardAllocations,
          applicationDeadline: data.applicationDeadline,
          submissionDeadline: data.submissionDeadline,
          participantCap: data.participantCap,
          qualificationMode: data.qualificationMode,
          ipAndConfidentiality: data.ipAndConfidentiality,
          creative: data.creative,
        });
        return { ok: true, ...result };
      } catch (err) {
        const mapped = toErrorResponse(err);
        if (mapped) return { ok: false, ...mapped.body };
        return {
          ok: false,
          code: "validation",
          message: err instanceof Error ? err.message : "Invalid bounty data.",
        };
      }
    },
  );

/** Sponsor-facing money preview: advertised reward vs charge (fee on top). */
export const fundingPlanFn = createServerFn({ method: "GET" })
  .validator((input: { rewardTotalMinor: number }) =>
    z.object({ rewardTotalMinor: z.number().int().min(1) }).strict().parse(input),
  )
  .handler(async ({ data }) => {
    const plan = bountyFundingPlan(data.rewardTotalMinor);
    return { ...plan, mode: moneyMode() };
  });

export const publishBountyFn = createServerFn({ method: "POST" })
  .validator((input: { bountyId: string; returnUrl?: string }) =>
    z
      .object({
        bountyId: z.string().trim().min(8).max(64),
        returnUrl: z.string().trim().url().max(2048).optional(),
      })
      .strict()
      .parse(input),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; checkout: { paymentSessionId: string; providerOrderId: string; checkoutUrl?: string }; mode: string }
      | { ok: false; code: string; message: string }
    > => {
      try {
        await assertBountyOnHost(data.bountyId);
        const session = await requireUser();
        requireVerifiedEmail(session);
        const result = await publishBountyForFunding({
          bountyId: data.bountyId,
          sponsorUserId: session.user.id,
          email: session.user.email,
          returnUrl: data.returnUrl,
        });
        if (!result.ok) return { ok: false, code: result.code, message: result.message };
        return { ok: true, checkout: result.checkout, mode: result.mode };
      } catch (err) {
        const mapped = toErrorResponse(err);
        if (mapped) return { ok: false, ...mapped.body };
        return { ok: false, code: "error", message: "Could not publish bounty." };
      }
    },
  );

export const applyToBountyFn = createServerFn({ method: "POST" })
  .validator((input: { bountyId: string; message?: string }) =>
    z
      .object({
        bountyId: z.string().trim().min(8).max(64),
        message: z.string().trim().max(4000).default(""),
      })
      .strict()
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      await assertBountyOnHost(data.bountyId);
      const session = await requireUser();
      return await applyToBounty({
        bountyId: data.bountyId,
        userId: session.user.id,
        message: data.message,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not apply." };
    }
  });

export const decideApplicationFn = createServerFn({ method: "POST" })
  .validator((input: { applicationId: string; decision: "APPROVE" | "REJECT" }) =>
    z
      .object({
        applicationId: z.string().trim().min(8).max(64),
        decision: z.enum(["APPROVE", "REJECT"]),
      })
      .strict()
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      await assertBountyOfApplicationOnHost(data.applicationId);
      const session = await requireUser();
      return await decideApplication({
        applicationId: data.applicationId,
        sponsorUserId: session.user.id,
        decision: data.decision,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not decide application." };
    }
  });

export const withdrawApplicationFn = createServerFn({ method: "POST" })
  .validator((input: { applicationId: string }) =>
    z.object({ applicationId: z.string().trim().min(8).max(64) }).strict().parse(input),
  )
  .handler(async ({ data }) => {
    try {
      await assertBountyOfApplicationOnHost(data.applicationId);
      const session = await requireUser();
      return await withdrawApplication({
        applicationId: data.applicationId,
        userId: session.user.id,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not withdraw." };
    }
  });

export const startWorkFn = createServerFn({ method: "POST" })
  .validator((input: { bountyId: string }) =>
    z.object({ bountyId: z.string().trim().min(8).max(64) }).strict().parse(input),
  )
  .handler(async ({ data }) => {
    try {
      await assertBountyOnHost(data.bountyId);
      const session = await requireUser();
      return await startWork({ bountyId: data.bountyId, userId: session.user.id });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not start work." };
    }
  });

export const submitWorkFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        bountyId: z.string().trim().min(8).max(64),
        title: z.string().trim().min(3).max(140),
        body: z.string().trim().max(50000).default(""),
        links: z.array(httpsLink).max(10).default([]),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      await assertBountyOnHost(data.bountyId);
      const session = await requireUser();
      return await upsertSubmission({
        bountyId: data.bountyId,
        userId: session.user.id,
        title: data.title,
        body: data.body,
        links: data.links,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not submit." };
    }
  });

export const judgeBountyFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        bountyId: z.string().trim().min(8).max(64),
        placements: z
          .array(
            z.object({
              userId: z.string().min(4).max(64),
              place: z.number().int().min(1).max(200),
            }),
          )
          .min(1)
          .max(200),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      await assertBountyOnHost(data.bountyId);
      const session = await requireUser();
      requireVerifiedEmail(session);
      return await judgeBounty({
        bountyId: data.bountyId,
        sponsorUserId: session.user.id,
        placements: data.placements,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not judge bounty." };
    }
  });

export const cancelBountyFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        bountyId: z.string().trim().min(8).max(64),
        reason: z.string().trim().min(4).max(1000),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      await assertBountyOnHost(data.bountyId);
      const session = await requireUser();
      return await sponsorCancelBounty({
        bountyId: data.bountyId,
        sponsorUserId: session.user.id,
        reason: data.reason,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not cancel bounty." };
    }
  });