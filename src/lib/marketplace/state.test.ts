/**
 * RC3, S-7.1: the graveyard status regression suite.
 *
 * Before the fix, /graveyard/:id projected `screenshots` but NOT `status`
 * while the row type claimed both — so at runtime `listing.status` was
 * `undefined` and every status-dependent control (publish, withdraw,
 * mark-transferred, buyer offer box, offer accept/reject) silently stopped
 * rendering. These tests fail on the old query.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.PAYMENT_PROVIDER = "fake";

const { getGraveyardDetail, createListing, publishListing } = await import("./graveyard.server");
const { getSql } = await import("@/lib/db.server");
const { statusLabel } = await import("./status-labels");
const { GRAVEYARD_LISTING_TRANSITIONS, canTransition, graveyardControls } = await import("./state");

async function freshSeller(): Promise<string> {
  const sql = await getSql();
  const id = `usr_gy_test_${Math.random().toString(36).slice(2, 10)}`;
  await sql.query("insert into users (id, email, display_name) values ($1, $2, $3)", [
    id,
    `${id}@test.local`,
    "GY Seller",
  ]);
  return id;
}

test("GRAVEYARD_LISTING_TRANSITIONS is pinned (no silent rule drift)", () => {
  assert.deepEqual(GRAVEYARD_LISTING_TRANSITIONS, {
    DRAFT: ["LISTED", "WITHDRAWN"],
    LISTED: ["UNDER_OFFER", "TRANSFERRED", "WITHDRAWN"],
    UNDER_OFFER: ["TRANSFERRED"],
    TRANSFERRED: [],
    WITHDRAWN: [],
  });
  assert.equal(canTransition(GRAVEYARD_LISTING_TRANSITIONS, "DRAFT", "LISTED"), true);
  assert.equal(canTransition(GRAVEYARD_LISTING_TRANSITIONS, "LISTED", "DRAFT"), false);
  assert.equal(canTransition(GRAVEYARD_LISTING_TRANSITIONS, "WITHDRAWN", "LISTED"), false);
});

test("getGraveyardDetail: a real DB row carries its status (the regression)", async () => {
  const sellerId = await freshSeller();
  const { id } = await createListing({
    sellerUserId: sellerId,
    product: "foundersbid",
    title: "Abandoned SaaS billing service, needs a new owner",
    description:
      "A small billing service with an active customer base, paused when the team ran out of runway. Code, deploy pipeline and DNS included.",
  });
  const row = await getGraveyardDetail(id);
  assert.ok(row, "detail row loads for a real listing");
  assert.equal(row.status, "DRAFT", "status is selected from the DB — not undefined");
  assert.equal(row.id, id);
  assert.equal(row.seller_user_id, sellerId);
  assert.equal(await getGraveyardDetail("gyl_missing_missing"), null);
});

test("graveyardControls: full status x role matrix matches the engine guards", async () => {
  const sellerId = await freshSeller();
  const { id } = await createListing({
    sellerUserId: sellerId,
    product: "foundersbid",
    title: "Paused dev-tool marketing site with traffic",
    description: "Marketing site for a developer tool, paused. Traffic, content and domain included.",
  });
  await publishListing({ listingId: id, sellerUserId: sellerId });

  const listed = await getGraveyardDetail(id);
  assert.equal(listed?.status, "LISTED");

  // Seller on DRAFT: publish yes, withdraw yes, transfer no, decide no.
  const draft = graveyardControls({ status: "DRAFT", isSeller: true, viewerOfferStatus: null });
  assert.deepEqual(
    [draft.canPublish, draft.canWithdraw, draft.canMarkTransferred, draft.canDecideOffers],
    [true, true, false, false],
  );

  // Seller on LISTED: withdraw yes, publish/transfer no; decides once offers exist.
  const listedSeller = graveyardControls({ status: "LISTED", isSeller: true, viewerOfferStatus: null });
  assert.deepEqual(
    [listedSeller.canPublish, listedSeller.canWithdraw, listedSeller.canMarkTransferred, listedSeller.canDecideOffers],
    [false, true, false, true],
  );

  // Seller on UNDER_OFFER: mark transferred, no withdraw (engine refuses it).
  const offerSeller = graveyardControls({ status: "UNDER_OFFER", isSeller: true, viewerOfferStatus: null });
  assert.equal(offerSeller.canMarkTransferred, true);
  assert.equal(offerSeller.canWithdraw, false, "UI never offers what the engine refuses");

  // Terminal states: nothing actionable.
  for (const s of ["TRANSFERRED", "WITHDRAWN"]) {
    const c = graveyardControls({ status: s, isSeller: true, viewerOfferStatus: null });
    assert.deepEqual(c, {
      canPublish: false,
      canMarkTransferred: false,
      canWithdraw: false,
      canOffer: false,
      canRetractOffer: false,
      canDecideOffers: false,
    });
  }

  // Buyer: offers only on LISTED and only without a live offer.
  assert.equal(graveyardControls({ status: "LISTED", isSeller: false, viewerOfferStatus: null }).canOffer, true);
  assert.equal(graveyardControls({ status: "UNDER_OFFER", isSeller: false, viewerOfferStatus: null }).canOffer, false);
  assert.equal(graveyardControls({ status: "LISTED", isSeller: false, viewerOfferStatus: "PENDING" }).canOffer, false);
  assert.equal(graveyardControls({ status: "LISTED", isSeller: false, viewerOfferStatus: "PENDING" }).canRetractOffer, true);
  assert.equal(graveyardControls({ status: "LISTED", isSeller: false, viewerOfferStatus: "ACCEPTED" }).canRetractOffer, false);

  // The old bug shape: status `undefined` must disable everything.
  const broken = graveyardControls({ status: undefined as never, isSeller: true, viewerOfferStatus: null });
  assert.deepEqual(
    Object.values(broken),
    [false, false, false, false, false, false],
  );
});

test("statusLabel: known, unknown and empty values", () => {
  assert.equal(statusLabel("DRAFT"), "Draft");
  assert.equal(statusLabel("UNDER_OFFER"), "Under offer");
  assert.equal(statusLabel("OPEN_FOR_PROPOSALS"), "Open for proposals");
  assert.equal(statusLabel("SOME_NEW_STATE"), "Some New State");
  assert.equal(statusLabel(null), "Unknown");
  assert.equal(statusLabel(""), "Unknown");
});
