import { getSql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { PROJECT_TRANSITIONS, assertTransition } from "@/lib/marketplace/state";
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
  /** RC5.1 WS8: the work currency, chosen by the sponsor at creation. */
  currency?: string;
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
       budget_min_minor, budget_max_minor, currency, ip_and_confidentiality)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12)`,
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
      input.currency ?? "INR",
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
      await tx.query<{ id: string; sponsor_user_id: string; status: string; title: string; proposal_deadline: string | null; currency: string }>(
        "select id, sponsor_user_id, status, title, proposal_deadline, currency from projects where id = $1 for update",
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
        // RC5.1 WS8: a quote is denominated in the PROJECT's currency — the
        // sponsor posted the range in that currency, the provider answers in
        // the same one. No conversion, ever.
        project.currency,
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

/** RC3 (S-11): milestone-plan integrity, extracted from selectProposal. */
function proposalMilestoneError(
  ms: Array<{ amountMinor?: number }>,
  quotedMinor: number,
): string | null {
  const msSum = ms.reduce((t, m) => t + Number(m.amountMinor || 0), 0);
  if (ms.length === 0 || msSum !== quotedMinor) {
    return `Proposal milestones sum ${msSum} != quoted ${quotedMinor}.`;
  }
  return null;
}

type SelectProposalError = { ok: false; code: string; message: string };

/** RC3 (S-11): child-of-parent allocation cap check, extracted from selectProposal. */
async function childAllocationBlocker(
  tx: { query: <T = unknown>(sql: string, params: unknown[]) => Promise<T[]> },
  project: { parent_work_id: string | null },
  projectId: string,
  quotedMinor: number,
): Promise<SelectProposalError | null> {
  if (!project.parent_work_id) return null;
  const child = await tx.query<{ allocated_minor: number }>(
    "select allocated_minor from child_works where parent_work_id = $1 and project_id = $2",
    [project.parent_work_id, projectId],
  );
  if (child.length === 0) {
    return { ok: false, code: "not_child_of_parent", message: "Project is not a linked child of its parent work." };
  }
  const cap = Number(child[0]?.allocated_minor ?? 0);
  if (quotedMinor > cap) {
    return {
      ok: false,
      code: "quote_exceeds_allocation",
      message: `Quote ₹${(quotedMinor / 100).toFixed(2)} exceeds the child's allocated budget ₹${(cap / 100).toFixed(2)}.`,
    };
  }
  return null;
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
      await tx.query<{
        id: string; status: string; sponsor_user_id: string; title: string; currency: string;
        parent_work_id: string | null; budget_max_minor: number | null;
      }>(
        "select id, status, sponsor_user_id, title, currency, parent_work_id, budget_max_minor from projects where id = $1 for update",
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
    const msError = proposalMilestoneError(ms, Number(proposal.quoted_minor));
    if (msError) return { ok: false, code: "milestone_sum_mismatch", message: msError };
    // Child project (RC1, R6): the parent allocation caps the funding
    // obligation — a quote above the child's allocated amount is refused
    // (the parent fee is already charged; no second sponsor charge happens).
    const childError = await childAllocationBlocker(tx, project, opts.projectId, Number(proposal.quoted_minor));
    if (childError) return childError;
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
    // Parent-linked project (RC1, R6): funding flows from the parent
    // allocation (already collected) — selection activates the project and
    // its first milestone immediately, no AWAITING_FUNDING step.
    if (project.parent_work_id) {
      await tx.query(
        "update projects set status='ACTIVE', updated_at=now() where id=$1",
        [opts.projectId],
      );
      await tx.query(
        "update project_milestones set status='ACTIVE', active_at=now(), updated_at=now() where project_id=$1 and seq=1",
        [opts.projectId],
      );
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
    entityType: "PROJECT",
  });
  if (result === "decompositionMismatch") return "mismatch";
  if (result !== "settled" && result !== "alreadyPaid") return "not_settled";
  // Parent-linked projects (RC1, R6) are funded from the parent allocation —
  // no separate sponsor charge, so the AWAITING_FUNDING step is skipped and
  // selection went straight to ACTIVE.
  const parentLinked = await sql.query<{ parent_work_id: string | null }>(
    "select parent_work_id from projects where id = $1",
    [opts.projectId],
  );
  if (parentLinked[0]?.parent_work_id) {
    return "alreadyActive";
  }
  const claimed = await sql.query<{ id: string }>(
    "update projects set status='ACTIVE', updated_at=now() where id=$1 and status='AWAITING_FUNDING' returning id",
    [opts.projectId],
  );
  if (claimed.length === 0) return "alreadyActive";
  // Activate the first milestone (RC4 §23.3: authoritative activation stamp).
  await sql.query(
    "update project_milestones set status='ACTIVE', active_at=now(), updated_at=now() where project_id=$1 and seq=1",
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
    [opts.milestoneId, opts.userId, JSON.stringify({ notes: opts.notes ?? "", links: opts.links ?? [] })],
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
          "update project_milestones set status='ACTIVE', active_at=now(), updated_at=now() where id=$1",
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

/**
 * RC4 §23.3: sponsor-approved deadline extension. Allowed only BEFORE
 * breach (the current due date has not passed and the milestone is not yet
 * submitted) and never backwards; the extension row is append-only and the
 * Bid Index treats an approved pre-breach extension as neutral — the
 * effective due date becomes the extended date.
 */
export async function extendMilestone(opts: {
  milestoneId: string;
  sponsorUserId: string;
  newDueAt: Date;
  reason?: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const rows = await tx.query<{
      id: string; sponsor_user_id: string; status: string; due_at: string | null;
    }>(
      `select m.id, p.sponsor_user_id, m.status, m.due_at
       from project_milestones m join projects p on p.id = m.project_id
       where m.id = $1 for update of m`,
      [opts.milestoneId],
    );
    const m = rows[0];
    if (!m) return { ok: false, code: "not_found", message: "Milestone not found." };
    if (m.sponsor_user_id !== opts.sponsorUserId) {
      return { ok: false, code: "forbidden", message: "Only the sponsor may extend the deadline." };
    }
    if (m.status !== "ACTIVE") {
      return { ok: false, code: "invalid_state", message: "Only an active milestone can be extended." };
    }
    if (!m.due_at) {
      return { ok: false, code: "no_due_date", message: "This milestone has no due date to extend." };
    }
    const currentDue = new Date(m.due_at).getTime();
    if (Number.isNaN(currentDue)) {
      return { ok: false, code: "no_due_date", message: "This milestone has no due date to extend." };
    }
    if (Date.now() > currentDue) {
      return { ok: false, code: "past_breach", message: "Breached milestones cannot be extended." };
    }
    const newDue = new Date(opts.newDueAt).getTime();
    if (!Number.isFinite(newDue)) {
      return { ok: false, code: "bad_date", message: "The new due date is invalid." };
    }
    if (newDue <= currentDue) {
      return { ok: false, code: "not_forward", message: "An extension must move the deadline forward." };
    }
    const latest = await tx.query<{ new_due_at: string }>(
      `select new_due_at from project_milestone_extensions
       where milestone_id = $1 order by created_at desc limit 1`,
      [opts.milestoneId],
    );
    const previousDue = latest[0]
      ? new Date(latest[0].new_due_at)
      : new Date(m.due_at);
    await tx.query(
      `insert into project_milestone_extensions (id, milestone_id, previous_due_at, new_due_at, approved_by, reason)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        makeId("mex_"),
        opts.milestoneId,
        previousDue.toISOString(),
        new Date(newDue).toISOString(),
        opts.sponsorUserId,
        (opts.reason ?? "").slice(0, 2000),
      ],
    );
    return { ok: true };
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
  // RC5.1 WS9: the provider must actually collect THIS project's currency
  // BEFORE any state write. Cashfree is INR-only; no fake conversion.
  if (moneyMode() !== "off") {
    const { getPaymentProvider, unsupportedCollectionError } =
      await import("@/lib/payments/provider");
    const bad = unsupportedCollectionError(getPaymentProvider(), project.currency);
    if (bad) return { ok: false, ...bad };
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

/**
 * Complete the project (RC1, R1): COMPLETION_REVIEW -> COMPLETED. Sponsor-only,
 * all milestones must be APPROVED/PAID_OUT. Writes the verified-outcome
 * reputation seed for the selected provider + audit + review-request
 * notification so the Phase 01 review gate unlocks correctly.
 */
export async function completeProject(opts: {
  projectId: string;
  sponsorUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const rows = await tx.query<{
      id: string; sponsor_user_id: string; status: string; title: string;
      selected_proposal_id: string | null;
    }>(
      "select id, sponsor_user_id, status, title, selected_proposal_id from projects where id = $1 for update",
      [opts.projectId],
    );
    const p = rows[0];
    if (!p) return { ok: false, code: "not_found", message: "Project not found." };
    if (p.sponsor_user_id !== opts.sponsorUserId) {
      return { ok: false, code: "forbidden", message: "Not your project." };
    }
    if (p.status !== "COMPLETION_REVIEW") {
      return { ok: false, code: "invalid_state", message: `Project is ${p.status}; complete it from COMPLETION_REVIEW.` };
    }
    const openMilestones = await tx.query<{ n: number }>(
      "select count(*)::int as n from project_milestones where project_id = $1 and status not in ('APPROVED','PAID_OUT')",
      [opts.projectId],
    );
    if ((openMilestones[0]?.n ?? 0) > 0) {
      return { ok: false, code: "milestones_open", message: "All milestones must be approved before completion." };
    }
    const claimed = await tx.query<{ id: string }>(
      "update projects set status='COMPLETED', completed_at=now(), updated_at=now() where id=$1 and status='COMPLETION_REVIEW' returning id",
      [opts.projectId],
    );
    if (claimed.length !== 1) return { ok: false, code: "invalid_state", message: "State changed concurrently." };
    // Verified-outcome seed (Phase 04 consumes; no ranking computed here).
    if (p.selected_proposal_id) {
      const provider = await tx.query<{ provider_user_id: string }>(
        "select provider_user_id from project_proposals where id = $1",
        [p.selected_proposal_id],
      );
      if (provider[0]) {
        await tx.query(
          `insert into reputation_events (id, user_id, kind, work_type, work_id, meta)
           values ($1,$2,'project_completed','PROJECT',$3,$4::jsonb)`,
          [makeId("rep_"), provider[0].provider_user_id, opts.projectId, JSON.stringify({ project_title: p.title })],
        );
        await notify(tx, {
          userId: provider[0].provider_user_id,
          type: "review_requested",
          title: "Project complete — leave a review",
          body: `"${p.title}" is complete. You can now review the sponsor.`,
          entityType: "PROJECT",
          entityId: opts.projectId,
          link: `/projects/${opts.projectId}`,
        });
      }
    }
    const { insertAudit } = await import("@/lib/audit.server");
    await insertAudit(tx, {
      actorUserId: opts.sponsorUserId,
      action: "project_completed",
      entityType: "PROJECT",
      entityId: opts.projectId,
    });
    return { ok: true };
  });
}
