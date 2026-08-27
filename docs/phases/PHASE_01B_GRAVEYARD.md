# PHASE_01B_GRAVEYARD.md — FoundersBid Startup Graveyard

**Status:** ACTIVE (specified 2026-08-27, autonomous execution authorized). Secondary feature behind the main marketplace; ships only to the degree payment/transfer infrastructure safely permits.

## Objective

`/graveyard` (on `foundersbid.lol`): buy/sell abandoned digital startup assets — a listing + offer workflow, clearly secondary to the marketplace. Asset transfer remains controlled by humans; nothing here auto-exposes credentials, customer data, or domains.

## User roles

| Role | Powers |
|---|---|
| visitor | browse listings |
| member (seller) | create a graveyard listing, review offers, accept/reject, mark transferred |
| member (buyer) | submit an offer with amount + terms note; retract offer |
| admin | moderate listings, resolve transfer disputes (audited) |

## Functional requirements

- **FR-1 Listing**: project name, description, reason of death, what is included (checkboxes: code repository, domain, design files, brand assets, documentation, social handles where transferable, documentation, user base where legally transferable, other product assets), technology, screenshots (external https URLs), known liabilities, revenue/user history if any (self-declared, labelled self-reported), transfer checklist, reserve/minimum amount (optional). Price in INR minor units. Status: `DRAFT → LISTED → UNDER_OFFER → TRANSFERRED | WITHDRAWN`.
- **FR-2 Safety constraints**: NEVER expose API secrets, tokens, private credentials, or customer personal data — listing text must not include them (seller attests; admin can remove listings, audited). No "one-click domain auth-code exposure": domain auth codes are exchanged only directly between buyer and seller through their registrar, never through the platform.
- **FR-3 Offers**: members submit offers (amount + note) on LISTED assets; seller accepts/rejects; an accepted offer moves the listing UNDER_OFFER. **Payment/escrow is NOT built** (no safe settlement rail): an accepted offer creates a recorded offer commitment, and the listing shows honestly that the transaction is handled directly between the parties (off-platform) — the platform takes NO money and reports NO fabricated payment status. Transfer completes when the seller marks it TRANSFERRED (with a checklist confirmation).
- **FR-4 Fee**: 10% successful-acquisition fee is CONFIGURED but NOT CHARGED while no payment rail exists (`GRAVEYARD_FEE_BPS` in money.ts-style config; charged only when a transaction rail exists).
- **FR-5 SEO**: listed assets are indexable product content; withdrawn/transferred ones stay crawlable but marked; no fabricated activity anywhere. Empty states honest.

## Routes

`/graveyard` (list) · `/graveyard/new` (seller form) · `/graveyard/:id` (detail + offers + checklist).

## Data model (migration 0015, additive)

- `graveyard_listings` (gyl_): id, product ('foundersbid'), seller_user_id, title, slug, description, reason_of_death, includes jsonb (list), technology jsonb, screenshots jsonb (https URLs), liabilities, history_self_reported text, transfer_checklist jsonb (string items, checkable), reserve_minor bigint null, currency char(3), status check('DRAFT','LISTED','UNDER_OFFER','TRANSFERRED','WITHDRAWN'), created_at, updated_at.
- `graveyard_offers` (gyo_): id, listing_id FK, buyer_user_id FK, amount_minor, message, status ('PENDING','ACCEPTED','REJECTED','WITHDRAWN'), created_at, decided_at. Unique active offer per buyer per listing.

## State machines

Listing: `DRAFT → LISTED → UNDER_OFFER → TRANSFERRED | WITHDRAWN`; `LISTED → WITHDRAWN`. Offer: `PENDING → ACCEPTED | REJECTED | WITHDRAWN`. Accepting a new offer while UNDER_OFFER requires the seller to reject the previous accepted offer first (one accepted offer at a time).

## Permissions matrix

| Action | visitor | seller(own) | buyer | admin |
|---|---|---|---|---|
| browse | ✓ | ✓ | ✓ | ✓ |
| create listing | ✗ | ✓ | ✓ | ✗ |
| publish listing | ✗ | ✓(own) | ✗ | ✓(audited) |
| offer | ✗ | ✗(own listing) | ✓ | ✗ |
| accept/reject offer | ✗ | ✓(own) | ✗ | ✗ |
| mark transferred | ✗ | ✓(own) | ✗ | ✓(audited) |

## Security

IDOR (owner checks on all mutations), offers bound to signed-in users only, XSS-safe rendering of user text, parameterized SQL, https-only screenshot URLs, rate limiting on offer submission (in-memory best-effort, consistent with waitlist), audit on admin actions, no secrets in listing text (advisory stripping of obvious token patterns; the seller attests to liabilities).

## Analytics

`graveyard_listing_viewed`, `graveyard_offer_submitted`, `graveyard_accepted` — internal only (00.6 rule).

## Out of scope (until a safe transaction path exists)

Payment handling, escrow claims (rule 9), domain-auth-code automation, file uploads, revenue verification.

## Acceptance criteria

| # | Criterion | Check |
|---|---|---|
| AC-1 | seller creates + publishes listing; public page renders | integration + browser |
| AC-2 | buyer offers; seller accepts → UNDER_OFFER; second offer can't be accepted meanwhile | integration |
| AC-3 | seller marks transferred with checklist attestation | integration |
| AC-4 | offer retractable; rejected buyer can't re-offer until withdrawal | integration |
| AC-5 | no secrets in listing text (attest + advisory strip of obvious API-key shapes) | unit |
| AC-6 | SEO: LISTED indexable, withdrawn/transferred no-changes, private none | curl |
| AC-7 | typecheck/lint/test/build green; E2E happy path | CI |

## Migration plan / rollback

0014→0015_graveyard.sql additive; rollback = redeploy previous SHA (additive schema safe).