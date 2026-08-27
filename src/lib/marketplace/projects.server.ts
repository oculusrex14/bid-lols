import { getSql, type Sql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { AuthzError } from "@/lib/authz";
import { PROJECT_TRANSITIONS, assertTransition, type ProjectState } from "@/lib/marketplace/state";
import { fundingDecomposition } from "@/lib/marketplace/ledger.server";
import { notify } from "@/lib/marketplace/notifications.server";
import { moneyMode } from "@/lib/payments/provider";

/**
 * Project engine (Phase 01, FR-5) — Mode B: proposals BEFORE work, one
 * selected provider, funding required, milestones. Same discipline as the
 * bounty engine: claim-guarded transitions, server-side authorization as a
 * parameter, no client-trusted amounts.
 */

export type ProjectRow = {
  id: string;
  product: string;
  sponsor_user_id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  currency: string;
  status: string;
  selected_proposal_id: string | null;
  selected_quoted_minor: number | null;
  funding_payment_id: string | null;
};

export type ProposalRow = {
  id: string;
  project_id: string;
  provider_user_id: string;
  approach: string;
  experience: string;
  evidence_links: string[];
  quoted_minor: number;
  currency: string;
  timeline_weeks: number | null;
  milestones_proposed: Array<{ title: string; amountMinor: number; description?: string }>;
  notes: string;
  status: string;
};

function slugFor(title: string, seed: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${base || "project"}-${seed.slice(-6)}`;
}

export type CreateProjectInput = {
  sponsorUserId: string;
  product: string;
  title: string;
  description: string;
  category: string;
  skills?: string[];
  budgetMinMinor?: number;
  budgetMaxMinor?: number;
  proposalDeadline?: string | null;
  ipAndConfidentiality?: string;
};

export async function createProject(input: CreateProjectInput): Promise<{ id: string; slug: string }> {
  const sql = await getSql();
  const id = makeId("prj_");
  const slug = slugFor(input.title, id);
  await sql.query(
    `insert into projects
      (id, product, sponsor_user_id, title, slug, description, category, skills,
       budget_min_minor, budget_max_minor, ip_and_confidentiality)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)`,
    [
      id,
      input.product,
      input.sponsorUserId,
      input.title,
      slug,
      input.description,
      input.category,
      JSON.stringify(input.skills ?? []),
      input.budgetMinMinor ?? null,
      input.budgetMaxMinor ?? null,
      input.ipAndConfidentiality ?? "",
    ],
  );
  return { id, slug };
}

export async function publishProject(opts: {
  projectId: string;
  sponsorUserId: string;
  proposalDeadline?: string | null;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  const claimed = await sql.query<{ id: string }>(
    `update projects set status='OPEN_FOR_PROPOSALS', proposal_deadline=$3,
       published_at=now(), updated_at=now()
     where id=$1 and sponsor_user_id=$2 and status='DRAFT' returning id`,
    [opts.projectId, opts.sponsorUserId, opts.proposalDeadline ? new Date(opts.proposalDeadline) : null],
  );
  if (claimed.length !== 1) {
    return { ok: false, code: "invalid_state", message: "Project is not a draft (or not yours)." };
  }
  return { ok: true };
}

export type SubmitProposalInput = {
  projectId: string;
  providerUserId: string;
  approach: string;
  experience?: string;
  evidenceLinks?: string[];
  quotedMinor: number;
  timelineWeeks?: number;
  milestonesProposed?: Array<{ title: string; amountMinor: number; description?: string }>;
  notes?: string;
};

/** Proposals are pre-work only (product rule: no unpaid completed deliverables). */
export async function submitProposal(
  input: SubmitProposalInput,
): Promise<{ ok: true; proposalId: string } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx): Promise<{ ok: true; proposalId: string } | { ok: false; code: string; message: string }> => {
    const project = (
      await tx.query<{ id: string; sponsor_user_id: string; status: string; title: string; proposal_deadline: string | null }>(
        "select id, sponsor_user_id, status, title, proposal_deadline from projects where id = $1 for update",
        [input.projectId],
      )
    )[0];
    if (!project) return { ok: false, code: "not_found", message: "Project not found." };
    if (project.sponsor_user_id === input.providerUserId) {
      return { ok: false, code: "self_proposal", message: "You cannot propose on your own project." };
    }
    if (project.status !== "OPEN_FOR_PROPOSALS") {
      return { ok: false, code: "not_open", message: `Project is ${project.status}.` };
    }
    if (
      project.proposal_deadline &&
      new Date() > new Date(String(project.proposal_deadline))
    ) {
      return { ok: false, code: "deadline_passed", message: "The proposal deadline has passed." };
    }
    const existing = await tx.query<{ id: string }>(
      "select id from project_proposals where project_id = $1 and provider_user_id = $2",
      [input.projectId, input.providerUserId],
    );
    if (existing.length > 0) {
      return { ok: false, code: "already_proposed", message: "You already submitted a proposal." };
    }
    const id = makeId("prp_");
    await tx.query(
      `insert into project_proposals
        (id, project_id, provider_user_id, approach, experience, evidence_links,
         quoted_minor, currency, timeline_weeks, milestones_proposed, notes)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10::jsonb,$11)`,
      [
        id,
        input.projectId,
        input.providerUserId,
        input.approach,
        input.experience ?? "",
        JSON.stringify(input.evidenceLinks ?? []),
        input.quotedMinor,
        "INR",
        input.timelineWeeks ?? null,
        JSON.stringify(input.milestonesProposed ?? []),
        input.notes ?? "",
      ],
    );
    await notify(tx, {
      userId: project.sponsor_user_id,
      type: "proposal_received",
      title: "New project proposal",
      body: `A provider proposed on "${project.title}".`,
      entityType: "PROJECT",
      entityId: project.id,
      link: `/projects/${project.id}`,
    });
    return { ok: true, proposalId: id };
  });
}

/**
 * Select ONE proposal: PROPOSAL_SELECTED state + milestone activation from
 * the proposal's milestone plan (amounts sum-checked against the quote).
 */
export async function selectProposal(opts: {
  projectId: string;
  proposalId: string;
  sponsorUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const project = (
      await tx.query<{ id: string; status: string; sponsor_user_id: string; title: string; currency: string }>(
        "select id, status, sponsor_user_id, title, currency from projects where id = $1 for update",
        [opts.projectId],
      )
    )[0];
    if (!project) return { ok: false, code: "not_found", message: "Project not found." };
    if (project.sponsor_user_id !== opts.sponsorUserId) {
      return { ok: false, code: "forbidden", message: "Not your project." };
    }
    assertTransition(PROJECT_TRANSITIONS, "project", project.status as never, "PROPOSAL_SELECTED");
    const proposal = (
      await tx.query<{ id: string; provider_user_id: string; quoted_minor: number; milestones_proposed: Array<{ title: string; amountMinor: number; description?: string }>; status: string }>(
        "select id, provider_user_id, quoted_minor, milestones_proposed, status from project_proposals where id = $1 and project_id = $2 for update",
        [opts.proposalId, opts.projectId],
      )
    )[0];
    if (!proposal || proposal.status === "WITHDRAWN") {
      return { ok: false, code: "invalid_proposal", message: "Proposal unavailable." };
    }
    const ms = proposal.milestones_proposed ?? [];
    const msSum = ms.reduce((t, m) => t + Number(m.amountMinor || 0), 0);
    if (ms.length === 0 || msSum !== Number(proposal.quoted_minor)) {
      return {
        ok: false,
        code: "milestone_sum_mismatch",
        message: `Proposal milestones sum ${msSum} != quoted ${proposal.quoted_minor}.`,
      };
    }
    const claimed = await tx.query<{ id: string }>(
      "update projects set status='PROPOSAL_SELECTED', selected_proposal_id=$2, selected_quoted_minor=$3, updated_at=now() where id=$1 and status='OPEN_FOR_PROPOSALS' returning id",
      [opts.projectId, opts.proposalId, Number(proposal.quoted_minor)],
    );
    if (claimed.length !== 1) {
      return { ok: false, code: "invalid_state", message: "Project state changed concurrently." };
    }
    await tx.query(
      "update project_proposals set status='SELECTED', updated_at=now() where id=$1",
      [opts.proposalId],
    );
    await tx.query(
      "update project_proposals set status='REJECTED', updated_at=now() where project_id=$1 and id <> $2 and status = 'SUBMITTED'",
      [opts.projectId, opts.proposalId],
    );
    // Materialize the selected proposal's milestones.
    let seq = 1;
    for (const m of ms) {
      await tx.query(
        `insert into project_milestones (id, project_id, seq, title, description, amount_minor, currency)
         values ($1,$2,$3,$4,$5,$6,$7)
         on conflict (project_id, seq) do nothing`,
        [makeId("mst_"), opts.projectId, seq, String(m.title), m.description ?? "", Number(m.amountMinor), project.currency],
      );
      seq += 1;
    }
    await notify(tx, {
      userId: proposal.provider_user_id,
      type: "proposal_selected",
      title: "Your proposal was selected",
      body: `Sponsor selected your proposal for "${project.title}". Funding comes next; milestones are active once the project is funded.`,
      entityType: "PROJECT",
      entityId: opts.projectId,
      link: `/projects/${opts.projectId}`,
    });
    return { ok: true };
  });
}

/** Funding verification -> ACTIVE (mirrors the bounty flow, one path to ACTIVE). */
export async function verifyProjectFunding(opts: {
  projectId: string;
  paymentId: string;
  providerRef?: string;
}): Promise<"active" | "alreadyActive" | "not_settled" | "mismatch"> {
  const sql = await getSql();
  const result = await (await import("@/lib/marketplace/ledger.server")).settleFundingPayment({
    bountyId: opts.projectId,
    paymentId: opts.paymentId,
    providerRef: opts.providerRef,
  });
  if (result === "decompositionMismatch") return "mismatch";
  if (result !== "settled" && result !== "alreadyPaid") return "not_settled";
  const claimed = await sql.query<{ id: string }>(
    "update projects set status='ACTIVE', updated_at=now() where id=$1 and status='AWAITING_FUNDING' returning id",
    [opts.projectId],
  );
  if (claimed.length === 0) return "alreadyActive";
  // Activate the first milestone.
  await sql.query(
    "update project_milestones set status='ACTIVE', updated_at=now() where project_id=$1 and seq=1",
    [opts.projectId],
  );
  return "active";
}

export async function projectFundingPlan(quotedMinor: number) {
  return fundingDecomposition(quotedMinor);
}

/* ------------------------------- milestones -------------------------------- */

export async function submitMilestone(opts: {
  milestoneId: string;
  userId: string;
  notes?: string;
  links?: string[];
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  const claimed = await sql.query<{ id: string }>(
    `update project_milestones set status='SUBMITTED_FOR_REVIEW', submitted_at=now(), feedback=$3, updated_at=now()
     where id=$1 and status in ('ACTIVE','REJECTED') and exists (
       select 1 from projects p where p.id = project_milestones.project_id and p.status = 'ACTIVE'
     ) and exists (
       select 1 from projects p2 where p2.id = project_milestones.project_id
         and p2.selected_proposal_id in (select id from project_proposals pp where pp.provider_user_id = $2)
     ) returning id`,
    [opts.milestoneId, JSON.stringify({ notes: opts.notes ?? "", links: opts.links ?? [] })],
  );
  if (claimed.length === 0) {
    return { ok: false, code: "not_submittable", message: "Milestone is not active for you." };
  }
  return { ok: true };
}

export async function decideMilestone(opts: {
  milestoneId: string;
  sponsorUserId: string;
  decision: "APPROVE" | "REJECT";
  feedback?: string;
}): Promise<{ ok: true; status: string } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const rows = await tx.query<{
      id: string; project_id: string; seq: number; status: string; sponsor_user_id: string; title: string;
    }>(
      `select m.id, m.project_id, m.seq, m.status, p.sponsor_user_id, p.title
       from project_milestones m join projects p on p.id = m.project_id
       where m.id = $1 for update of m`,
      [opts.milestoneId],
    );
    const m = rows[0];
    if (!m) return { ok: false, code: "not_found", message: "Milestone not found." };
    if (m.sponsor_user_id !== opts.sponsorUserId) {
      return { ok: false, code: "forbidden", message: "Not your project." };
    }
    if (m.status !== "SUBMITTED_FOR_REVIEW") {
      return { ok: false, code: "invalid_state", message: `Milestone is ${m.status}.` };
    }
    if (opts.decision === "APPROVE") {
      await tx.query(
        "update project_milestones set status='APPROVED', decided_at=now(), updated_at=now() where id=$1",
        [m.id],
      );
      // Next milestone becomes ACTIVE; project moves to COMPLETION_REVIEW when all approved.
      const next = await tx.query<{ id: string; seq: number }>(
        "select id, seq from project_milestones where project_id=$1 and seq=$2",
        [m.project_id, m.seq + 1],
      );
      if (next.length > 0) {
        await tx.query(
          "update project_milestones set status='ACTIVE', updated_at=now() where id=$1",
          [next[0].id],
        );
      }
      await tx.query(
        `update projects set status='COMPLETION_REVIEW', updated_at=now()
         where id=$1 and not exists (
           select 1 from project_milestones where project_id=$1 and status not in ('APPROVED','PAID_OUT')
         )`,
        [m.project_id],
      );
      return { ok: true, status: "APPROVED" };
    }
    await tx.query(
      "update project_milestones set status='REJECTED', decided_at=now(), updated_at=now() where id=$1",
      [m.id],
    );
    return { ok: true, status: "REJECTED" };
  });
}

/** Notifications for milestone decisions (kept out of the tx helper for brevity). */
export async function notifyMilestoneDecision(opts: {
  providerUserId: string;
  milestoneTitle: string;
  accepted: boolean;
  projectId: string;
}): Promise<void> {
  const sql = await getSql();
  await notify(sql, {
    userId: opts.providerUserId,
    type: opts.accepted ? "milestone_accepted" : "milestone_rejected",
    title: opts.accepted ? `Milestone approved: ${opts.milestoneTitle}` : `Milestone needs work: ${opts.milestoneTitle}`,
    entityType: "MILESTONE",
    entityId: opts.projectId,
    link: `/projects/${opts.projectId}`,
  });
}

/** Current money mode (re-exported for routes). */
export { moneyMode };

/**
 * Funding intent for the SELECTED proposal: DRAFT->AWAITING_FUNDING skipped;
 * PROPOSAL_SELECTED -> AWAITING_FUNDING + pending provider order (the ONLY
 * path to ACTIVE is verifyProjectFunding after the payment verifies).
 */
export async function fundProject(opts: {
  projectId: string;
  sponsorUserId: string;
  email?: string;
  returnUrl?: string;
}): Promise<
  | { ok: true; checkoutUrl?: string; providerOrderId: string }
  | { ok: false; code: string; message: string }
> {
  const sql = await getSql();
  const mode = moneyMode();
  const project = (
    await sql.query<ProjectRow & { title: string; currency: string }>(
      "select * from projects where id = $1 for update",
      [opts.projectId],
    )
  )[0];
  if (!project) return { ok: false, code: "not_found", message: "Project not found." };
  if (project.sponsor_user_id !== opts.sponsorUserId) {
    return { ok: false, code: "forbidden", message: "Not your project." };
  }
  if (project.status !== "PROPOSAL_SELECTED" || project.selected_quoted_minor == null) {
    return { ok: false, code: "invalid_state", message: `Project is ${project.status}; select a provider first.` };
  }
  const decomposition = fundingDecomposition(Number(project.selected_quoted_minor));
  const paymentId = makeId("pmt_");
  try {
    const { getPaymentProvider } = await import("@/lib/payments/provider");
    const prov = getPaymentProvider();
    const order = await prov.createOrder({
      localOrderId: paymentId,
      amountMinor: decomposition.sponsorSubtotal,
      currency: project.currency,
      email: opts.email,
      note: `FoundersBid project funding: ${project.title}`,
      returnUrl: opts.returnUrl,
    });
    await sql.query(
      `insert into payments
        (id, user_id, product, kind, amount_cents, currency, status, provider,
         provider_order_id, idempotency_key, meta)
       values ($1,$2,'foundersbid','funding',$3,$4,'pending',$5,$6,$7,$8::jsonb)`,
      [
        paymentId,
        opts.sponsorUserId,
        decomposition.sponsorSubtotal,
        project.currency,
        prov.name,
        order.providerOrderId,
        `project-funding:${opts.projectId}`,
        JSON.stringify({
          project_id: opts.projectId,
          reward_minor: decomposition.rewardMinor,
          platform_fee_minor: decomposition.feeMinor,
          fee_bps: decomposition.feeBps,
        }),
      ],
    );
    const claimed = await sql.query<{ id: string }>(
      "update projects set status='AWAITING_FUNDING', funding_payment_id=$2, updated_at=now() where id=$1 and status='PROPOSAL_SELECTED' returning id",
      [opts.projectId, paymentId],
    );
    if (claimed.length !== 1) {
      return { ok: false, code: "invalid_state", message: "Project state changed concurrently." };
    }
    return { ok: true, checkoutUrl: order.checkoutUrl, providerOrderId: order.providerOrderId };
  } catch (err) {
    await sql.query(
      "update projects set status='PROPOSAL_SELECTED', funding_payment_id=null, updated_at=now() where id=$1 and status='AWAITING_FUNDING'",
      [opts.projectId],
    );
    return {
      ok: false,
      code: "provider_error",
      message: err instanceof Error ? err.message : "Provider refused the order.",
    };
  }
}
