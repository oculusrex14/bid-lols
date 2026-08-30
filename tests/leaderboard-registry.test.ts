import { test } from "node:test";
import assert from "node:assert/strict";
import { getPglite } from "../src/lib/db.server";
import {
  BOARD_REGISTRY,
  BOARD_KEYS,
  boardSpec,
  HOME_PREVIEW_BOARDS,
} from "../src/lib/marketplace/leaderboard-registry";

/**
 * RC5 §5.5: one leaderboard registry. These invariants keep the registry
 * the single source of board identity: no duplicate arrays, no unknown
 * keys, and the family/role split that separates the personal Bid Index
 * boards from the reliability-pillar board.
 */

test("registry keys are unique and the derived list matches", () => {
  const keys = BOARD_REGISTRY.map((b) => b.key);
  assert.equal(new Set(keys).size, keys.length, "no duplicate board keys");
  assert.deepEqual([...BOARD_KEYS].sort(), [...keys].sort(), "BOARD_KEYS derives from the registry");
});

test("every board has a title, metric floor, explanation, and a working formatter", () => {
  for (const b of BOARD_REGISTRY) {
    assert.ok(b.title.length > 0, `${b.key}: title`);
    assert.ok(b.minimumEvidence.length > 0, `${b.key}: minimumEvidence`);
    assert.ok(b.explanation.length > 0, `${b.key}: explanation`);
    assert.equal(typeof b.format(42, 7), "string", `${b.key}: format`);
  }
});

test("Most Reliable is the RELIABILITY pillar board, not a 300-900 board", () => {
  const mr = boardSpec("most_reliable")!;
  assert.equal(mr.family, "reliability");
  assert.equal(mr.role, "PROVIDER");
  // The formatter reads a 0..1 pillar: a 300-900 number would be absurd.
  assert.ok(/Reliability 92%/.test(mr.format(0.92, 8)), "metric reads as a percentage + outcomes");
  assert.ok(!mr.format(0.92, 8).includes("Bid Index"), "never labelled as a Bid Index number");
});

test("the Bid Index boards stay the personal 300-900 model", () => {
  for (const key of ["highest_bid_index", "top_providers_bid_index", "top_sponsors_bid_index", "top_captains_bid_index"]) {
    const b = boardSpec(key)!;
    assert.equal(b.family, "bidindex", `${key}`);
    assert.ok(b.role, `${key} has a role (overall or a single role)`);
    assert.ok(b.format(742, 9).startsWith("Bid Index 742"), `${key} formats the personal score`);
  }
  assert.equal(boardSpec("highest_bid_index")!.role, "OVERALL");
  assert.equal(boardSpec("top_providers_bid_index")!.role, "PROVIDER");
});

test("fact boards are family=facts with no trust role attached", () => {
  for (const key of ["most_experience", "most_wins", "most_complete", "top_captains", "top_sponsors", "most_quality", "rising"]) {
    const b = boardSpec(key)!;
    assert.equal(b.family, "facts", `${key}`);
    assert.equal(b.role, undefined, `${key}`);
  }
});

test("unknown keys resolve to undefined (never guessed)", () => {
  assert.equal(boardSpec("definitely_not_a_board"), undefined);
});

test("home preview boards are all real registry keys", () => {
  for (const key of HOME_PREVIEW_BOARDS) {
    assert.ok(boardSpec(key), `home preview board ${key} exists in the registry`);
  }
});

test("server dispatch + validator agree with the registry (no second array)", async () => {
  const { leaderboard } = await import("../src/lib/marketplace/reputation.server");
  const pg = await getPglite();
  // Seed one verified completion so a fact board has a real row; unknown
  // boards must throw (the validator and the dispatch both refuse).
  await pg.query(
    `insert into users (id, email, email_verified, display_name, status)
     values ('usr_lb_reg','lbreg@t',true,'LB Reg','active')
     on conflict (id) do nothing`,
  );
  await pg.query(
    `insert into profiles (user_id, handle) values ('usr_lb_reg','lbreg')
     on conflict (user_id) do nothing`,
  );
  await pg.query(
    `delete from bounty_awards where id = 'awd_lb_reg'`,
  );
  await pg.query(
    `delete from bounties where id = 'bnt_lb_reg'`,
  );
  await pg.query(
    `insert into bounties (id, product, sponsor_user_id, title, slug, description, category,
        reward_total_minor, reward_structure, reward_allocations, submission_deadline, status,
        published_at, completed_at)
     values ('bnt_lb_reg','foundersbid','usr_lb_reg','LB registry bounty','lb-registry',
       'A funded bounty used to verify the leaderboard registry dispatch.','development',
       1000000,'WINNER_TAKES_ALL','[{"place":1,"amount_minor":1000000}]'::jsonb,
       now()+interval '1 day','COMPLETED',now()-interval '10 days',now())
     on conflict (id) do nothing`,
  );
  await pg.query(
    `insert into bounty_awards (id, bounty_id, user_id, place, amount_minor, currency, status)
     values ('awd_lb_reg','bnt_lb_reg','usr_lb_reg',1,1000000,'INR','SETTLED')
     on conflict (id) do nothing`,
  );
  const wins = await leaderboard("most_wins", 5, 1);
  assert.ok(wins.some((r) => r.handle === "lbreg"), "the fact board reads real data");
  await assert.rejects(
    () => leaderboard("definitely_not_a_board" as "most_wins", 5),
    /unknown leaderboard board/,
    "an unregistered board key throws instead of guessing",
  );
});

test("RC5.1 WS3: Most Reliable copy is Bayesian wording, never a literal share", () => {
  const mr = boardSpec("most_reliable")!;
  assert.ok(/Bayesian/i.test(mr.explanation), "names the pillar as a Bayesian estimate");
  assert.ok(/not the literal percentage of jobs completed clean/i.test(mr.explanation), "explicitly disclaims the literal-share reading");
  assert.ok(!/share of .*verified.*clean|evidence ratio/i.test(mr.explanation), "no literal-share / evidence-ratio wording remains");
  // The row format stays the accepted short form (the word is "Reliability",
  // not "% jobs completed").
  assert.equal(mr.format(0.92, 8), "Reliability 92% · 8 verified outcomes");
});
