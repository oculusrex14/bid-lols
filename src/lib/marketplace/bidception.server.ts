import { getSql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";
import { insertAudit } from "@/lib/audit.server";
import { notify } from "@/lib/marketplace/notifications.server";
import { moneyMode } from "@/lib/payments/provider";
import { fundingDecomposition } from "@/lib/marketplace/ledger.server";
import { validateRewardAllocations } from "@/lib/marketplace/state";

/**
 * Bidception engine (Phase 03, FR-1..5) — the nested/team fund flow.
 *
 * THE INVARIANT: on a funded parent,
 *   sum(child.allocated) + captain_compensation ≤ funded_budget
 * EVERY allocation (child or captain fee) takes a `for update` lock on the
 * parent row and recomputes the balance inside that transaction, so parallel
 * attempts serialize and over-allocation is impossible. Money cannot be
 * created by nesting.
 */

export type ParentWorkRow = {
  id: string;
  product: string;
  sponsor_user_id: string;
  captain_user_id: string | null;
  title: string;
  slug: string;
  objective: string;
  funded_budget_minor: number | null;
  captain_compensation_minor: number;
  currency: string;
  status: string;
  funding_payment_id: string | null;
};

export type CreateParentInput = {
  sponsorUserId: string;
  product: string;
  title: string;
  objective: string;
};

export async function createParentWork(input: CreateParentInput): Promise<{ id: string; slug: string }> {
  const sql = await getSql();
  const id = makeId("pwr_");
  const base = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  const slug = `${base || "work"}-${id.slice(-6)}`;
  await sql.query(
    `insert into parent_works (id, product, sponsor_user_id, title, slug, objective)
     values ($1,$2,$3,$4,$5,$6)`,
    [id, input.product, input.sponsorUserId, input.title, slug, input.objective],
  );
  return { id, slug };
}

/** Sponsor publishes intent: DRAFT -> AWAITING_FUNDING (funded before active). */
export async function publishParentForFunding(opts: {
  parentWorkId: string;
  sponsorUserId: string;
  email?: string;
  returnUrl?: string;
  budgetRupees: number;
}): Promise<{ ok: true; checkoutUrl?: string; providerOrderId: string } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  const mode = moneyMode();
  if (mode === "off") {
    return {
      ok: false,
      code: "funding_disabled",
      message: "Funding is not live yet. Join founding access to be notified when Bidception opens.",
    };
  }
  const budgetMinor = Math.round(opts.budgetRupees * 100);
  const decomposition = fundingDecomposition(budgetMinor);
  const paymentId = makeId("pmt_");
  try {
    const { getPaymentProvider } = await import("@/lib/payments/provider");
    const prov = getPaymentProvider();
    const order = await prov.createOrder({
      localOrderId: paymentId,
      amountMinor: decomposition.sponsorSubtotal,
      currency: "INR",
      email: opts.email,
      note: "Bidception parent work funding",
      returnUrl: opts.returnUrl,
    });
    await sql.query(
      `insert into payments
        (id, user_id, product, kind, amount_cents, currency, status, provider,
         provider_order_id, idempotency_key, meta)
       values ($1,$2,'bidception','funding',$3,'INR','pending',$4,$5,$6,$7::jsonb)`,
      [
        paymentId,
        opts.sponsorUserId,
        decomposition.sponsorSubtotal,
        prov.name,
        order.providerOrderId,
        `parent-funding:${opts.parentWorkId}`,
        JSON.stringify({
          parent_id: opts.parentWorkId,
          reward_minor: budgetMinor,
          platform_fee_minor: decomposition.feeMinor,
        }),
      ],
    );
    const claimed = await sql.query<{ id: string }>(
      `update parent_works set status='AWAITING_FUNDING', funded_budget_minor=$2,
         funding_payment_id=$3, updated_at=now()
       where id=$1 and sponsor_user_id=$4 and status='DRAFT' returning id`,
      [opts.parentWorkId, budgetMinor, paymentId, opts.sponsorUserId],
    );
    if (claimed.length !== 1) {
      return { ok: false, code: "invalid_state", message: "Parent work is not a draft." };
    }
    void decomposition;
    return { ok: true, checkoutUrl: order.checkoutUrl, providerOrderId: order.providerOrderId };
  } catch (err) {
    return {
      ok: false,
      code: "provider_error",
      message: err instanceof Error ? err.message : "Provider refused the order.",
    };
  }
}

/**
 * Sponsor selects the captain from members (a member may captain their own
 * sponsorship only in self-funded solo mode; here captains are other members).
 */
export async function selectCaptain(opts: {
  parentWorkId: string;
  sponsorUserId: string;
  captainUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const parent = (
      await tx.query<{ id: string; status: string; sponsor_user_id: string; funded_budget_minor: number | null; captain_user_id: string | null; title: string }>(
        "select id, status, sponsor_user_id, funded_budget_minor, captain_user_id, title from parent_works where id = $1 for update",
        [opts.parentWorkId],
      )
    )[0];
    if (!parent) return { ok: false, code: "not_found", message: "Parent work not found." };
    if (parent.sponsor_user_id !== opts.sponsorUserId) {
      return { ok: false, code: "forbidden", message: "Not your parent work." };
    }
    if (!["FUNDED", "ACTIVE"].includes(parent.status)) {
      return { ok: false, code: "invalid_state", message: `Parent is ${parent.status}; fund it first.` };
    }
    const captain = await tx.query<{ id: string; email: string }>(
      "select id, email from users where id = $1 and status = 'active' and banned = false",
      [opts.captainUserId],
    );
    if (captain.length === 0) {
      return { ok: false, code: "invalid_captain", message: "Captain must be an active member." };
    }
    if (parent.captain_user_id && parent.captain_user_id !== opts.captainUserId) {
      const children = await tx.query<{ n: number }>(
        "select count(*)::int as n from child_works where parent_work_id = $1",
        [opts.parentWorkId],
      );
      if ((children[0]?.n ?? 0) > 0) {
        return {
          ok: false,
          code: "captain_locked",
          message: "A captain with allocations already exists — replace only after review.",
        };
      }
    }
    await tx.query(
      "update parent_works set captain_user_id=$2, captain_selected_at=now(), updated_at=now() where id=$1",
      [opts.parentWorkId, opts.captainUserId],
    );
    await notify(tx, {
      userId: opts.captainUserId,
      type: "proposal_selected",
      title: "You've been made captain",
      body: `You captain "${parent.title}" — decompose the work within the funded budget.`,
      entityType: "PARENT_WORK",
      entityId: opts.parentWorkId,
      link: `/bidception/${opts.parentWorkId}`,
    });
    return { ok: true };
  });
}

/**
 * Funding verified (webhook/provider-check) -> the parent is FUNDED.
 * Mirrors the bounty settlement discipline: claim-guarded, decomposition
 * stored on the payment row's meta at order creation.
 */
export async function verifyParentFunding(opts: {
  parentWorkId: string;
  paymentId: string;
  providerRef?: string;
}): Promise<"funded" | "alreadyFunded" | "not_settled" | "mismatch"> {
  const sql = await getSql();
  const { settleFundingPayment } = await import("@/lib/marketplace/ledger.server");
  const result = await settleFundingPayment({
    bountyId: opts.parentWorkId, // entity_id is the parent work; ledger is entity-agnostic
    paymentId: opts.paymentId,
    providerRef: opts.providerRef,
    entityType: "PARENT_WORK",
  });
  if (result === "decompositionMismatch") return "mismatch";
  if (result !== "settled" && result !== "alreadyPaid") return "not_settled";
  const claimed = await sql.query<{ id: string }>(
    "update parent_works set status='FUNDED', updated_at=now() where id=$1 and status='AWAITING_FUNDING' returning id",
    [opts.parentWorkId],
  );
  if (claimed.length === 0) return "alreadyFunded";
  return "funded";
}

/** Sponsor activates a FUNDED parent (requires a captain): FUNDED -> ACTIVE. */
export async function activateParent(opts: {
  parentWorkId: string;
  sponsorUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  const parent = (
    await sql.query<{ status: string; sponsor_user_id: string; captain_user_id: string | null }>(
      "select status, sponsor_user_id, captain_user_id from parent_works where id = $1",
      [opts.parentWorkId],
    )
  )[0];
  if (!parent) return { ok: false, code: "not_found", message: "Parent work not found." };
  if (parent.sponsor_user_id !== opts.sponsorUserId) {
    return { ok: false, code: "forbidden", message: "Not your parent work." };
  }
  if (parent.status !== "FUNDED") {
    return { ok: false, code: "invalid_state", message: `Parent is ${parent.status}; fund it first.` };
  }
  if (!parent.captain_user_id) {
    return { ok: false, code: "no_captain", message: "Select a captain before activating." };
  }
  const claimed = await sql.query<{ id: string }>(
    "update parent_works set status='ACTIVE', updated_at=now() where id=$1 and status='FUNDED' returning id",
    [opts.parentWorkId],
  );
  if (claimed.length !== 1) return { ok: false, code: "invalid_state", message: "State changed concurrently." };
  return { ok: true };
}

/**
 * Allocate a child unit from the parent's funded budget. THE invariant
 * (allocated + captain fee ≤ funded budget) is enforced by locking the
 * parent row and recomputing the balance inside the transaction.
 */
export type ChildKind = "BOUNTY" | "PROJECT";

export type AllocateChildInput = {
  parentWorkId: string;
  actorUserId: string;
  title: string;
  allocatedMinor: number;
  kind: ChildKind;
  dependsOn?: string[];
  /** BOUNTY child spec. */
  bountySpec?: {
    category: string;
    submissionDeadline: string; // ISO
    participantCap?: number;
    qualificationMode?: string;
    ipAndConfidentiality?: string;
    rewardStructure?: string;
  };
  /** PROJECT child spec. */
  projectSpec?: {
    category: string;
    proposalDeadline?: string | null;
    ipAndConfidentiality?: string;
  };
};

/**
 * Allocate a child unit from the parent's funded budget AND materialize the
 * real engine row (RC1, R6):
 *
 *  - kind BOUNTY -> a REAL bounties row, product = parent's product, sponsor =
 *    parent's sponsor, reward pool = the allocation, status OPEN (funded by
 *    the parent allocation; the platform fee was charged once at parent
 *    funding — a child never adds a second fee), parent_work_id set.
 *  - kind PROJECT -> a REAL projects row, product/sponsor same, budget cap =
 *    the allocation, status OPEN_FOR_PROPOSALS (proposals run; on selection
 *    the project goes ACTIVE without a second sponsor charge, quote capped at
 *    the allocation), parent_work_id set.
 *
 * Concurrency-safe by construction: SELECT ... FOR UPDATE on the parent row
 * serializes parallel attempts; the balance is recomputed INSIDE the
 * transaction and over-allocation throws. Money cannot be created by nesting.
 */
export async function allocateChildWork(opts: AllocateChildInput): Promise<
  | { ok: true; childWorkId: string; linkedId: string }
  | { ok: false; code: string; message: string }
> {
  if (!Number.isInteger(opts.allocatedMinor) || opts.allocatedMinor <= 0) {
    return { ok: false, code: "invalid_allocation", message: "Allocation must be a positive integer (minor units)." };
  }
  if (opts.kind !== "BOUNTY" && opts.kind !== "PROJECT") {
    return { ok: false, code: "invalid_kind", message: "Child work must be a BOUNTY or a PROJECT." };
  }
  // The materialized bounty/project row carries title constraints of its own.
  if (opts.title.trim().length < 8) {
    return { ok: false, code: "invalid_title", message: "Child unit titles need at least 8 characters." };
  }
  const sql = await getSql();
  return sql.transaction(
    async (
      tx,
    ): Promise<{ ok: true; childWorkId: string; linkedId: string } | { ok: false; code: string; message: string }> => {
      const parent = (
        await tx.query<{
          id: string;
          sponsor_user_id: string;
          captain_user_id: string | null;
          funded_budget_minor: number | null;
          captain_compensation_minor: number;
          status: string;
          product: string;
        }>(
          "select id, sponsor_user_id, captain_user_id, funded_budget_minor, captain_compensation_minor, status, product from parent_works where id = $1 for update",
          [opts.parentWorkId],
        )
      )[0];
      if (!parent || parent.funded_budget_minor == null) {
        return { ok: false, code: "not_found", message: "Funded parent work not found." };
      }
      if (parent.status !== "ACTIVE") {
        return { ok: false, code: "invalid_state", message: `Parent is ${parent.status}; allocations require an active parent.` };
      }
      const isSponsor = parent.sponsor_user_id === opts.actorUserId;
      const isCaptain = parent.captain_user_id === opts.actorUserId;
      if (!isSponsor && !isCaptain) {
        return { ok: false, code: "forbidden", message: "Only the sponsor or the captain can allocate." };
      }
      const spent = await tx.query<{ n: number }>(
        "select coalesce(sum(allocated_minor), 0)::int as n from child_works where parent_work_id = $1",
        [opts.parentWorkId],
      );
      const balance =
        Number(parent.funded_budget_minor) - Number(spent[0]?.n ?? 0) - Number(parent.captain_compensation_minor);
      if (opts.allocatedMinor > balance) {
        return {
          ok: false,
          code: "insufficient_balance",
          message: `Allocation exceeds the available balance (₹${(balance / 100).toFixed(2)}).`,
        };
      }
      const id = makeId("cwk_");
      const seq = await tx.query<{ n: number }>(
        "select coalesce(max(seq), 0)::int + 1 as n from child_works where parent_work_id = $1",
        [opts.parentWorkId],
      );

      let linkedId: string;
      if (opts.kind === "BOUNTY") {
        // Materialize a REAL bounty, funded by the parent allocation. The
        // fee was charged at the parent level, so the full allocation is the
        // advertised reward pool. Status OPEN: the funded-before-open rule is
        // satisfied by the parent's funding + this allocation record.
        const structure = (opts.bountySpec?.rewardStructure ?? "WINNER_TAKES_ALL") as string;
        const allocations = [{ place: 1, amountMinor: opts.allocatedMinor, label: "Winner" }];
        const specCheck = validateRewardAllocations(structure as never, opts.allocatedMinor, [
          { place: 1, amountMinor: opts.allocatedMinor },
        ]);
        if (!specCheck.ok) return { ok: false, code: "invalid_allocations", message: specCheck.reason };
        linkedId = makeId("bnt_");
        const base = opts.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
        await tx.query(
          `insert into bounties
            (id, product, sponsor_user_id, title, slug, description, category, skills,
             reward_total_minor, currency, reward_structure, reward_allocations,
             submission_deadline, participant_cap, qualification_mode,
             status, parent_work_id, published_at)
           values ($1,$2,$3,$4,$5,$6,$7,'[]'::jsonb,$8,$9,$10,$11::jsonb,$12,$13,$14,'OPEN',$15,now())`,
          [
            linkedId,
            parent.product,
            parent.sponsor_user_id,
            opts.title,
            `${base || "child"}-${linkedId.slice(-6)}`,
            `Child unit of parent work ${opts.parentWorkId}: ${opts.title}. Deliverables, acceptance criteria and IP rules are managed on the parent work page and apply to this child unit.`,
            opts.bountySpec?.category ?? "development",
            opts.allocatedMinor,
            "INR",
            structure,
            JSON.stringify([{ place: 1, amount_minor: opts.allocatedMinor, label: opts.title }]),
            new Date(opts.bountySpec?.submissionDeadline ?? Date.now() + 14 * 86400_000),
            opts.bountySpec?.participantCap ?? 5,
            opts.bountySpec?.qualificationMode ?? "APPLICATION_ONLY",
            opts.parentWorkId,
          ],
        );
      } else {
        // PROJECT child: budget cap = allocation; proposals open immediately.
        linkedId = makeId("prj_");
        const base = opts.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
        await tx.query(
          `insert into projects
            (id, product, sponsor_user_id, title, slug, description, category,
             budget_max_minor, currency, ip_and_confidentiality, status, parent_work_id, published_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,'INR',$9,'OPEN_FOR_PROPOSALS',$10,now())`,
          [
            linkedId,
            parent.product,
            parent.sponsor_user_id,
            opts.title,
            `${base || "child-project"}-${linkedId.slice(-6)}`,
            `Child unit of parent work ${opts.parentWorkId}: ${opts.title}. Budget is capped at the parent allocation; funding flows from the parent, so no separate sponsor charge is taken.`,
            opts.projectSpec?.category ?? "development",
            opts.allocatedMinor,
            opts.projectSpec?.ipAndConfidentiality ?? "",
            opts.parentWorkId,
          ],
        );
      }

      // Linked children start READY (their engine row is live); children with
      // declared dependencies start BLOCKED until those complete.
      const initialState = (opts.dependsOn ?? []).length > 0 ? "BLOCKED" : "READY";
      await tx.query(
        `insert into child_works (id, parent_work_id, kind, bounty_id, project_id, title, allocated_minor, depends_on, seq, state)
         values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,
        [
          id,
          opts.parentWorkId,
          opts.kind,
          opts.kind === "BOUNTY" ? linkedId : null,
          opts.kind === "PROJECT" ? linkedId : null,
          opts.title,
          opts.allocatedMinor,
          JSON.stringify(opts.dependsOn ?? []),
          seq[0]?.n ?? 1,
          (opts.dependsOn ?? []).length > 0 ? "BLOCKED" : "READY",
        ],
      );
      return { ok: true, childWorkId: id, linkedId };
    },
  );
}

type ChildRow = {
  id: string;
  parent_work_id: string;
  title: string;
  state: string;
  depends_on: string[];
  allocated_minor: number;
  kind: "BOUNTY" | "PROJECT" | null;
  bounty_id: string | null;
  project_id: string | null;
};

function childAuthorizer(actorUserId: string, sponsorUserId: string, captainUserId: string | null): boolean {
  return actorUserId === sponsorUserId || actorUserId === captainUserId;
}

async function loadChildWithParent(
  tx: Awaited<ReturnType<typeof getSql>>,
  childWorkId: string,
): Promise<{ child: ChildRow; sponsor_user_id: string; captain_user_id: string | null } | null> {
  const rows = await tx.query<{
    c_id: string;
    c_parent: string;
    c_title: string;
    c_state: string;
    c_depends_on: string[];
    c_allocated: number;
    c_kind: "BOUNTY" | "PROJECT" | null;
    c_bounty_id: string | null;
    c_project_id: string | null;
    sponsor_user_id: string;
    captain_user_id: string | null;
  }>(
    `select cw.id as c_id, cw.parent_work_id as c_parent, cw.title as c_title,
            cw.state as c_state, cw.depends_on as c_depends_on, cw.allocated_minor as c_allocated,
            cw.kind as c_kind, cw.bounty_id as c_bounty_id, cw.project_id as c_project_id,
            pw.sponsor_user_id, pw.captain_user_id
     from child_works cw
     join parent_works pw on pw.id = cw.parent_work_id
     where cw.id = $1 for update of cw`,
    [childWorkId],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    child: {
      id: r.c_id,
      parent_work_id: r.c_parent,
      title: r.c_title,
      state: r.c_state,
      depends_on: Array.isArray(r.c_depends_on) ? r.c_depends_on : [],
      allocated_minor: Number(r.c_allocated),
      kind: (r.c_kind ?? null) as ChildRow["kind"],
      bounty_id: r.c_bounty_id,
      project_id: r.c_project_id,
    },
    sponsor_user_id: r.sponsor_user_id,
    captain_user_id: r.captain_user_id,
  };
}

export async function markChildReady(opts: {
  childWorkId: string;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const loaded = await loadChildWithParent(tx, opts.childWorkId);
    if (!loaded) return { ok: false, code: "not_found", message: "Child work not found." };
    if (!childAuthorizer(opts.actorUserId, loaded.sponsor_user_id, loaded.captain_user_id)) {
      return { ok: false, code: "forbidden", message: "Only the sponsor or captain can move children." };
    }
    if (loaded.child.state !== "BLOCKED") {
      return { ok: false, code: "invalid_state", message: `Child is ${loaded.child.state}.` };
    }
    for (const dep of loaded.child.depends_on) {
      const depState = await tx.query<{ s: string }>(
        "select state as s from child_works where id = $1 and parent_work_id = $2",
        [dep, loaded.child.parent_work_id],
      );
      if ((depState[0]?.s ?? "") !== "COMPLETE") {
        return {
          ok: false,
          code: "dependencies_incomplete",
          message: "Required dependency is not COMPLETE yet.",
        };
      }
    }
    await tx.query("update child_works set state='READY', updated_at=now() where id=$1", [opts.childWorkId]);
    return { ok: true };
  });
}

export async function activateChild(opts: {
  childWorkId: string;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const loaded = await loadChildWithParent(tx, opts.childWorkId);
    if (!loaded) return { ok: false, code: "not_found", message: "Child work not found." };
    if (!childAuthorizer(opts.actorUserId, loaded.sponsor_user_id, loaded.captain_user_id)) {
      return { ok: false, code: "forbidden", message: "Only the sponsor or captain can move children." };
    }
    if (loaded.child.state !== "READY") {
      return { ok: false, code: "invalid_state", message: `Child is ${loaded.child.state}.` };
    }
    await tx.query("update child_works set state='ACTIVE', updated_at=now() where id=$1", [opts.childWorkId]);
    return { ok: true };
  });
}

export async function completeChild(opts: {
  childWorkId: string;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const loaded = await loadChildWithParent(tx, opts.childWorkId);
    if (!loaded) return { ok: false, code: "not_found", message: "Child work not found." };
    if (!childAuthorizer(opts.actorUserId, loaded.sponsor_user_id, loaded.captain_user_id)) {
      return { ok: false, code: "forbidden", message: "Only the sponsor or captain can move children." };
    }
    if (loaded.child.state !== "ACTIVE") {
      return { ok: false, code: "invalid_state", message: `Child is ${loaded.child.state}.` };
    }
    // Linked children (RC1, R6) complete ONLY when the underlying engine work
    // reached its real terminal state — no click-through completion.
    if (loaded.child.kind === "BOUNTY" && loaded.child.bounty_id) {
      const b = await tx.query<{ s: string }>(
        "select status as s from bounties where id = $1",
        [loaded.child.bounty_id],
      );
      const st = String(b[0]?.s ?? "");
      if (!["AWARDED", "SETTLING", "COMPLETED"].includes(st)) {
        return {
          ok: false,
          code: "underlying_work_incomplete",
          message: `The linked bounty is ${st || "unknown"} — judge it (winner selected) before completing the child unit.`,
        };
      }
    }
    if (loaded.child.kind === "PROJECT" && loaded.child.project_id) {
      const pr = await tx.query<{ s: string }>(
        "select status as s from projects where id = $1",
        [loaded.child.project_id],
      );
      const st = String(pr[0]?.s ?? "");
      if (st !== "COMPLETED") {
        return {
          ok: false,
          code: "underlying_work_incomplete",
          message: `The linked project is ${st || "unknown"} — it must complete first.`,
        };
      }
    }
    await tx.query("update child_works set state='COMPLETE', updated_at=now() where id=$1", [opts.childWorkId]);
    // Reputation seed: the captain's team delivered this child unit.
    if (loaded.captain_user_id) {
      await tx.query(
        `insert into reputation_events (id, user_id, kind, work_id, meta)
         values ($1,$2,'captained_completion',$3,$4::jsonb)`,
        [makeId("rep_"), loaded.captain_user_id, opts.childWorkId, JSON.stringify({ child_title: loaded.child.title })],
      );
    }
    return { ok: true };
  });
}

export async function failChild(opts: {
  childWorkId: string;
  actorUserId: string;
  reason: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const loaded = await loadChildWithParent(tx, opts.childWorkId);
    if (!loaded) return { ok: false, code: "not_found", message: "Child work not found." };
    if (!childAuthorizer(opts.actorUserId, loaded.sponsor_user_id, loaded.captain_user_id)) {
      return { ok: false, code: "forbidden", message: "Only the sponsor or captain can move children." };
    }
    if (loaded.child.state !== "ACTIVE") {
      return { ok: false, code: "invalid_state", message: `Child is ${loaded.child.state}.` };
    }
    await tx.query(
      "update child_works set state='FAILED', updated_at=now() where id=$1",
      [opts.childWorkId],
    );
    // Linked children (RC1, R6): failing a child cancels its underlying work.
    if (loaded.child.kind === "BOUNTY" && loaded.child.bounty_id) {
      await tx.query(
        `update bounties set status='CANCELLED', cancelled_at=now(), cancelled_by=$2,
           cancel_reason=$3, updated_at=now()
         where id=$1 and status in ('OPEN','APPLICATION_CLOSED','SUBMISSION','JUDGING')`,
        [loaded.child.bounty_id, opts.actorUserId, `Parent child unit failed: ${opts.reason}`.slice(0, 1000)],
      );
    }
    if (loaded.child.kind === "PROJECT" && loaded.child.project_id) {
      await tx.query(
        `update projects set status='CANCELLED', cancelled_at=now(), cancelled_by=$2,
           cancelled_reason=$3, updated_at=now()
         where id=$1 and status in ('OPEN_FOR_PROPOSALS','PROPOSAL_SELECTED','AWAITING_FUNDING','ACTIVE','MILESTONE_REVIEW','COMPLETION_REVIEW')`,
        [loaded.child.project_id, opts.actorUserId, `Parent child unit failed: ${opts.reason}`.slice(0, 1000)],
      );
    }
    return { ok: true };
  });
}

/**
 * Sponsor sets the captain's compensation from the parent budget (row-locked,
 * balance-checked against children). Captains cannot set their own fee.
 */
export async function setCaptainCompensation(opts: {
  parentWorkId: string;
  actorUserId: string;
  feeMinor: number;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  if (!Number.isInteger(opts.feeMinor) || opts.feeMinor < 0) {
    return { ok: false, code: "invalid_fee", message: "Captain fee must be a non-negative integer (minor units)." };
  }
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const parent = (
      await tx.query<{
        id: string;
        sponsor_user_id: string;
        captain_user_id: string | null;
        funded_budget_minor: number | null;
        status: string;
      }>(
        "select id, sponsor_user_id, captain_user_id, funded_budget_minor, status from parent_works where id = $1 for update",
        [opts.parentWorkId],
      )
    )[0];
    if (!parent || parent.funded_budget_minor == null) {
      return { ok: false, code: "not_found", message: "Funded parent work not found." };
    }
    if (parent.sponsor_user_id !== opts.actorUserId) {
      return { ok: false, code: "forbidden", message: "Only the sponsor can set the captain fee." };
    }
    if (!parent.captain_user_id) {
      return { ok: false, code: "no_captain", message: "Select a captain first." };
    }
    if (opts.feeMinor > Number(parent.funded_budget_minor)) {
      return { ok: false, code: "invalid_fee", message: "Captain fee cannot exceed the funded budget." };
    }
    const spent = await tx.query<{ n: number }>(
      "select coalesce(sum(allocated_minor), 0)::int as n from child_works where parent_work_id = $1",
      [opts.parentWorkId],
    );
    const used = Number(spent[0]?.n ?? 0) + opts.feeMinor;
    if (used > Number(parent.funded_budget_minor)) {
      return {
        ok: false,
        code: "insufficient_balance",
        message: `Children + captain fee exceed the funded budget (used ${used} of ${parent.funded_budget_minor}).`,
      };
    }
    await tx.query(
      "update parent_works set captain_compensation_minor=$2, updated_at=now() where id=$1",
      [opts.parentWorkId, opts.feeMinor],
    );
    await insertAudit(tx, {
      actorUserId: opts.actorUserId,
      action: "captain_compensation_set",
      entityType: "PARENT_WORK",
      entityId: opts.parentWorkId,
      meta: { fee_minor: opts.feeMinor },
    });
    return { ok: true };
  });
}

/**
 * Parent settlement (FR-5): the sponsor moves ACTIVE -> COMPLETING; on settle
 * the reserve (funded - children-complete - children-failed - captain fee) is
 * either refunded (money_event REFUND, negative) or released per the sponsor's
 * explicit choice. NEVER auto-paid to the captain. Idempotent: a settled
 * parent returns already_settled and writes nothing.
 */
export async function beginParentSettlement(opts: {
  parentWorkId: string;
  actorUserId: string;
  action: "REFUND_RESERVE" | "RELEASE_RESERVE";
}): Promise<
  | { ok: true; reserveMinor: number }
  | { ok: false; code: string; message: string }
> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const parent = (
      await tx.query<{
        id: string;
        sponsor_user_id: string;
        status: string;
        funded_budget_minor: number | null;
        captain_compensation_minor: number;
      }>(
        "select id, sponsor_user_id, status, funded_budget_minor, captain_compensation_minor from parent_works where id = $1 for update",
        [opts.parentWorkId],
      )
    )[0];
    if (!parent || parent.funded_budget_minor == null) {
      return { ok: false, code: "not_found", message: "Funded parent work not found." };
    }
    if (parent.sponsor_user_id !== opts.actorUserId) {
      return { ok: false, code: "forbidden", message: "Only the sponsor settles their own work." };
    }
    if (parent.status === "COMPLETED") {
      return { ok: false, code: "already_settled", message: "Parent work is already settled." };
    }
    if (parent.status !== "ACTIVE" && parent.status !== "COMPLETING") {
      return { ok: false, code: "invalid_state", message: `Parent is ${parent.status}; settle from ACTIVE.` };
    }
    if (parent.status === "ACTIVE") {
      await tx.query(
        "update parent_works set status='COMPLETING', updated_at=now() where id=$1",
        [opts.parentWorkId],
      );
    }
    const sum = await tx.query<{ done: number; failed: number }>(
      `select coalesce(sum(case when state='COMPLETE' then allocated_minor else 0 end),0)::int as done,
              coalesce(sum(case when state='FAILED' then allocated_minor else 0 end),0)::int as failed
       from child_works where parent_work_id = $1`,
      [opts.parentWorkId],
    );
    const done = Number(sum[0]?.done ?? 0);
    const failed = Number(sum[0]?.failed ?? 0);
    const fee = Number(parent.captain_compensation_minor);
    const reserve = Number(parent.funded_budget_minor) - done - failed - fee;
    if (reserve < 0) {
      // Should be impossible under the invariant — never settle into a hole.
      return {
        ok: false,
        code: "budget_violation",
        message: "Settlement would exceed the funded budget — investigate before proceeding.",
      };
    }
    if (opts.action === "REFUND_RESERVE" && reserve > 0) {
      await tx.query(
        `insert into money_events
          (id, entity_type, entity_id, type, amount_minor, currency, provider, system, meta)
         values ($1,'PARENT_WORK',$2,'REFUND',$3,'INR','cashfree','admin',$4::jsonb)`,
        [makeId("mev_"), opts.parentWorkId, -reserve, JSON.stringify({ reserve_minor: reserve })],
      );
    }
    await tx.query(
      `update parent_works set status='COMPLETED', completed_at=now(), updated_at=now()
       where id=$1 and status='COMPLETING'`,
      [opts.parentWorkId],
    );
    await insertAudit(tx, {
      actorUserId: opts.actorUserId,
      action: "parent_settled",
      entityType: "PARENT_WORK",
      entityId: opts.parentWorkId,
      meta: { action: opts.action, reserve_minor: reserve, done, failed, fee },
    });
    return { ok: true, reserveMinor: reserve };
  });
}

/** Read the parent + its children (public-safe; no secrets). */
export async function getParentTree(
  parentWorkId: string,
): Promise<
  | {
      parent: ParentWorkRow;
      children: Array<{ id: string; title: string; state: string; allocated_minor: number; seq: number; depends_on: string[] }>;
    }
  | null
> {
  const sql = await getSql();
  const parent = (
    await sql.query<ParentWorkRow>("select * from parent_works where id = $1", [parentWorkId])
  )[0];
  if (!parent) return null;
  const children = await sql.query<{ id: string; title: string; state: string; allocated_minor: number; seq: number; depends_on: string[] }>(
    "select id, title, state, allocated_minor, seq, depends_on from child_works where parent_work_id = $1 order by seq",
    [parentWorkId],
  );
  return {
    parent,
    children: children.map((c) => ({
      id: c.id,
      title: c.title,
      state: c.state,
      allocated_minor: Number(c.allocated_minor),
      seq: c.seq,
      depends_on: Array.isArray(c.depends_on) ? c.depends_on : [],
    })),
  };
}
