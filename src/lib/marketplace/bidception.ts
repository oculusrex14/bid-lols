import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createParentWork,
  publishParentForFunding,
  verifyParentFunding,
  activateParent,
  selectCaptain,
  setCaptainCompensation,
  allocateChildWork,
  markChildReady,
  activateChild,
  completeChild,
  failChild,
  beginParentSettlement,
} from "@/lib/marketplace/bidception.server";
import { requireUser, toErrorResponse, requireVerifiedEmail } from "@/lib/authz";
import {
  assertHostCapability,
  assertParentWorkOnHost,
  assertChildWorkParentOnHost,
} from "@/lib/marketplace/capabilities.server";

/**
 * Client-safe Bidception serverFns (Phase 03). Product is derived
 * server-side from the request host (bidception).
 */

export const createParentWorkFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        title: z.string().trim().min(8).max(140),
        objective: z.string().trim().min(20).max(20000),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      await assertHostCapability("bidception");
      const { serverProductKey } = await import("@/lib/host.server");
      const result = await createParentWork({
        sponsorUserId: session.user.id,
        product: serverProductKey(),
        title: data.title,
        objective: data.objective,
      });
      return { ok: true, ...result };
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not create parent work." };
    }
  });

export const publishParentWorkFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        parentWorkId: z.string().trim().min(4).max(64),
        budgetRupees: z.number().int().min(1000),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      requireVerifiedEmail(session);
      await assertParentWorkOnHost(data.parentWorkId);
      return await publishParentForFunding({
        parentWorkId: data.parentWorkId,
        sponsorUserId: session.user.id,
        email: session.user.email,
        budgetRupees: data.budgetRupees,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not start funding." };
    }
  });

export const fundParentWorkFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({ parentWorkId: z.string().trim().min(4).max(64), paymentId: z.string().trim().min(4).max(64) })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      requireVerifiedEmail(session);
      await assertParentWorkOnHost(data.parentWorkId);
      const result = await verifyParentFunding({
        parentWorkId: data.parentWorkId,
        paymentId: data.paymentId,
      });
      return { ok: result === "funded" || result === "alreadyFunded", code: result, message: "" };
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Funding verification failed." };
    }
  });

export const activateParentWorkFn = createServerFn({ method: "POST" })
  .validator(
    z.object({ parentWorkId: z.string().trim().min(4).max(64) }).strict().parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      await assertParentWorkOnHost(data.parentWorkId);
      return await activateParent({ parentWorkId: data.parentWorkId, sponsorUserId: session.user.id });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not activate." };
    }
  });

export const selectCaptainFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        parentWorkId: z.string().trim().min(4).max(64),
        captainUserId: z.string().trim().min(4).max(64),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      await assertParentWorkOnHost(data.parentWorkId);
      return await selectCaptain({
        parentWorkId: data.parentWorkId,
        sponsorUserId: session.user.id,
        captainUserId: data.captainUserId,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not select captain." };
    }
  });

export const setCaptainFeeFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        parentWorkId: z.string().trim().min(4).max(64),
        feeRupees: z.number().int().min(0),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      await assertParentWorkOnHost(data.parentWorkId);
      return await setCaptainCompensation({
        parentWorkId: data.parentWorkId,
        actorUserId: session.user.id,
        feeMinor: data.feeRupees * 100,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not set captain fee." };
    }
  });

export const allocateChildWorkFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        parentWorkId: z.string().trim().min(4).max(64),
        title: z.string().trim().min(3).max(140),
        allocatedRupees: z.number().int().min(1),
        dependsOnIds: z.array(z.string().trim().min(4).max(64)).max(20).default([]),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      await assertParentWorkOnHost(data.parentWorkId);
      return await allocateChildWork({
        parentWorkId: data.parentWorkId,
        actorUserId: session.user.id,
        title: data.title,
        allocatedMinor: data.allocatedRupees * 100,
        dependsOn: data.dependsOnIds,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not allocate." };
    }
  });

export const childStateFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        childWorkId: z.string().trim().min(4).max(64),
        action: z.enum(["mark_ready", "activate", "complete", "fail"]),
        reason: z.string().trim().max(400).optional(),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      await assertChildWorkParentOnHost(data.childWorkId);
      switch (data.action) {
        case "mark_ready":
          return await markChildReady({ childWorkId: data.childWorkId, actorUserId: session.user.id });
        case "activate":
          return await activateChild({ childWorkId: data.childWorkId, actorUserId: session.user.id });
        case "complete":
          return await completeChild({ childWorkId: data.childWorkId, actorUserId: session.user.id });
        case "fail":
          return await failChild({
            childWorkId: data.childWorkId,
            actorUserId: session.user.id,
            reason: data.reason ?? "",
          });
      }
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "State change failed." };
    }
  });

export const settleParentWorkFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        parentWorkId: z.string().trim().min(4).max(64),
        action: z.enum(["REFUND_RESERVE", "RELEASE_RESERVE"]),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      requireVerifiedEmail(session);
      await assertParentWorkOnHost(data.parentWorkId);
      return await beginParentSettlement({
        parentWorkId: data.parentWorkId,
        actorUserId: session.user.id,
        action: data.action,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Settlement failed." };
    }
  });