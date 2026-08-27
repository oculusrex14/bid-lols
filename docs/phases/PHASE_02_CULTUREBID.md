# PHASE_02_CULTUREBID.md — CultureBid creative bounty marketplace

**Status:** ACTIVE (specified 2026-08-27, autonomous execution authorized).
**Principle:** CultureBid REUSES the shared marketplace foundation (users, profiles, bounties engine, funding, submissions, disputes, reviews, notifications, audit, reputation events). No duplicate marketplace infrastructure is built merely because the brand differs.

## Objective

`culturebid.lol` (live surface: `www.culturebid.lol` until its apex DNS is fixed — external blocker) becomes the network's creative bounty marketplace. Brands fund creative briefs; creators compete under clear, published rules; verified wins create reputation.

## User roles

| Role | Powers |
|---|---|
| visitor | discover creative bounties, view creator profiles |
| brand (sponsor) | create + fund creative bounties, qualify, judge |
| creator | build a creative profile (formats, niches, platforms), apply, submit, win |
| admin | as FoundersBid (shared) |

## Functional requirements

- **FR-1 Product-aware marketplace routes**: `/bounties` and `/projects` on `www.culturebid.lol` serve CultureBid listings (product = `culturebid` via server-derived host). Marketplace hosts: foundersbid + culturebid; other hosts still 302 to foundersbid until their phase.
- **FR-2 Creative categories**: UGC, memes, video, photography, illustration, design, naming, writing, social content, music, brand challenges (product-scoped category suggestions; sponsors may also type custom ones).
- **FR-3 Fairness is a product feature**: every creative bounty page clearly shows — total funded reward, payout structure, approved participant count / cap, deadlines, judging rules, licensing/IP rules, required channels/formats, whether public posting is required, whether reach metrics matter. FoundersBid's bounty detail already renders funding state, structure, deadlines and IP rules; Phase 02 makes the creative-specific fields explicit at creation time (required channels/formats/reach expectations go in the description; IP rules remain mandatory copy).
- **FR-4 Qualification before work**: invite-only (via direct link, Phase 02 scope: application-only or sponsor approval), capped public, reputation-qualified (reputation-qualified gates activate in Phase 04 when scores exist). "100 creators work and one might get paid" without published prior rules is a product violation: every bounty MUST show its participant cap + rules before work begins.
- **FR-5 Creator profiles**: emphasize formats, niches, platforms, portfolio, previous wins, verified marketplace outcomes (from `verifiedOutcomeCounts`). Self-reported metrics (e.g. follower counts in bio) are treated as self-reported — the platform does not fabricate API integrations and does not verify reach unless an integration actually exists.
- **FR-6 Judging**: sponsor pick (shared with FoundersBid Mode A); winner/finalist payouts follow the exact advertised allocations (invariant enforced in the engine).

## Routes (culturebid host)

`/` (creative marketplace home — refreshed copy: live creative bounties + how it works + founding access) · `/bounties` `/bounties/:id` (creative bounties, product=culturebid) · shared: /signin /signup /dashboard /profile/:handle /settings/profile /admin.

## Data model

**No schema changes.** The Phase 01 marketplace primitives are product-scoped: `bounties.product = 'culturebid'`, profiles carry creator fields (skills/categories/portfolio links), reputation_events feed Phase 04. Culture-specific category lists are code-level constants.

## State machines / payments

Same engines as FoundersBid (state.ts, ledger.server.ts, payments provider). Funding stays flag-gated OFF in production until the payout rail lands.

## Security

Shared marketplace controls (authorization, CSRF, rate limits); no new surfaces beyond what Phase 01 already hardened.

## Analytics

`bounty_viewed` etc. carry entity ids scoped by product; internal only.

## SEO

Creative bounties on www.culturebid.lol are indexable product content (canonical to the culturebid host); sitemap includes live creative listings; home robots meta stays index,follow.

## Out of scope

Paid voting, gambling-style mechanics, reach-metric API integrations that don't exist, trend entertainment features (may follow later only per mission §CULTURAL/GROWTH FEATURES — after core stability, and never as gambling).

## Acceptance criteria

| # | Criterion | Check |
|---|---|---|
| AC-1 | culturebid /bounties serves culturebid-scoped listings (not foundersbid's) | integration |
| AC-2 | creative category constants used in the creation UI + filters | unit |
| AC-3 | fairness block renders on the creative bounty detail page | integration |
| AC-4 | creator profile shows verified outcome counts + reviews; self-reported label | integration |
| AC-5 | full gates green; release verified on www.culturebid.lol | CI + curl |