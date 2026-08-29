import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

/**
 * RC4 §71: database integration coverage of the Bid Index trust stack on a
 * hermetic PGLite (migrates to head). Verifies the §39 projector's
 * idempotency, the §71 lifecycle→evidence mappings, the §26 blind reveal,
 * and the §35/§62.11–16/§34 behaviors through the REAL service code.
 */

type Pg = import("@electric-sql/pglite").PGlite;
type Row = Record<string, unknown>;

async function q(pg: Pg, text: string, params: unknown[] = []): Promise<Row[]> {
  const res = await pg.query<Record<string, unknown>>(text, params as unknown[]);
  return res.rows as Row[];
}

const S = "usr_trust_sponsor";
const P = "usr_trust_provider";
const P2 = "usr_trust_provider2";
const C = "usr_trust_captain";
const ADM = "usr_trust_admin";

async function freshDb(): Promise<Pg> {
  const pg = await getPglite();
  await q(pg, `truncate bounty_awards, bounties, bounty_submissions, bounty_participants,
    projects, project_proposals, project_milestones, project_milestone_extensions,
    parent_works, child_works, reviews, disputes, reputation_events, money_events,
    trust_events, trust_score_snapshots, users, profiles restart identity cascade`);
  for (const [id, email] of [
    [S, "s@t"], [P, "p@t"], [P2, "p2@t"], [C, "cap@t"], [ADM, "adm@t"],
  ] as const) {
    await q(pg, `insert into users (id, email, email_verified, display_name, status)
      values ($1,$2,true,$3,'active')`, [id, email, email.split("@")[0]]);
    await q(pg, "insert into profiles (user_id, handle) values ($1,$2)", [id, email.split("@")[0]]);
  }
  return pg;
}

/** One COMPLETED, SETTLED bounty: sponsor S, winner = winnerId. */
async function completedBounty(pg: Pg, id: string, sponsorId: string, winnerId: string, daysAgo = 30): Promise<void> {
  await q(pg, `insert into bounties (id, product, sponsor_user_id, title, slug, description, category,
      reward_total_minor, reward_structure, reward_allocations, submission_deadline, status,
      published_at, awarded_at, completed_at, skills)
    values ($1,'foundersbid',$2,$3,$4,$5,'development',$6,'WINNER_TAKES_ALL',
      $7::jsonb, now() - interval '1 day', 'COMPLETED', now() - ($8 || ' days')::interval,
      now() - ($8 || ' days')::interval, now() - ($9 || ' days')::interval, '["react","api"]'::jsonb)`,
    [`bnt_${id}`, sponsorId, "Bounty for trust test", slugly(`bnt-${id}`),
      "A funded bounded bounty used to verify trust evidence behavior.", 2_500_000,
      JSON.stringify([{ place: 1, amount_minor: 2_500_000 }]), daysAgo + 10, daysAgo]);
  await q(pg, `insert into bounty_awards (id, bounty_id, user_id, place, amount_minor, currency, status)
    values ($1,$2,$3,1,$4,'INR','SETTLED')`, [`awd_${id}`, `bnt_${id}`, winnerId, 2_500_000]);
}

function slugly(seed: string): string {
  return `slug-${seed}`;
}

async function finalDispute(pg: Pg, id: string, workType: "BOUNTY" | "PROJECT", workId: string,
  claimant: string, respondent: string, resolution: string, severity: string | null,
  amount: number | null, responsibility: string | null): Promise<void> {
  await q(pg, `insert into disputes (id, work_type, work_id, claimant_user_id, respondent_user_id,
      reason, disputed_amount_minor, status, resolution_code, responsibility, severity_code, finalized_at)
    values ($1,$2,$3,$4,$5,$6,$7,'RESOLVED',$8,$9,$10, now())`,
    [`dsp_${id}`, workType, workId, claimant, respondent,
      "A dispute reason with sufficient content for the constraint.", amount, resolution, responsibility, severity]);
}


/** One project with a selected provider; optional milestones and end state. */
async function project(pg: Pg, id: string, sponsorId: string, providerId: string, opts: {
  status?: string;
  completedDaysAgo?: number;
  quoted?: number;
  milestones?: number;
  /** Simulate a sponsor cancellation THIS many days after selection. */
  cancelledDaysAfter?: number;
} = {}): Promise<string> {
  const pid = `prj_${id}`;
  const status = opts.status ?? "COMPLETED";
  const completedClause = status === "COMPLETED" ? `now() - (${opts.completedDaysAgo ?? 7} || ' days')::interval` : "null";
  await q(pg, `insert into projects (id, product, sponsor_user_id, title, slug, description, category,
      status, selected_quoted_minor, completed_at, skills)
    values ($1,'foundersbid',$2,$3,$4,$5,'development',$6,$7,${completedClause},'["react","api","db"]'::jsonb)`,
    [pid, sponsorId, "Project for trust test", slugly(pid),
      "A funded project used to verify trust evidence behavior end to end.", status,
      opts.quoted ?? 5_000_000]);
  const proposalId = `prp_${id}`;
  const selectedDaysAgo = opts.completedDaysAgo == null ? (opts.cancelledDaysAfter ?? 7) : (opts.completedDaysAgo ?? 7);
  await q(pg, `insert into project_proposals (id, project_id, provider_user_id, approach, quoted_minor, status, updated_at)
    values ($1,$2,$3,'A considered approach with real implementation detail.', $4, 'SELECTED',
      now() - ($5 || ' days')::interval)`,
    [proposalId, pid, providerId, opts.quoted ?? 5_000_000, selectedDaysAgo]);
  await q(pg, "update projects set selected_proposal_id = $2 where id = $1", [pid, proposalId]);
  if (status === "CANCELLED" && opts.cancelledDaysAfter != null) {
    await q(pg, "update projects set cancelled_at = now() - ($2 || ' days')::interval, cancelled_by = $3 where id = $1",
      [pid, Math.max(0, selectedDaysAgo - opts.cancelledDaysAfter), null]);
    void 0;
  }
  if (opts.milestones && opts.milestones > 0) {
    for (let i = 1; i <= opts.milestones; i += 1) {
      await q(pg, `insert into project_milestones (id, project_id, seq, title, amount_minor, currency,
          due_at, status, active_at, submitted_at, decided_at)
        values ($1,$2,$3,$4,$5,'INR', now() - ($6 || ' days')::interval, 'APPROVED',
          now() - ($6 || ' days')::interval, now() - ($7 || ' days')::interval, now() - ($6 || ' days')::interval)`,
        [`mst_${id}_${i}`, pid, i, `Milestone ${i}`, Math.floor((opts.quoted ?? 5_000_000) / opts.milestones),
          selectedDaysAgo, Math.max(1, selectedDaysAgo - 2)]);
    }
  }
  return pid;
}


test("§71: completed bounty → provider event via projector; project → provider + sponsor evidence", async () => {
  const pg = await freshDb();
  await completedBounty(pg, "a", S, P, 30);
  const { projectUserTrustEvents } = await import("../src/lib/trust/projector.server");
  const r1 = await projectUserTrustEvents(P, { apply: true });
  assert.ok(r1.created >= 1, "the provider clean outcome is projected");
  const r2 = await projectUserTrustEvents(P, { apply: true });
  assert.equal(r2.created, 0, "re-running the projector creates nothing (idempotent)");
  const sponsorRun = await projectUserTrustEvents(S, { apply: true });
  assert.ok(sponsorRun.created >= 1, "the sponsor side projects its own evidence");

  const providerEvents = await q(pg, `select event_kind, role from trust_events where user_id = $1`, [P]);
  assert.ok(providerEvents.some((e) => e.event_kind === "CLEAN_COMPLETION" && e.role === "PROVIDER"));
  const sponsorEvents = await q(pg, `select event_kind, role from trust_events where user_id = $1`, [S]);
  assert.ok(sponsorEvents.some((e) => e.event_kind === "CLEAN_COMPLETION" && e.role === "SPONSOR"));

  // Non-winning participants never produce outcomes (§8/§62.14 preservation).
  await q(pg, `insert into bounty_participants (id, bounty_id, user_id, status)
    values ('par_loser', 'bnt_a', $1, 'SUBMITTED')`, [P2]);
  await projectUserTrustEvents(P2, { apply: true });
  assert.equal(loserCounters(await q(pg, `select count(*)::int as n from trust_events where user_id = $1`, [P2])), 0,
    "a submitted-but-not-selected bounty entry produces no scoring event");
  void r2;
  void providerEvents;
  void sponsorEvents;
});

function loserCounters(rows: Row[]): number {
  return Number(rows[0]?.n ?? 0);
}

test("§71: completed project produces provider AND sponsor evidence", async () => {
  const pg = await freshDb();
  await project(pg, "b", S, P, { milestones: 2, completedDaysAgo: 20 });
  const { projectUserTrustEvents } = await import("../src/lib/trust/projector.server");
  await projectUserTrustEvents(P, { apply: true });
  await projectUserTrustEvents(S, { apply: true });
  const provider = await q(pg, `select role, work_type from trust_events where user_id = $1`, [P]);
  assert.ok(provider.some((e) => e.role === "PROVIDER" && e.work_type === "PROJECT"));
  const sponsor = await q(pg, `select role from trust_events where user_id = $1`, [S]);
  assert.ok(sponsor.some((e) => e.role === "SPONSOR"));
});


test("§19/§62.11: a finalized provider-at-fault dispute drops the provider via adverse evidence + cap", async () => {
  const pg = await freshDb();
  await q(pg, `insert into users (id, email, email_verified, display_name)
    values ('usr_trust_sponsor2','s2@t',true,'Sponsor Two')`);
  await q(pg, "insert into profiles (user_id, handle) values ('usr_trust_sponsor2','sponsor-two')");
  // Three outcomes across TWO distinct counterparties → score-eligible.
  await completedBounty(pg, "c1", S, P, 60);
  await completedBounty(pg, "c2", S, P, 35); // same-counterpair repeat (damping applies)
  await completedBounty(pg, "c3", "usr_trust_sponsor2", P, 10);
  await finalDispute(pg, "x", "BOUNTY", "bnt_c3", S, P, "PROVIDER_AT_FAULT", "ABANDONMENT_OR_NONPERFORMANCE", 2_500_000, "PROVIDER");
  const { collectTrustFacts } = await import("../src/lib/trust/evidence.server");
  const { scoreRole } = await import("../src/lib/trust/score-core");
  const facts = await collectTrustFacts(P);
  const adverse = facts.provider.outcomes.filter((o) => o.severity !== "NORMAL");
  assert.equal(adverse.length, 1, "one attributable adverse provider outcome");
  assert.equal(adverse[0].weightShare, 1);
  const clean = facts.provider.outcomes.filter((o) => o.severity === "NORMAL");
  assert.equal(clean.length, 2, "the disputed work's clean outcome is superseded");
  const result = scoreRole(facts.provider);
  assert.ok(result.capApplied !== null, "ABANDONMENT applies a MAJOR_DEFAULT cap");
  assert.ok((result.score ?? 900) <= 649, `capped score, got ${result.score}`);
  assert.ok(result.primaryOutcomes >= 2, "the adverse event itself counts as an outcome");
});

test("§62.12: a vindicated respondent (NO_FAULT) gains no penalty", async () => {
  const pg = await freshDb();
  await completedBounty(pg, "d1", S, P, 50);
  await completedBounty(pg, "d2", S, P, 20);
  await finalDispute(pg, "y", "BOUNTY", "bnt_d2", P, S, "NO_FAULT", null, null, "NOBODY");
  const { collectTrustFacts } = await import("../src/lib/trust/evidence.server");
  const facts = await collectTrustFacts(P);
  assert.equal(facts.provider.outcomes.filter((o) => o.severity !== "NORMAL").length, 0,
    "no-fault resolution produces no adverse outcome");
  const sponsorFacts = await collectTrustFacts(S);
  assert.equal(sponsorFacts.sponsor.outcomes.filter((o) => o.severity !== "NORMAL").length, 0);
});

test("§20: SHARED_FAULT splits the failure weight half to each side", async () => {
  const pg = await freshDb();
  await completedBounty(pg, "e1", S, P, 40);
  await finalDispute(pg, "z", "BOUNTY", "bnt_e1", S, P, "SHARED_FAULT", "ABANDONMENT_OR_NONPERFORMANCE", 2_500_000, "SHARED");
  const { collectTrustFacts } = await import("../src/lib/trust/evidence.server");
  const providerFacts = await collectTrustFacts(P);
  const sponsorFacts = await collectTrustFacts(S);
  const providerAdverse = providerFacts.provider.outcomes.filter((o) => o.severity !== "NORMAL");
  const sponsorAdverse = sponsorFacts.sponsor.outcomes.filter((o) => o.severity !== "NORMAL");
  assert.equal(providerFacts.adjudications.length, 1, "one final shared-fault dispute");
  assert.equal(providerFacts.adjudications[0].targets.length, 2, "two responsible sides");
  assert.ok(providerAdverse.some((o) => o.weightShare === 0.5), "provider side carries half the weight");
  assert.ok(sponsorAdverse.some((o) => o.weightShare === 0.5), "sponsor side carries half the weight");
});

test("§24.1: funding lapse counts only AFTER the 7-day window; in-window cancels stay neutral", async () => {
  const pg = await freshDb();
  // Cancelled 2 days after selection → inside the window → no event.
  await project(pg, "l1", S, P, { status: "CANCELLED", cancelledDaysAfter: 2 });
  const { collectTrustFacts } = await import("../src/lib/trust/evidence.server");
  let facts = await collectTrustFacts(S);
  assert.equal(facts.sponsor.outcomes.length, 0, "inside-window cancel is neutral");
  // Cancelled 12 days after selection → attributable lapse.
  await q(pg, "delete from projects");
  await q(pg, "delete from project_proposals");
  await project(pg, "l2", S, P, { status: "CANCELLED", cancelledDaysAfter: 12 });
  facts = await collectTrustFacts(S);
  const lapse = facts.sponsor.outcomes.find((o) => o.severity !== "NORMAL");
  assert.ok(lapse, "past-window lapse creates an adverse sponsor outcome");
  assert.equal(lapse?.severity, "ATTRIBUTABLE_CANCELLATION");
  assert.equal(lapse?.counterpartyUserId, P);
});

test("§25: captained completion produces captain evidence with stewardship facts", async () => {
  const pg = await freshDb();
  await q(pg, `insert into parent_works (id, product, sponsor_user_id, captain_user_id, title, slug,
      objective, funded_budget_minor, captain_compensation_minor, status, captain_selected_at, completed_at)
    values ('pwr_t1','bidception',$1,$2,'Parent work for captain test','pwr-captain',
      'One funded objective split into funded child parts on schedule.',10_000_000, 500_000, 'COMPLETED',
      now() - interval '30 days', now())`,
    [S, C]);
  await q(pg, `insert into child_works (id, parent_work_id, title, allocated_minor, state, seq, depends_on)
    values ('cwk_a','pwr_t1','Child A',4_000_000,'COMPLETE',1,'[]'::jsonb),
           ('cwk_b','pwr_t1','Child B',4_000_000,'COMPLETE',2,'["cwk_a"]'::jsonb)`);
  const { collectTrustFacts } = await import("../src/lib/trust/evidence.server");
  const facts = await collectTrustFacts(C);
  const captain = facts.captain.outcomes[0];
  assert.ok(captain, "the completed parent yields a captain outcome");
  assert.ok(captain.stewardshipY === 1, `no failed allocations → stewardship 1 (got ${captain.stewardshipY})`);
  assert.ok(captain.childOutcomeY === 1, "all committed children completed");
  assert.ok(captain.complexity > 0, "captain complexity derives from child structure");
  // A failed child allocation reduces stewardship and child outcome.
  await q(pg, "update child_works set state = 'FAILED' where id = 'cwk_b'");
  const facts2 = await collectTrustFacts(C);
  const captain2 = facts2.captain.outcomes[0];
  assert.ok((captain2.stewardshipY ?? 1) < (captain.stewardshipY ?? 0), "stewardship drops with a failed allocation");
  assert.ok((captain2.childOutcomeY ?? 1) < (captain.childOutcomeY ?? 0), "child outcome value drops too");
});


test("§26/§49: blind reviews do not leak; both-submit reveals; window reveals", async () => {
  const pg = await freshDb();
  await completedBounty(pg, "g1", S, P, 15);
  // Sponsor reviews the winner; the builder says nothing yet.
  await q(pg, `insert into reviews (id, work_type, work_id, reviewer_user_id, reviewee_user_id, direction, quality, communication, body)
    values ('rev_s','BOUNTY','bnt_g1',$1,$2,'SPONSOR_TO_PROVIDER',2,3,'Late in one area.')`,
    [S, P]);
  const { reviewsForUser } = await import("../src/lib/marketplace/reviews.server");
  let visible = await reviewsForUser(P);
  assert.equal(visible.length, 0, "a one-sided review is hidden while in its window (blind)");
  // The provider's recency of the counterparty review must not leak through
  // the scoring evidence either.
  const { collectTrustFacts } = await import("../src/lib/trust/evidence.server");
  const facts = await collectTrustFacts(P);
  const review = facts.provider.outcomes[0]?.review;
  assert.ok(review, "the review fact exists");
  assert.equal(review?.revealed, false, "blind review does not feed scoring");
  // The counterparty submits → both reveal.
  await q(pg, `insert into reviews (id, work_type, work_id, reviewer_user_id, reviewee_user_id, direction, clarity, fairness, body)
    values ('rev_p','BOUNTY','bnt_g1',$1,$2,'PROVIDER_TO_SPONSOR',4,4,'Reasonable sponsor.')`,
    [P, S]);
  visible = await reviewsForUser(P);
  assert.equal(visible.length, 1, "both sides submitted → revealed");
  const sponsorVisible = await reviewsForUser(S);
  assert.equal(sponsorVisible.length, 1, "the provider review is visible to the sponsor's profile too");
  // Immutability: reviews have no update path; unique per reviewer per work.
  await assert.rejects(
    () => q(pg, `insert into reviews (id, work_type, work_id, reviewer_user_id, reviewee_user_id, direction)
      values ('rev_s_dup','BOUNTY','bnt_g1',$1,$2,'SPONSOR_TO_PROVIDER')`, [S, P]),
    /unique constraint|duplicate key/i,
    "duplicate reviews are prohibited by the schema",
  );
  // 14-day window path: single review becomes visible when old enough.
  await q(pg, "delete from reviews where direction = 'PROVIDER_TO_SPONSOR'");
  visible = await reviewsForUser(P);
  assert.equal(visible.length, 0);
  await q(pg, "update reviews set created_at = now() - interval '15 days'");
  visible = await reviewsForUser(P);
  assert.equal(visible.length, 1, "window elapsed → revealed");
});

test("§41/§62.22: reversing a trust event excludes it from scoring; snapshots stay reproducible", async () => {
  const pg = await freshDb();
  await completedBounty(pg, "h1", S, P, 45);
  await completedBounty(pg, "h2", S, P, 25);
  const { projectUserTrustEvents } = await import("../src/lib/trust/projector.server");
  await projectUserTrustEvents(P, { apply: true });
  const { trustReportFor } = await import("../src/lib/trust/score.server");
  const first = await trustReportFor(P);
  void first;
  // Manual, audited reversal of the provider's newest CLEAN_COMPLETION.
  const ev = await q(pg, `select id from trust_events where user_id = $1 and event_kind = 'CLEAN_COMPLETION'
     order by occurred_at desc limit 1`, [P]);
  const targetId = String(ev[0]?.id);
  await q(pg, `insert into trust_events (id, user_id, role, product, work_type, work_id, event_kind,
      source_type, source_id, occurred_at, reverses_event_id, meta)
    values ('tev_rev_test',$1,'PROVIDER','foundersbid','BOUNTY','x','REVERSAL','reversal',$2,
      now(), $3, '{}'::jsonb)`, [P, targetId, targetId]);
  const second = await trustReportFor(P);
  const outcomeCountAfterReversal = second.roles.find((r) => r.role === "PROVIDER")?.primaryOutcomes ?? 0;
  const firstCount = first.roles.find((r) => r.role === "PROVIDER")?.primaryOutcomes ?? 0;
  assert.equal(firstCount, 2, "setup: two projected outcomes");
  assert.equal(outcomeCountAfterReversal, 1, "the reversal drops the superseded outcome");
  // Deleting all trust events entirely still reproduces the same score
  // (state + reversals → evidence), §41 reproducibility.
  await q(pg, "delete from trust_events");
  const third = await trustReportFor(P);
  const thirdCount = third.roles.find((r) => r.role === "PROVIDER")?.primaryOutcomes ?? 0;
  assert.equal(thirdCount, 2, "trust_events deleted → scores rebuild from state alone");
});

test("§41: snapshots invalidate automatically when the underlying outcome set changes", async () => {
  const pg = await freshDb();
  await completedBounty(pg, "k1", S, P, 50);
  await completedBounty(pg, "k2", S, P, 20);
  const { trustReportFor } = await import("../src/lib/trust/score.server");
  await trustReportFor(P);
  const b = await trustReportFor(P);
  assert.ok(b.fromSnapshot, "second read comes from a matching snapshot");
  await completedBounty(pg, "k3", S, P, 5); // new eligible outcome
  const c = await trustReportFor(P);
  assert.equal(c.fromSnapshot, false, "new outcome → fingerprint changed → recompute + upsert");
  assert.ok((c.roles.find((r) => r.role === "PROVIDER")?.primaryOutcomes ?? 0) >= 3);
});
