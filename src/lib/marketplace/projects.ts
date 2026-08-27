import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createProject,
  publishProject,
  submitProposal,
  selectProposal,
  projectFundingPlan,
} from "@/lib/marketplace/projects.server";
import { requireUser, toErrorResponse, requireVerifiedEmail } from "@/lib/authz";
import { moneyMode } from "@/lib/payments/provider";

/**
 * Client-safe project serverFns (Phase 01, FR-5). Same envelope and
 * authorization discipline as the bounty serverFns.
 */

const createInput = z
  .object({
    title: z.string().trim().min(8).max(140),
    description: z.string().trim().min(20).max(30000),
    category: z.string().trim().min(2).max(40),
    skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    budgetMinRupees: z.number().int().min(0).optional(),
    budgetMaxRupees: z.number().int().min(0).optional(),
    proposalDeadline: z.string().datetime().optional(),
    ipAndConfidentiality: z.string().trim().max(4000).default(""),
  })
  .strict();

export const createProjectFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => createInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; id: string; slug: string } | { ok: false; code: string; message: string }> => {
      try {
        const session = await requireUser();
        const { serverProductKey } = await import("@/lib/host.server");
        const result = await createProject({
          sponsorUserId: session.user.id,
          product: serverProductKey(),
          title: data.title,
          description: data.description,
          category: data.category,
          skills: data.skills,
          budgetMinMinor: data.budgetMinRupees != null ? data.budgetMinRupees * 100 : undefined,
          budgetMaxMinor: data.budgetMaxRupees != null ? data.budgetMaxRupees * 100 : undefined,
          proposalDeadline: data.proposalDeadline ?? null,
          ipAndConfidentiality: data.ipAndConfidentiality,
        });
        return { ok: true, ...result };
      } catch (err) {
        const mapped = toErrorResponse(err);
        if (mapped) return { ok: false, ...mapped.body };
        return { ok: false, code: "validation", message: err instanceof Error ? err.message : "Invalid data." };
      }
    },
  );

export const publishProjectFn = createServerFn({ method: "POST" })
  .validator((input: { projectId: string; proposalDeadline?: string }) =>
    z
      .object({
        projectId: z.string().trim().min(8).max(64),
        proposalDeadline: z.string().datetime().optional(),
      })
      .strict()
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      return await publishProject({
        projectId: data.projectId,
        sponsorUserId: session.user.id,
        proposalDeadline: data.proposalDeadline ?? null,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not publish project." };
    }
  });

export const submitProposalFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        projectId: z.string().trim().min(8).max(64),
        approach: z.string().trim().min(20).max(8000),
        experience: z.string().trim().max(4000).default(""),
        quotedMinor: z.number().int().min(1),
        timelineWeeks: z.number().int().min(1).max(52).optional(),
        milestonesProposed: z
          .array(z.object({ title: z.string().trim().min(1).max(120), amountMinor: z.number().int().min(0), description: z.string().max(2000).optional() }))
          .min(1)
          .max(50),
        notes: z.string().trim().max(4000).default(""),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      return await submitProposal({
        projectId: data.projectId,
        providerUserId: session.user.id,
        approach: data.approach,
        experience: data.experience,
        quotedMinor: data.quotedMinor,
        timelineWeeks: data.timelineWeeks,
        milestonesProposed: data.milestonesProposed,
        notes: data.notes,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not submit proposal." };
    }
  });

export const selectProposalFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({ projectId: z.string().trim().min(8).max(64), proposalId: z.string().trim().min(8).max(64) })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      requireVerifiedEmail(session);
      return await selectProposal({
        projectId: data.projectId,
        proposalId: data.proposalId,
        sponsorUserId: session.user.id,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not select proposal." };
    }
  });

export const projectFundingPlanFn = createServerFn({ method: "GET" })
  .validator((input: { quotedMinor: number }) =>
    z.object({ quotedMinor: z.number().int().min(1) }).strict().parse(input),
  )
  .handler(async ({ data }) => {
    const plan = projectFundingPlan(data.quotedMinor);
    return { ...plan, mode: moneyMode() };
  });

/** Funding intent for the selected proposal: creates the pending payment. */
export const fundProjectFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({ projectId: z.string().trim().min(8).max(64), returnUrl: z.string().trim().url().max(2048).optional() })
      .strict()
      .parse,
  )
  .handler(
    async ({
      data,
    }): Promise<
      { ok: true; checkoutUrl?: string; providerOrderId: string } | { ok: false; code: string; message: string }
    > => {
      try {
        const session = await requireUser();
        requireVerifiedEmail(session);
        const result = await (await import("@/lib/marketplace/projects.server")).fundProject({
          projectId: data.projectId,
          sponsorUserId: session.user.id,
          email: session.user.email,
          returnUrl: data.returnUrl,
        });
        if (!result.ok) return { ok: false, code: result.code, message: result.message };
        return { ok: true, checkoutUrl: result.checkoutUrl, providerOrderId: result.providerOrderId };
      } catch (err) {
        const mapped = toErrorResponse(err);
        if (mapped) return { ok: false, ...mapped.body };
        return { ok: false, code: "error", message: "Could not start funding." };
      }
    },
  );

export const decideMilestoneFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        milestoneId: z.string().trim().min(8).max(64),
        decision: z.enum(["APPROVE", "REJECT"]),
        feedback: z.string().trim().max(2000).optional(),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      const server = await import("@/lib/marketplace/projects.server");
      const result = await server.decideMilestone({
        milestoneId: data.milestoneId,
        sponsorUserId: session.user.id,
        decision: data.decision,
        feedback: data.feedback,
      });
      if (result.ok) {
        const sql = await (await import("@/lib/db.server")).getSql();
        const info = (
          await sql.query<{ provider_user_id: string; title: string; project_id: string }>(
            `select pp.provider_user_id, m.title, m.project_id from project_milestones m
             join projects p on p.id = m.project_id
             join project_proposals pp on pp.id = p.selected_proposal_id
             where m.id = $1`,
            [data.milestoneId],
          )
        )[0];
        if (info) {
          await server.notifyMilestoneDecision({
            providerUserId: info.provider_user_id,
            milestoneTitle: info.title,
            accepted: data.decision === "APPROVE",
            projectId: info.project_id,
          });
        }
      }
      return result;
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not decide milestone." };
    }
  });

export const submitMilestoneFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        milestoneId: z.string().trim().min(8).max(64),
        notes: z.string().trim().max(4000).default(""),
        links: z.array(z.string().trim().url().startsWith("https://").max(2048)).max(10).default([]),
      })
      .strict()
      .parse,
  )
  .handler(async ({ data }) => {
    try {
      const session = await requireUser();
      const { submitMilestone } = await import("@/lib/marketplace/projects.server");
      return await submitMilestone({
        milestoneId: data.milestoneId,
        userId: session.user.id,
        notes: data.notes,
        links: data.links,
      });
    } catch (err) {
      const mapped = toErrorResponse(err);
      if (mapped) return { ok: false, ...mapped.body };
      return { ok: false, code: "error", message: "Could not submit milestone." };
    }
  });
