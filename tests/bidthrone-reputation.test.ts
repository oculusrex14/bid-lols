import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

const { reputationFor, leaderboard } = await import("../src/lib/marketplace/reputation.server");

const A = "usr_rep_a"; // a member with real verified outcomes
const B = "usr_rep_b"; // a brand-new member with nothing
const C = "usr_rep_c"; // a second experienced member

async function seed(): Promise<import("@electric-sql/pglite").PGlite> {
  const pg = await getPglite();
  await pg.query(
    "truncate bounty_awards, bounties, projects, project_proposals, project_milestones, reputation_events, reviews, disputes, users, profiles, money_events restart identity cascade",
  );
  await pg.query(
    `insert into users (id, email, email_verified, display_name) values
     ($1,'a@t',true,'Member A'), ($2,'b@t',true,'Member B'), ($3,'c@t',true,'Member C')`,
    [A, B, C],
  );
  await pg.query(
    `insert into profiles (user_id, handle) values ($1,'alpha'), ($2,'beta'), ($3,'gamma')`,
    [A, B, C],
  );
  // A wins 2 bounties
  await pg.query(
    `insert into bounties (id, product, sponsor_user_id, title, slug, description, category, reward_total_minor, reward_structure, reward_allocations, submission_deadline, status)
     values ('bnt_r1','foundersbid',$1,'Bounty r one for rep test','bnt-r1','A funded bounty used to seed reputation for member A.','design',1000000,'WINNER_TAKES_ALL','[{"place":1,"amount_minor":1000000}]'::jsonb,now()+interval '1 day','COMPLETED'),
            ('bnt_r2','foundersbid',$1,'Bounty r two for rep test','bnt-r2','A funded bounty used to seed reputation for member A.','design',1000000,'WINNER_TAKES_ALL','[{"place":1,"amount_minor":1000000}]'::jsonb,now()+interval '1 day','COMPLETED')`,
    [A],
  );
  await pg.query(
    `insert into bounty_awards (id, bounty_id, user_id, place, amount_minor, currency, status)
     values ('awd_ra1','bnt_r1',$1,1,1000000,'INR','SETTLED'),('awd_ra2','bnt_r2',$1,1,1000000,'INR','SETTLED')`,
    [A],
  );
  // C completes a project
  await pg.query(
    `insert into projects (id, product, sponsor_user_id, title, slug, description, category, status, selected_proposal_id, completed_at)
     values ('prj_rc','foundersbid',$1,'Project r for rep test','prj-r','A completed project used to seed reputation for member C.','development','COMPLETED','prp_rc',now())`,
    [C],
  );
  await pg.query(
    "insert into project_proposals (id, project_id, provider_user_id, approach, quoted_minor, status) values ('prp_rc','prj_rc',$1,'A written approach with real substance and detail.',500000,'SELECTED')",
    [C],
  );
  // A gets a review: quality 4, comm 5, time 4, clarity 5 => (4+5+4+5)/4 = 4.5
  await pg.query(
    `insert into reviews (id, work_type, work_id, reviewer_user_id, reviewee_user_id, direction, quality, communication, timeliness, clarity, body)
     values ('rev_ra','BOUNTY','bnt_r1',$2,$1,'SPONSOR_TO_PROVIDER',4,5,4,5,'Great work.')`,
    [A, B],
  );
  return pg;
}

test("AC-1/AC-2: reputation is derived from verified work; honest empty state for newcomers", async () => {
  await seed();
  const a = await reputationFor(A);
  assert.equal(a.bountyWins, 2, "A's two verified bounty wins count");
  assert.equal(a.experience, 2, "experience = wins + projects + captained = 2");
  assert.equal(a.reviewsReceived, 1);
  assert.ok(Math.abs(a.quality - 4.5) < 0.001, `quality is the mean rating (got ${a.quality})`);
  assert.ok(a.score > 0);
  assert.equal(a.disputesAsClaimant, 0);

  const b = await reputationFor(B);
  assert.equal(b.experience, 0, "a brand-new member has zero verified experience");
  assert.equal(b.quality, 0);
  assert.equal(b.reviewsReceived, 0);
  assert.equal(b.score, 0, "no fabrication: a newcomer scores exactly 0");
});

test("AC-3: leaderboard ranks only members with verified work; no seeding", async () => {
  await seed();
  const rows = await leaderboard("most_experience", 10, 1);
  const handles = rows.map((r) => r.handle);
  assert.ok(handles.includes("alpha"), "A (alpha) is ranked (2 completions)");
  assert.ok(handles.includes("gamma"), "C (gamma) is ranked (project + captained)");
  assert.ok(!handles.includes("beta"), "B (beta, zero experience) is NOT ranked — no seeding");
  // order: most experience first
  assert.equal(rows[0].handle, "alpha", "alpha leads with 2 verified completions");
});

test("AC-3b: leaderboard returns empty (not padded) when no one meets the sample threshold", async () => {
  await seed();
  // minSample above any member's experience -> honest empty result
  const rows = await leaderboard("most_experience", 10, 100);
  assert.equal(rows.length, 0, "below the sample threshold the board is empty, never fake");
});

test("disputes lower reliability but are still shown as facts", async () => {
  await seed();
  await getPglite().then(async (pg) => {
    await pg.query(
      "insert into disputes (id, work_type, work_id, claimant_user_id, respondent_user_id, reason, status) values ('dsp_r1','BOUNTY','bnt_r1',$1,$2,'A dispute reason with real content.','RESOLVED')",
      [B, A],
    );
  });
  const a = await reputationFor(A);
  assert.equal(a.disputesAsRespondent, 1);
  assert.ok(a.reliability < 1, "a dispute as respondent lowers the completion ratio");
});