import { getSql, type Sql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { moneyMode } from "@/lib/payments/provider";
import {
  PARTICIPANT_TRANSITIONS,
  assertTransition,
  sponsorMaySelfCancel,
  validateRewardAllocations,
  type RewardStructure,
  type BountyState,
  type ParticipantState,
} from "@/lib/marketplace/state";
import { settleFundingPayment, fundingDecomposition } from "@/lib/marketplace/ledger.server";
import { notify } from "@/lib/marketplace/notifications.server";
import { AuthzError } from "@/lib/authz";

/**
 * Bounty engine (Phase 01, FR-4). All state transitions are claim-guarded
 * (`update … where status = $expected`), authorization is a parameter (the
 * caller resolved the session), and money never moves without a verified
 * provider state. NO function here trusts client-supplied identity, amounts,
 * or status.
 */

export type BountyRow = {
  id: string;
  product: string;
  sponsor_user_id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  skills: string[];
  deliverables: string;
  acceptance_criteria: string;
  reward_total_minor: number;
  currency: string;
  reward_structure: string;
  reward_allocations: Array<{ place: number; amount_minor: number; label?: string }>;
  application_deadline: string | null;
  submission_deadline: string;
  participant_cap: number;
  qualification_mode: string;
  ip_and_confidentiality: string;
  status: BountyState;
  funding_payment_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function slugFor(title: string, seed: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "bounty"}-${seed.slice(-6)}`;
}

export type CreativeBrief = {
  /** Creative formats (e.g. short-form video, photography). */
  formats?: string[];
  /** Target platform/channel (e.g. Instagram Reels, YouTube Shorts). */
  targetPlatform?: string;
  /** Whether the creator must post publicly. */
  publicPostingRequired?: boolean;
  /** Whether reach/performance metrics matter for judging. */
  performanceMeasured?: boolean;
  /** Usage / licensing notes for the winning deliverable. */
  usageNotes?: string;
};

export type CreateBountyInput = {
  sponsorUserId: string;
  product: string;
  title: string;
  description: string;
  category: string;
  skills?: string[];
  deliverables?: string;
  acceptanceCriteria?: string;
  rewardTotalMinor: number;
  currency?: string;
  rewardStructure: string;
  rewardAllocations: Array<{ place: number; amountMinor: number; label?: string }>;
  applicationDeadline?: string | null;
  submissionDeadline: string;
  participantCap?: number;
  qualificationMode?: string;
  ipAndConfidentiality?: string;
  /** Structured creative-brief fields (CultureBid). */
  creative?: CreativeBrief;
};

/** Create a bounty in DRAFT. Pure validation + one insert. */
export async function createBounty(input: CreateBountyInput): Promise<{ id: string; slug: string }> {
  const structure = input.rewardStructure as RewardStructure;
  const allocations = input.rewardAllocations.map((a) => ({
    place: a.place,
    amount_minor: a.amountMinor,
    label: a.label,
  }));
  const check = validateRewardAllocations(
    structure,
    input.rewardTotalMinor,
    allocations.map((a) => ({ place: a.place, amountMinor: a.amount_minor, label: a.label })),
  );
  if (!check.ok) throw new AuthzError(422, "invalid_allocations", check.reason);

  const sql = await getSql();
  const id = makeId("bnt_");
  const slug = slugFor(input.title, id);
  await sql.query(
    `insert into bounties
      (id, product, sponsor_user_id, title, slug, description, category, skills,
       deliverables, acceptance_criteria, reward_total_minor, currency,
       reward_structure, reward_allocations, application_deadline, submission_deadline,
       participant_cap, qualification_mode, ip_and_confidentiality, creative)
     values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17,$18,$19,$20::jsonb)`,
    [
      id,
      input.product,
      input.sponsorUserId,
      input.title,
      slug,
      input.description,
      input.category,
      JSON.stringify(input.skills ?? []),
      input.deliverables ?? "",
      input.acceptanceCriteria ?? "",
      input.rewardTotalMinor,
      input.currency ?? "INR",
      structure,
      JSON.stringify(allocations),
      input.applicationDeadline ? new Date(input.applicationDeadline) : null,
      new Date(input.submissionDeadline),
      input.participantCap ?? 10,
      input.qualificationMode ?? "SPONSOR_APPROVAL",
      input.ipAndConfidentiality ?? "",
      input.creative ? JSON.stringify(input.creative) : null,
    ],
  );
  return { id, slug };
}

export type BountyFundingPlan = {
  rewardMinor: number;
  platformFeeMinor: number;
  sponsorSubtotalMinor: number;
  feeBps: number;
  currency: string;
};

/** The sponsor-facing decomposition (before any money moves). */
export function bountyFundingPlan(rewardTotalMinor: number) {
  return fundingDecomposition(rewardTotalMinor);
}

/**
 * Publish intent: DRAFT -> AWAITING_FUNDING. When money mode is OFF the
 * honest answer is funding_disabled — nothing is published without funding.
 * In sandbox mode a provider order is created (payments row pending) and the
 * client is handed the checkout session.
 */
export async function publishBountyForFunding(opts: {
  bountyId: string;
  sponsorUserId: string;
  email?: string;
  returnUrl?: string;
}): Promise<
  | { ok: true; mode: string; checkout: { paymentSessionId: string; providerOrderId: string; checkoutUrl?: string } }
  | { ok: false; code: "funding_disabled" | "not_found" | "forbidden" | "invalid_state" | "provider_error"; message: string }
> {
  const sql = await getSql();
  const mode = moneyMode();
  const rows = await sql.query<BountyRow>("select * from bounties where id = $1 for update", [
    opts.bountyId,
  ]);
  const bounty = rows[0];
  if (!bounty) return { ok: false, code: "not_found", message: "Bounty not found." };
  if (bounty.sponsor_user_id !== opts.sponsorUserId) {
    return { ok: false, code: "forbidden", message: "Not your bounty." };
  }
  if (bounty.status !== "DRAFT") {
    return { ok: false, code: "invalid_state", message: `Bounty is ${bounty.status}, not DRAFT.` };
  }

  const claim = await sql.query<{ id: string }>(
    "update bounties set status='AWAITING_FUNDING', updated_at=now() where id=$1 and status='DRAFT' returning id",
    [opts.bountyId],
  );
  if (claim.length !== 1) {
    return { ok: false, code: "invalid_state", message: "Publish raced — bounty no longer DRAFT." };
  }
  void claim;

  if (mode === "off") {
    // Honest refusal + rollback to DRAFT (nothing half-published).
    await sql.query(
      "update bounties set status='DRAFT', updated_at=now() where id=$1 and status='AWAITING_FUNDING'",
      [opts.bountyId],
    );
    return {
      ok: false,
      code: "funding_disabled",
      message:
        "Funding is not live yet. Join founding access to be notified when FoundersBid starts taking real work.",
    };
  }

  const decomposition = fundingDecomposition(bounty.reward_total_minor);
  const paymentId = makeId("pmt_");
  try {
    // Session-first: provider order BEFORE the local row (no orphans on refusal).
    // Tests/E2E select the fake adapter via PAYMENT_PROVIDER=fake (refused in
    // deployed environments); production uses the Cashfree collect rail.
    const { getPaymentProvider } = await import("@/lib/payments/provider");
    const prov = getPaymentProvider();
    const order = await prov.createOrder({
      localOrderId: paymentId,
      amountMinor: decomposition.sponsorSubtotal,
      currency: bounty.currency,
      email: opts.email,
      note: `FoundersBid bounty funding: ${bounty.title}`,
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
        bounty.currency,
        prov.name,
        order.providerOrderId,
        `funding:${opts.bountyId}`,
        JSON.stringify({
          bounty_id: opts.bountyId,
          reward_minor: decomposition.rewardMinor,
          platform_fee_minor: decomposition.feeMinor,
          fee_bps: decomposition.feeBps,
          gateway_amount: order.gatewayAmount,
          gateway_currency: order.gatewayCurrency,
        }),
      ],
    );
    await sql.query(
      "update bounties set funding_payment_id=$2, updated_at=now() where id=$1",
      [opts.bountyId, paymentId],
    );
    return {
      ok: true,
      mode: "sandbox",
      checkout: {
        paymentSessionId: order.paymentSessionId ?? "",
        providerOrderId: order.providerOrderId,
        checkoutUrl: order.checkoutUrl,
      },
    };
  } catch (err) {
    // Roll back to DRAFT: the sponsor sees a provider error, no orphan rows.
    await sql.query(
      "update bounties set status='DRAFT', funding_payment_id=null, updated_at=now() where id=$1 and status='AWAITING_FUNDING'",
      [opts.bountyId],
    );
    return {
      ok: false,
      code: "provider_error",
      message: err instanceof Error ? err.message : "Provider refused the order.",
    };
  }
}

/**
 * Funding verification + publication: pending payment verified/settled ->
 * bounty AWAITING_FUNDING -> OPEN. Idempotent; the ONLY path to OPEN.
 */
export async function verifyFundingAndOpen(opts: {
  bountyId: string;
  paymentId: string;
  providerRef?: string;
  reverify?: (providerOrderId: string | null) => Promise<boolean>;
}): Promise<"opened" | "alreadyOpen" | "not_settled" | "mismatch"> {
  const sql = await getSql();
  const result = await settleFundingPayment({
    bountyId: opts.bountyId,
    paymentId: opts.paymentId,
    providerRef: opts.providerRef,
    reverify: opts.reverify,
  });
  if (result === "decompositionMismatch") return "mismatch";
  if (result !== "settled" && result !== "alreadyPaid") return "not_settled";
  const claimed = await sql.query<{ id: string }>(
    "update bounties set status='OPEN', published_at=now(), updated_at=now() where id=$1 and status='AWAITING_FUNDING' returning id",
    [opts.bountyId],
  );
  if (claimed.length === 0) return "alreadyOpen";
  return "opened";
}

/* ----------------------------- applications ------------------------------ */

export async function applyToBounty(opts: {
  bountyId: string;
  userId: string;
  message?: string;
}): Promise<
  | { ok: true; applicationId: string; state: "APPROVED" | "PENDING" }
  | { ok: false; code: string; message: string }
> {
  const sql = await getSql();
  return sql.transaction(async (tx): Promise<
    { ok: true; applicationId: string; state: "APPROVED" | "PENDING" }
    | { ok: false; code: string; message: string }
  > => {
    const bounty = (
      await tx.query<BountyRow>("select * from bounties where id = $1 for update", [opts.bountyId])
    )[0];
    if (!bounty) return { ok: false, code: "not_found", message: "Bounty not found." };
    if (bounty.sponsor_user_id === opts.userId) {
      return { ok: false, code: "self_apply", message: "You cannot apply to your own bounty." };
    }
    if (bounty.status !== "OPEN") {
      return { ok: false, code: "not_open", message: `Bounty is ${bounty.status}.` };
    }
    if (
      bounty.application_deadline &&
      new Date() > new Date(bounty.application_deadline)
    ) {
      return { ok: false, code: "deadline_passed", message: "The application deadline has passed." };
    }
    const existing = await tx.query<{ id: string; status: string }>(
      "select id, status from bounty_applications where bounty_id=$1 and user_id=$2",
      [opts.bountyId, opts.userId],
    );
    if (existing.length > 0) {
      return { ok: false, code: "already_applied", message: "You already applied." };
    }
    // Bounded entry: cap approved participants + pending applications against
    // the cap (speculative work is bounded, never unlimited).
    const counts = await tx.query<{ n: number }>(
      `select count(*)::int as n from bounty_applications
       where bounty_id = $1 and status in ('PENDING','APPROVED')`,
      [opts.bountyId],
    );
    const taken = counts[0]?.n ?? 0;
    if (taken >= bounty.participant_cap) {
      return { ok: false, code: "cap_reached", message: "The participant cap is full." };
    }
    const autoApprove = bounty.qualification_mode === "APPLICATION_ONLY";
    const appId = makeId("app_");
    await tx.query(
      `insert into bounty_applications (id, bounty_id, user_id, message, status, decided_at, decided_by)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        appId,
        opts.bountyId,
        opts.userId,
        opts.message ?? "",
        autoApprove ? "APPROVED" : "PENDING",
        autoApprove ? new Date() : null,
        autoApprove ? "system" : null,
      ],
    );
    if (autoApprove) {
      await addParticipant(tx, bounty.id, opts.userId);
    }
    // Sponsor notification.
    await notify(tx, {
      userId: bounty.sponsor_user_id,
      type: "application_accepted",
      title: autoApprove ? "New approved applicant" : "New bounty application",
      body: `Someone applied to "${bounty.title}".`,
      entityType: "BOUNTY",
      entityId: bounty.id,
      link: `/bounties/${bounty.id}`,
    });
    return { ok: true, applicationId: appId, state: autoApprove ? ("APPROVED" as const) : ("PENDING" as const) };
  });
}

async function addParticipant(tx: Sql, bountyId: string, userId: string): Promise<void> {
  await tx.query(
    `insert into bounty_participants (id, bounty_id, user_id, status)
     values ($1,$2,$3,'APPROVED')
     on conflict (bounty_id, user_id) do nothing`,
    [makeId("par_"), bountyId, userId],
  );
}

/** Sponsor approves/rejects an application (cap enforced inside the claim). */
export async function decideApplication(opts: {
  applicationId: string;
  sponsorUserId: string;
  decision: "APPROVE" | "REJECT";
}): Promise<{ ok: true; status: string } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const rows = await tx.query<{
      id: string;
      bounty_id: string;
      user_id: string;
      status: string;
      bounty_status: BountyState;
      sponsor_user_id: string;
      participant_cap: number;
      title: string;
    }>(
      `select a.id, a.bounty_id, a.user_id, a.status, b.status as bounty_status,
              b.sponsor_user_id, b.participant_cap, b.title
       from bounty_applications a join bounties b on b.id = a.bounty_id
       where a.id = $1 for update of a`,
      [opts.applicationId],
    );
    const app = rows[0];
    if (!app) return { ok: false, code: "not_found", message: "Application not found." };
    if (app.sponsor_user_id !== opts.sponsorUserId) {
      return { ok: false, code: "forbidden", message: "Not your bounty." };
    }
    if (app.status !== "PENDING") {
      return { ok: false, code: "invalid_state", message: `Application is ${app.status}.` };
    }
    if (!["OPEN", "APPLICATION_CLOSED"].includes(app.bounty_status)) {
      return { ok: false, code: "invalid_state", message: `Bounty is ${app.bounty_status}.` };
    }
    if (opts.decision === "APPROVE") {
      const countRows = await tx.query<{ n: number }>(
        "select count(*)::int as n from bounty_participants where bounty_id = $1 and status != 'WITHDRAWN'",
        [app.bounty_id],
      );
      if ((countRows[0]?.n ?? 0) >= app.participant_cap) {
        return { ok: false, code: "cap_reached", message: "The participant cap is full." };
      }
      await tx.query(
        "update bounty_applications set status='APPROVED', decided_at=now(), decided_by=$2 where id=$1",
        [app.id, opts.sponsorUserId],
      );
      await addParticipant(tx, app.bounty_id, app.user_id);
      await notify(tx, {
        userId: app.user_id,
        type: "application_accepted",
        title: "You're in",
        body: `Your application to "${app.title}" was approved.`,
        entityType: "BOUNTY",
        entityId: app.bounty_id,
        link: `/bounties/${app.bounty_id}`,
      });
      return { ok: true, status: "APPROVED" };
    }
    await tx.query(
      "update bounty_applications set status='REJECTED', decided_at=now(), decided_by=$2 where id=$1",
      [app.id, opts.sponsorUserId],
    );
    await notify(tx, {
      userId: app.user_id,
      type: "application_rejected",
      title: "Application update",
      body: `Your application to "${app.title}" was not approved this time.`,
      entityType: "BOUNTY",
      entityId: app.bounty_id,
    });
    return { ok: true, status: "REJECTED" };
  });
}

export async function withdrawApplication(opts: {
  applicationId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  const res = await sql.query<{ id: string }>(
    "update bounty_applications set status='WITHDRAWN', updated_at=now() where id=$1 and user_id=$2 and status='PENDING' returning id",
    [opts.applicationId, opts.userId],
  );
  if (res.length === 0) {
    return { ok: false, code: "not_withdrawable", message: "Only pending applications can be withdrawn." };
  }
  return { ok: true };
}

/* ------------------------------ participants ------------------------------ */

export async function startWork(opts: {
  bountyId: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  const res = await sql.query<{ id: string; status: ParticipantState }>(
    `update bounty_participants set status='WORK_STARTED', work_started_at=now(), updated_at=now()
     where bounty_id=$1 and user_id=$2 and status='APPROVED' returning id, status`,
    [opts.bountyId, opts.userId],
  );
  if (res.length === 0) {
    return { ok: false, code: "not_active", message: "You are not an approved participant (or already started)." };
  }
  return { ok: true };
}

/* ------------------------------- submissions ------------------------------ */

export type SubmissionInput = {
  bountyId: string;
  userId: string;
  title: string;
  body?: string;
  links?: string[];
};

export async function upsertSubmission(opts: SubmissionInput): Promise<
  | { ok: true; submissionId: string }
  | { ok: false; code: string; message: string }
> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const bounty = (
      await tx.query<BountyRow>("select * from bounties where id = $1 for update", [opts.bountyId])
    )[0];
    if (!bounty) return { ok: false, code: "not_found", message: "Bounty not found." };
    if (!["OPEN", "APPLICATION_CLOSED", "SUBMISSION"].includes(bounty.status)) {
      return { ok: false, code: "invalid_state", message: `Bounty is ${bounty.status}.` };
    }
    if (bounty.submission_deadline && new Date() > new Date(bounty.submission_deadline)) {
      return { ok: false, code: "deadline_passed", message: "The submission deadline has passed." };
    }
    const participant = (
      await tx.query<{ id: string; status: ParticipantState }>(
        "select id, status from bounty_participants where bounty_id=$1 and user_id=$2 for update",
        [opts.bountyId, opts.userId],
      )
    )[0];
    if (!participant || !["APPROVED", "WORK_STARTED", "SUBMITTED"].includes(participant.status)) {
      return { ok: false, code: "not_participant", message: "You are not an active participant." };
    }
    const existing = (
      await tx.query<{ id: string }>(
        "select id from bounty_submissions where bounty_id=$1 and user_id=$2",
        [opts.bountyId, opts.userId],
      )
    )[0];
    let submissionId: string;
    if (existing) {
      submissionId = existing.id;
      await tx.query(
        "update bounty_submissions set title=$3, body=$4, links=$5::jsonb, status='SUBMITTED', submitted_at=now(), updated_at=now() where id=$1 and user_id=$2",
        [submissionId, opts.userId, opts.title, opts.body ?? "", JSON.stringify(opts.links ?? [])],
      );
    } else {
      submissionId = makeId("sub_");
      await tx.query(
        `insert into bounty_submissions (id, bounty_id, participant_id, user_id, title, body, links)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [submissionId, opts.bountyId, participant.id, opts.userId, opts.title, opts.body ?? "", JSON.stringify(opts.links ?? [])],
      );
    }
    // Participant lifecycle + bounty progress.
    assertTransition(PARTICIPANT_TRANSITIONS, "participant", participant.status, "SUBMITTED");
    await tx.query(
      "update bounty_participants set status='SUBMITTED', updated_at=now() where id=$1",
      [participant.id],
    );
    if (bounty.status === "OPEN" || bounty.status === "APPLICATION_CLOSED") {
      await tx.query(
        "update bounties set status='SUBMISSION', updated_at=now() where id=$1 and status in ('OPEN','APPLICATION_CLOSED')",
        [opts.bountyId],
      );
    }
    await notify(tx, {
      userId: bounty.sponsor_user_id,
      type: "submission_received",
      title: "New submission",
      body: `A participant submitted work for "${bounty.title}".`,
      entityType: "BOUNTY",
      entityId: opts.bountyId,
      link: `/bounties/${opts.bountyId}`,
    });
    return { ok: true, submissionId };
  });
}

/* --------------------------------- judging -------------------------------- */

export async function judgeBounty(opts: {
  bountyId: string;
  sponsorUserId: string;
  /** place -> participant's submission user id. */
  placements: Array<{ userId: string; place: number }>;
  adminOverride?: boolean;
}): Promise<
  | { ok: true; awards: Array<{ awardId: string; userId: string; place: number; amountMinor: number }> }
  | { ok: false; code: string; message: string }
> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const bounty = (
      await tx.query<BountyRow>("select * from bounties where id = $1 for update", [opts.bountyId])
    )[0];
    if (!bounty) return { ok: false, code: "not_found", message: "Bounty not found." };
    if (!opts.adminOverride && bounty.sponsor_user_id !== opts.sponsorUserId) {
      return { ok: false, code: "forbidden", message: "Not your bounty." };
    }
    if (!["SUBMISSION", "JUDGING"].includes(bounty.status)) {
      return { ok: false, code: "invalid_state", message: `Bounty is ${bounty.status}; judging happens at SUBMISSION/JUDGING.` };
    }
    const allocations = (bounty.reward_allocations ?? []) as Array<{ place: number; amount_minor: number }>;
    const byPlace = new Map(allocations.map((a) => [a.place, a.amount_minor]));
    // Every placement must match an allocation, a real submitted participant,
    // and the advertised structure's capacity.
    for (const p of opts.placements) {
      if (!byPlace.has(p.place)) {
        return { ok: false, code: "invalid_place", message: `Place ${p.place} is not part of the reward structure.` };
      }
    }
    const placedUsers = opts.placements.map((p) => p.userId);
    const participants = await tx.query<{ user_id: string; status: string }>(
      `select user_id, status from bounty_participants where bounty_id=$1`,
      [opts.bountyId],
    );
    const submitted = new Set(
      participants.filter((p) => p.status === "SUBMITTED").map((p) => p.user_id),
    );
    for (const u of placedUsers) {
      if (!submitted.has(u)) {
        return { ok: false, code: "not_submitted", message: "A placed user has no submission." };
      }
    }
    const remaining = bounty.participant_cap - placedUsers.length;
    void remaining;
    // Move non-placed submissions to NOT_SELECTED; placed to their status.
    await tx.query(
      `update bounty_submissions set status='NOT_SELECTED', updated_at=now()
       where bounty_id=$1 and user_id <> all($2::text[])`,
      [opts.bountyId, placedUsers],
    );
    // Claim-guard the bounty into AWARDED.
    const claimed = await tx.query<{ id: string }>(
      "update bounties set status='AWARDED', awarded_at=now(), updated_at=now() where id=$1 and status in ('SUBMISSION','JUDGING') returning id",
      [opts.bountyId],
    );
    if (claimed.length !== 1) {
      return { ok: false, code: "invalid_state", message: "Bounty state changed concurrently." };
    }
    const awards: Array<{ awardId: string; userId: string; place: number; amountMinor: number; currency: string }> = [];
    for (const p of opts.placements) {
      const amount = byPlace.get(p.place);
      if (amount == null) continue;
      const awardId = makeId("awd_");
      await tx.query(
        `insert into bounty_awards (id, bounty_id, user_id, place, amount_minor, currency, status, awarded_by)
         values ($1,$2,$3,$4,$5,$6,'PENDING',$7)
         on conflict (bounty_id, place) do nothing`,
        [awardId, opts.bountyId, p.userId, p.place, amount, bounty.currency, opts.adminOverride ? "admin" : opts.sponsorUserId],
      );
      await tx.query(
        "update bounty_submissions set status='WINNER', place=$3, updated_at=now() where bounty_id=$1 and user_id=$2",
        [opts.bountyId, p.userId, p.place],
      );
      awards.push({
        awardId,
        userId: p.userId,
        place: p.place,
        amountMinor: amount,
        currency: bounty.currency,
      });
      await notify(tx, {
        userId: p.userId,
        type: "winner_selected",
        title: p.place === 1 ? "You won 🏆" : `You placed #${p.place}`,
        body: `Your submission to "${bounty.title}" was selected. Your reward is ${amount / 100} ${bounty.currency} — the platform will pay it out exactly as advertised.`,
        entityType: "BOUNTY",
        entityId: opts.bountyId,
        link: `/bounties/${opts.bountyId}`,
      });
    }
    return { ok: true, awards };
  });
}

/* ------------------------------- cancellation ----------------------------- */

export async function sponsorCancelBounty(opts: {
  bountyId: string;
  sponsorUserId: string;
  reason: string;
}): Promise<
  | { ok: true; outcome: "cancelled_refund_due" | "dispute_required" }
  | { ok: false; code: string; message: string }
> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const bounty = (
      await tx.query<BountyRow>("select * from bounties where id = $1 for update", [opts.bountyId])
    )[0];
    if (!bounty) return { ok: false, code: "not_found", message: "Bounty not found." };
    if (bounty.sponsor_user_id !== opts.sponsorUserId) {
      return { ok: false, code: "forbidden", message: "Not your bounty." };
    }
    const workStarted = (
      await tx.query<{ n: number }>(
        "select count(*)::int as n from bounty_participants where bounty_id=$1 and status in ('WORK_STARTED','SUBMITTED')",
        [opts.bountyId],
      )
    )[0]?.n ?? 0;
    if (!sponsorMaySelfCancel(bounty.status, workStarted > 0)) {
      return {
        ok: false,
        code: "dispute_required",
        message:
          "Work has begun — cancellation is no longer a self-serve action. File a dispute and it will be resolved fairly (participants are compensated from the funded pool).",
      };
    }
    const claimed = await tx.query<{ id: string }>(
      "update bounties set status='CANCELLED', cancelled_at=now(), cancelled_by=$2, cancel_reason=$3, updated_at=now() where id=$1 and status = $4 returning id",
      [opts.bountyId, opts.sponsorUserId, opts.reason.slice(0, 1000), bounty.status],
    );
    if (claimed.length !== 1) {
      return { ok: false, code: "invalid_state", message: "State changed concurrently." };
    }
    return { ok: true, outcome: "cancelled_refund_due" };
  });
}

/** Lazy expiry: past deadline, nothing submitted, never judged. */
export async function expireIfDue(bountyId: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<BountyRow>(
    "select * from bounties where id = $1",
    [bountyId],
  );
  const bounty = rows[0];
  if (!bounty || !bounty.submission_deadline) return false;
  if (new Date() <= new Date(bounty.submission_deadline)) return false;
  const submissions = await sql.query<{ n: number }>(
    "select count(*)::int as n from bounty_submissions where bounty_id = $1",
    [bountyId],
  );
  if ((submissions[0]?.n ?? 0) > 0) return false;
  const claimed = await sql.query<{ id: string }>(
    "update bounties set status='EXPIRED', expired_at=now(), updated_at=now() where id=$1 and status in ('OPEN','APPLICATION_CLOSED','SUBMISSION') returning id",
    [bountyId],
  );
  return claimed.length === 1;
}