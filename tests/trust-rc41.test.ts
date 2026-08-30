import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";

/**
 * RC5 Gate 1 (RC4.1) trust correctness regressions on hermetic PGLite:
 *  - 5.1 snapshot cold/warm equivalence (role + overall, with caps);
 *  - 5.2 fingerprint includes restriction/reinstatement facts;
 *  - 5.3 leaderboard cache regression (warm snapshot keeps eligibility);
 *  - 5.4 marginal impact null for non-comparable counterfactuals;
 *  - 5.5/5.6 one registry + Most Reliable ranks the reliability pillar;
 *  - 5.7 homepage market rates share marketRateFor() semantics.
 *
 * Fixed `asOf` dates keep the fingerprint deterministic across calls.
 */

type Pg = import("@electric-sql/pglite").PGlite;
type Row = Record<string, unknown>;

async function q(pg: Pg, text: string, params: unknown[] = []): Promise<Row[]> {
  const res = await pg.query<Record<string, unknown>>(text, params as unknown[]);
  return res.rows as Row[];
}

const AS = "usr_rc41_sponsor";
const A = "usr_rc41_provider_a"; // high reliability, average volume
const B = "usr_rc41_provider_b"; // lower reliability, higher overall
const C = "usr_rc41_provider_c"; // single major default (capped)
const M = "usr_rc41_provider_m"; // marginal null fixture
const ASOF = new Date("2026-09-15T00:00:00Z");

async function freshDb(): Promise<Pg> {
  const pg = await getPglite();
  await q(pg, `truncate bounty_awards, bounties, projects, project_proposals,
    project_milestones, project_milestone_extensions, parent_works, child_works,
    reviews, disputes, reputation_events, money_events, trust_events,
    trust_score_snapshots, users, profiles restart identity cascade`);
  for (const [id, email, handle] of [
    [AS, "s@rc41", "rc41s"],
    [A, "a@rc41", "rc41a"],
    [B, "b@rc41", "rc41b"],
    [C, "c@rc41", "rc41c"],
    [M, "m@rc41", "rc41m"],
  ] as const) {
    await q(pg, `insert into users (id, email, email_verified, display_name, status)
      values ($1,$2,true,$3,'active')`, [id, email, handle]);
    await q(pg, "insert into profiles (user_id, handle) values ($1,$2)", [id, handle]);
  }
  return pg;
}

/** One COMPLETED bounty: sponsor sponsorId, winner winnerId, settled daysAgo. */
async function doneBounty(
  pg: Pg,
  seq: string,
  sponsorId: string,
  winnerId: string,
  daysAgo: number,
  category = "development",
): Promise<void> {
  await q(pg, `insert into bounties (id, product, sponsor_user_id, title, slug, description,
      category, reward_total_minor, reward_structure, reward_allocations,
      submission_deadline, status, published_at, awarded_at, completed_at, skills)
    values ($1,'foundersbid',$2,$3,$4,$5,$6,2500000,'WINNER_TAKES_ALL',
      $7::jsonb, now() - interval '1 day', 'COMPLETED',
      now() - ($8 || ' days')::interval, now() - ($9 || ' days')::interval,
      now() - ($9 || ' days')::interval, '["react","api"]'::jsonb)`,
    [`bnt_${seq}`, sponsorId, `Bounty rc41 ${seq}`, `slug-rc41-${seq}`,
      `A funded bounded bounty for the rc41 trust tests. ${category} category.`,
      category, JSON.stringify([{ place: 1, amount_minor: 2500000 }]),
      String(daysAgo + 10), String(daysAgo)]);
  await q(pg, `insert into bounty_awards (id, bounty_id, user_id, place, amount_minor, currency, status)
    values ($1,$2,$3,1,2500000,'INR','SETTLED')`, [`awd_${seq}`, `bnt_${seq}`, winnerId]);
}

/** A finalized dispute against the winner of a completed bounty. */
async function providerFaultDispute(
  pg: Pg,
  seq: string,
  workId: string,
  sponsorId: string,
  providerId: string,
  severity: string,
): Promise<void> {
  await q(pg, `insert into disputes (id, work_type, work_id, claimant_user_id, respondent_user_id,
      reason, disputed_amount_minor, status, resolution_code, responsibility,
      severity_code, finalized_at)
    values ($1,'BOUNTY',$2,$3,$4,'A dispute reason with sufficient content for the constraint.',
      2500000,'RESOLVED','PROVIDER_AT_FAULT','PROVIDER',$5, now())`,
    [`dsp_${seq}`, workId, sponsorId, providerId, severity]);
}

/** The complete RoleScoreResult minus nothing: the 5.1 equivalence surface. */
function fields(r: import('../src/lib/trust/score-core').RoleScoreResult) {
  return {
    role: r.role,
    modelVersion: r.modelVersion,
    status: r.status,
    score: r.score,
    band: r.band,
    confidence: r.confidence,
    confidenceLabel: r.confidenceLabel,
    bRaw: r.bRaw,
    pillars: r.pillars,
    primaryOutcomes: r.primaryOutcomes,
    uniqueCounterparties: r.uniqueCounterparties,
    effectiveSampleSize: r.effectiveSampleSize,
    spanDays: r.spanDays,
    verifiedVolumeMinor: r.verifiedVolumeMinor,
    capApplied: r.capApplied,
    uncappedScore: r.uncappedScore,
  };
}

/** Create secondary sponsors s2..sN (s1 is the base AS). */
async function mkSponsors(pg: Pg, n: number): Promise<void> {
  for (let i = 2; i <= n; i += 1) {
    await q(pg, `insert into users (id, email, email_verified, display_name, status)
      values ($1,$2,true,$3,'active')`, [`usr_rc41_s${i}`, `s${i}@rc41`, `rc41s${i}`]);
    await q(pg, "insert into profiles (user_id, handle) values ($1,$2)", [`usr_rc41_s${i}`, `rc41s${i}`]);
  }
}

async function seedDivergent(pg: Pg): Promise<void> {
  // Sponsors s1..s7 (s1 = the base sponsor AS).
  await mkSponsors(pg, 7);
  // A: 6 clean bounties, 6 sponsors, ~200-day span (all clean → reliability high).
  for (let i = 1; i <= 6; i += 1) {
    await doneBounty(pg, `a${i}`, i === 1 ? AS : `usr_rc41_s${i}`, A, 20 + i * 30);
  }
  // B: 12 clean bounties from 6 sponsors (two each, ~210-day span) plus ONE
  // final ATTRIBUTABLE_CANCELLATION fault (not a major default: no cap).
  // B's evidence volume beats A's on the overall score; A's clean record
  // beats B's on the reliability pillar.
  for (let i = 1; i <= 6; i += 1) {
    const s = i === 1 ? AS : `usr_rc41_s${i}`;
    await doneBounty(pg, `b${i}x`, s, B, 20 + i * 28);
    await doneBounty(pg, `b${i}y`, s, B, 40 + i * 28);
  }
  await providerFaultDispute(pg, "bf1", "bnt_b1x", AS, B, "ATTRIBUTABLE_CANCELLATION");
  // C: 3 clean + one recent ABANDONMENT (major default → capped at 649).
  await doneBounty(pg, "c1", AS, C, 30);
  await doneBounty(pg, "c2", "usr_rc41_s3", C, 60);
  await doneBounty(pg, "c3", "usr_rc41_s4", C, 90);
  await doneBounty(pg, "c4", "usr_rc41_s5", C, 12);
  await providerFaultDispute(pg, "cf", "bnt_c4", "usr_rc41_s5", C, "ABANDONMENT_OR_NONPERFORMANCE");
}

test("RC5 §5.1: cold and warm trustReportFor are materially equivalent (role + overall)", async () => {
  const pg = await freshDb();
  await seedDivergent(pg);
  const { trustReportFor } = await import("../src/lib/trust/score.server");
  const cold = await trustReportFor(A, ASOF);
  assert.equal(cold.fromSnapshot, false, "first read computes fresh");
  const warm = await trustReportFor(A, ASOF);
  assert.equal(warm.fromSnapshot, true, "second read with the same facts comes from the snapshot");
  for (const role of ["PROVIDER", "SPONSOR", "CAPTAIN"] as const) {
    assert.deepEqual(
      fields(warm.roles.find((r) => r.role === role)!),
      fields(cold.roles.find((r) => r.role === role)!),
      `role ${role} cold/warm equivalence`,
    );
  }
  assert.deepEqual(
    { status: warm.overall?.status, score: warm.overall?.score, band: warm.overall?.band, capApplied: warm.overall?.capApplied },
    { status: cold.overall?.status, score: cold.overall?.score, band: cold.overall?.band, capApplied: cold.overall?.capApplied },
    "overall cold/warm equivalence",
  );
});

test("RC5 §5.1: capped role snapshots preserve cap + uncapped value on the warm read", async () => {
  const pg = await freshDb();
  await seedDivergent(pg);
  const { trustReportFor } = await import("../src/lib/trust/score.server");
  const cold = await trustReportFor(C, ASOF);
  const provider = cold.roles.find((r) => r.role === "PROVIDER")!;
  assert.equal(provider.status, "SCORED");
  assert.ok(provider.capApplied !== null, "the major default applies a cap");
  assert.ok((provider.score ?? 0) <= 649, `capped score, got ${provider.score}`);
  assert.ok((provider.uncappedScore ?? 0) > (provider.score ?? 0), "the uncapped value is preserved");
  const warm = await trustReportFor(C, ASOF);
  assert.equal(warm.fromSnapshot, true);
  assert.deepEqual(fields(warm.roles.find((r) => r.role === "PROVIDER")!), fields(provider),
    "capped role cold/warm equivalence");
});

test("RC5 §5.2: a restriction today invalidates the cached score (RESTRICTED, not the old number)", async () => {
  const pg = await freshDb();
  await seedDivergent(pg);
  const { trustReportFor } = await import("../src/lib/trust/score.server");
  const before = await trustReportFor(A, ASOF);
  assert.equal(before.overall?.status, "SCORED");
  assert.ok(before.roles.find((r) => r.role === "PROVIDER")!.score != null);
  // The account becomes formally restricted today.
  await q(pg, "update users set banned = true where id = $1", [A]);
  const after = await trustReportFor(A, ASOF);
  assert.equal(after.fromSnapshot, false, "the fingerprint changed: no stale cache served");
  const provider = after.roles.find((r) => r.role === "PROVIDER")!;
  assert.equal(provider.status, "RESTRICTED");
  assert.equal(provider.score, null, "a restricted role publishes no number");
  assert.equal(after.overall, null, "overall is null: no scored role remains");
  // Reinstated: the fingerprint changes again and the score comes back.
  await q(pg, "update users set banned = false where id = $1", [A]);
  const back = await trustReportFor(A, ASOF);
  assert.equal(back.fromSnapshot, false, "the reinstatement fingerprint differs from the restricted one");
  assert.equal(back.roles.find((r) => r.role === "PROVIDER")!.status, "SCORED");
  assert.equal(
    back.roles.find((r) => r.role === "PROVIDER")!.score,
    before.roles.find((r) => r.role === "PROVIDER")!.score,
    "reinstatement restores the previous score exactly",
  );
});

test("RC5 §5.2: fingerprint changes with restriction and reinstatement facts (unit)", async () => {
  const { reportFingerprint } = await import("../src/lib/trust/score.server");
  const base = {
    role: "PROVIDER" as const,
    outcomes: [
      {
        workKey: "BOUNTY:w1",
        counterpartyUserId: "cp1",
        excludedFromEvidence: false,
        occurredDaysAgo: 30,
        amountMinor: 2500000,
        currency: "INR",
        severity: "NORMAL" as const,
        complexity: 0.5,
        review: null,
        timelinessY: 1,
        decisionDelayDays: null,
        stewardshipY: null,
        childOutcomeY: null,
        weightShare: 1,
      },
    ],
    currentlyRestricted: false,
    severeEventReinstatedDaysAgo: null,
  };
  const h0 = reportFingerprint("u1", [base]);
  assert.equal(reportFingerprint("u1", [base]), h0, "same facts → same fingerprint");
  assert.notEqual(
    reportFingerprint("u1", [{ ...base, currentlyRestricted: true }]),
    h0,
    "restriction fact changes the fingerprint",
  );
  assert.notEqual(
    reportFingerprint("u1", [{ ...base, severeEventReinstatedDaysAgo: 100 }]),
    h0,
    "reinstatement fact changes the fingerprint",
  );
  assert.notEqual(
    reportFingerprint("u1", [{ ...base, severeEventReinstatedDaysAgo: 101 }]),
    reportFingerprint("u1", [{ ...base, severeEventReinstatedDaysAgo: 100 }]),
    "reinstatement age changes the fingerprint (the recovery cap is time-dependent)",
  );
  // RC5.1 WS11: currency is scoring-relevant (the INR-native gate), so a
  // changed denomination must invalidate a cached report too.
  const base2 = {
    ...base,
    outcomes: [
      { ...base.outcomes[0], currency: "USD" },
    ],
  };
  assert.notEqual(
    reportFingerprint("u1", [base2]),
    h0,
    "currency fact changes the fingerprint (BI-1.0 is INR-native)",
  );
});

test("RC5 §5.3: an eligible provider stays eligible through the snapshot cache (role + overall boards)", async () => {
  const pg = await freshDb();
  await seedDivergent(pg);
  const { trustReportFor, bidIndexLeaderboard, bidIndexLeaderboardOverall } =
    await import("../src/lib/trust/score.server");
  const report = await trustReportFor(A, ASOF); // warms the snapshots
  assert.equal(report.fromSnapshot, false);
  const rows = await bidIndexLeaderboard("PROVIDER", 10);
  const a = rows.find((r) => r.userId === A);
  assert.ok(a, "A is on the provider board (the warm read kept n_eff/counterparties)");
  assert.ok(a!.confidence >= 0.45, "the board gate saw the real confidence, not a cache-zero");
  assert.ok(a!.score >= 300 && a!.score <= 900);
  const overall = await bidIndexLeaderboardOverall(10);
  assert.ok(overall.some((r) => r.userId === A), "A is on the overall board too");
});

test("RC5 §5.6: Most Reliable ranks the reliability pillar; the Bid Index board stays distinct", async () => {
  const pg = await freshDb();
  await seedDivergent(pg);
  const { trustReportFor } = await import("../src/lib/trust/score.server");
  // Boards index their candidates from the snapshot service: warm both
  // members the way a profile view would (RC4 §54/§73 candidate path).
  await trustReportFor(A, ASOF);
  await trustReportFor(B, ASOF);
  const { leaderboard } = await import("../src/lib/marketplace/reputation.server");
  const reliable = await leaderboard("most_reliable", 10);
  assert.ok(reliable.length >= 2, "both providers meet the reliability floor");
  assert.equal(reliable[0].userId, A, "A (high reliability, average volume) leads Most Reliable");
  assert.ok(reliable[0].metric >= 0 && reliable[0].metric <= 1, "the metric is a 0..1 pillar, not a 300-900 score");
  const aRel = reliable.find((r) => r.userId === A)!.metric;
  const bRel = reliable.find((r) => r.userId === B)!.metric;
  assert.ok(aRel > bRel, `A's reliability pillar beats B's (${aRel} > ${bRel})`);
  const index = await leaderboard("top_providers_bid_index", 10);
  assert.ok(index.length >= 2);
  assert.equal(index[0].userId, B, "B (more evidence volume, lower reliability) leads the provider Bid Index");
  assert.ok(index[0].metric >= 300 && index[0].metric <= 900, "the index metric is the 300-900 personal score");
});

test("RC5 §5.4: removing an adverse event that breaks eligibility yields null, not 0 points", async () => {
  const pg = await freshDb();
  // M: exactly one clean bounty + one major adverse dispute on a second work
  // → 2 outcomes × 2 counterparties → scored (capped). Removing the adverse
  // event leaves 1 outcome → NR: no comparable number exists.
  await mkSponsors(pg, 2);
  await doneBounty(pg, "m1", AS, M, 40);
  await doneBounty(pg, "m2", "usr_rc41_s2", M, 15);
  await providerFaultDispute(pg, "mf", "bnt_m2", "usr_rc41_s2", M, "ABANDONMENT_OR_NONPERFORMANCE");
  const { trustReportFor, marginalImpactsForRole } = await import("../src/lib/trust/score.server");
  const report = await trustReportFor(M, ASOF);
  const provider = report.roles.find((r) => r.role === "PROVIDER")!;
  assert.equal(provider.status, "SCORED", "the adverse event is part of a scored role");
  const impacts = await marginalImpactsForRole(M, "PROVIDER");
  assert.equal(impacts.length, 1, "one adverse event has one true impact");
  assert.equal(impacts[0].impactPoints, null, "NR counterfactual → null (never 0)");
  assert.equal(impacts[0].counterfactualStatus, "NR");
});

test("RC5 §5.4: a comparable counterfactual keeps a numeric impact", async () => {
  const pg = await freshDb();
  await seedDivergent(pg);
  const { marginalImpactsForRole } = await import("../src/lib/trust/score.server");
  const impacts = await marginalImpactsForRole(B, "PROVIDER");
  assert.equal(impacts.length, 1, "B has one adjudicated adverse event");
  for (const i of impacts) {
    assert.ok(i.impactPoints !== null, "B stays eligible without either event → numeric impact");
    assert.ok(i.impactPoints! <= 0, "a finalized adverse event cannot raise the score (impact = with − without)");
  }
});

test("RC5: snapshot ids never collide across users sharing a 12-char prefix", async () => {
  // Regression for the latent P0 behind §5.6: writeSnapshot used to key the
  // primary id on userId.slice(0, 12), so usr_rc41_provider_a / _b / _c / _m
  // all mapped to the same row and the second write violated the PK.
  const pg = await freshDb();
  await doneBounty(pg, "n1", AS, A, 30);
  await doneBounty(pg, "n2", AS, B, 20);
  const { trustReportFor } = await import("../src/lib/trust/score.server");
  await trustReportFor(A, ASOF);
  await trustReportFor(B, ASOF);
  const ids = await q(pg, `select id, user_id from trust_score_snapshots where role = 'PROVIDER'`);
  assert.equal(ids.length, 2, "one snapshot row per user");
  assert.equal(new Set(ids.map((r) => String(r.id))).size, 2, "distinct primary keys");
});

test("RC5 §5.7: the homepage market rates preview shares marketRateFor() semantics", async () => {
  const pg = await freshDb();
  // 11 completed development bounties (sufficient), 3 design (insufficient).
  for (let i = 1; i <= 11; i += 1) {
    await doneBounty(pg, `mr${i}`, AS, A, i * 8, "development");
  }
  for (let i = 1; i <= 3; i += 1) {
    await doneBounty(pg, `md${i}`, AS, B, i * 3, "design");
  }
  const { homePreview } = await import("../src/lib/marketplace/home-preview.server");
  const { marketRateFor, MARKET_RATE_MIN_SAMPLE } = await import("../src/lib/marketplace/reputation.server");
  const preview = await homePreview("bidthrone", "INR");
  assert.equal(preview.kind, "boards");
  const dev = preview.marketRates.find((r) => r.category === "development")!;
  const live = await marketRateFor(null, "development", "INR");
  assert.equal(dev.sampleSize, live.sampleSize, "same sample size as the /market-rates source");
  assert.equal(dev.sufficient, true);
  assert.equal(dev.medianMinor, live.medianMinor, "same median as the /market-rates source");
  assert.equal(dev.minMinor, live.minMinor);
  assert.equal(dev.maxMinor, live.maxMinor);
  const design = preview.marketRates.find((r) => r.category === "design")!;
  assert.equal(design.sampleSize, 3);
  assert.equal(design.sufficient, false);
  assert.equal(design.medianMinor, null, "no price below the threshold");
  assert.equal(MARKET_RATE_MIN_SAMPLE, 10);
  // The most-evidenced category leads the preview (real data order).
  assert.equal(preview.marketRates[0].category, "development");
});
