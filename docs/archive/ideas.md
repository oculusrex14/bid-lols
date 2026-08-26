> **DEPRECATED — archived in Phase 00 (2026-08-26).** Legacy product research / ops
> record; NOT authoritative. Active product definition: `docs/00_PRODUCT.md`.

# Ideas — freemium ranking layer

Five concrete candidates, all built on the existing three boards
(founders / culture / bidception). Every idea: free tier usable on its own,
real Cashfree paid tier, a viral hook, honest build cost.

Accountless identity for all of them: device token (`crypto.getRandomValues`)
+ optional display handle in `localStorage` → unowned rows, per SPEC §6.

---

## 1. The Crown — daily "who holds #1 tomorrow?" prediction game

- **Mechanic.** Every UTC day each board runs a "Crown round." The current #1
  listing holds the crown; it settles at midnight UTC against whoever actually
  holds rank #1 at that moment. Visitors pick a listing (or "the crown holds")
  before close. Winner of the round gets points; a streak of correct calls
  climbs a public **Oracle leaderboard** — a ranking *of the rankers*, the
  meta-board bidception never had.
- **Free tier.** One pick per round, per board, per browser — no account, no
  email. See the live crown holder, your pick, your points/streak, and the
  top-10 Oracle leaderboard. Genuinely useful+fun with zero spend: it turns
  the board from a static table into a daily event.
- **Paid tier (Cashfree INR, existing rail).** *Oracle Pass*, $5 / 7 days per
  board: 5 picks per round (hedging), 5× points on wins, live crowd-odds
  bars, "ORACLE" badge on the leaderboard, your row pinned in your own
  leaderboard view. Re-purchase to extend → recurring-ish revenue.
- **Viral hook.** A "crowned" share card ("I called the crown on
  foundersbid — 4 in a row") + a shareable public leaderboard where every
  handle is a person, not a company. Predictors are the board's new
  influencers; every correct call is a screenshot.
- **Build cost:** ~8–10 h. Migration (predictions, scores, passes), lazy
  settlement in the read path, 1 new page, nav + board CTA, order kind
  `oracle` on the existing Cashfree flow.

## 2. Burn / Boost — decaying paid boost

- **Mechanic.** Listing owners buy a 24 h "boost" that adds a decaying bonus to
  their effective bid (6 h full → linear to 0). Row gets a 🔥 badge +
  countdown. Rank recomputed at read time.
- **Free tier.** The board itself (already free); plus a one-time free 6 h
  "spark" boost for a brand-new listing's first day so new bidders see the
  mechanic.
- **Paid tier.** Boosts: 24 h / 72 h / 7 d packs, priced on the same
  Cashfree rail. Recurring by nature — the flame decays, owners re-buy to hold
  rank.
- **Viral hook.** The fire badge + "expires in 03:12:44" is inherently
  clicky; outbid-panic accelerates re-bidding.
- **Build cost:** ~6–8 h (effective-bid math in SQL at read time, boost rows,
  manage-page purchase, countdown UI).

## 3. King-of-the-Hill duels

- **Mechanic.** Every hour the #2 listing challenges the #1 in a 60-second
  click-duel; whoever has more "fights" when the timer ends takes the crown
  for that hour (display rank only, money rank unchanged).
- **Free tier.** Everyone taps a side — zero cost, one tap, mobile-first.
- **Paid tier.** Listing owners buy "armor" (negate one opponent duel) and
  "double-strike" tokens that weight their side's votes.
- **Viral hook.** "The crown is under attack — 41 s left" banner on the board
  + share link that lands mid-duel.
- **Build cost:** ~12–16 h (pairing scheduler, real-time vote endpoint,
  settlement, per-duel identity throttling, UI timer). Highest scope of the
  list; the hourly pairing loop is the risky part on serverless.

## 4. Sponsored Spotlight rotation

- **Mechanic.** A premium "spotlight" slot above the board, rotated weekly
  among whoever funds it that week. Clearly labeled "sponsored."
- **Free tier.** The board itself; the spotlight is just a richer row.
- **Paid tier.** $25/week spotlight, first-come-per-week, Cashfree.
- **Viral hook.** Weak. It's an ad slot, not a game.
- **Build cost:** ~4–6 h (smallest), but it's the least fun and the weakest
  "supersede" story — it's an ad product wearing a freemium costume.

## 5. Bidder streaks & leagues (Bronze→Gold tiers)

- **Mechanic.** Listing owners earn season points per bid/outbid/swap; tiers
  (Bronze/Silver/Gold) render as badges on the row and in the manage page.
- **Free tier.** Everyone on the board automatically gets a tier.
- **Paid tier.** "Elite" badge (custom color + leaderboard pin) via one-time
  $10, or 2× season points for a week.
- **Viral hook.** Tiers visible on every row → competitors outbid to keep
  their badge from looking lonely at rank 1.
- **Build cost:** ~6–8 h. But it only rewards *sellers*, so the free
  audience still has nothing to do; retention is weaker than a daily game.

## 6. Bid Royale — weekly bracket

- **Mechanic.** Every Sunday the top 8 listings face off in a single-elim
  bracket; visitors vote each matchup over the week; champion gets a week of
  "Champion" treatment (ribbon + portal callout).
- **Free tier.** Voting, watching the bracket, sharing results.
- **Paid tier.** "Seeding token" — if your listing missed the top 8, buy a
  bracket entry; plus champion-week placement.
- **Viral hook.** Brackets are the most shared format in sports; "we went 1–0
  against X" is a great social post for the listed companies.
- **Build cost:** ~10–14 h (bracket seeding, voting tallies, 7-round state
  machine, results history). More moving parts than the Crown.

## 7. (Honorable mention) "Ghost bid" — pay-to-keep-hidden rank

- **Mechanic.** Pay to hold a rank invisibly: your listing hides behind #3 and
  surfaces only when the #1/#2 bids expire. A stealth sniper.
- **Free tier:** none of its own — it's a pure paid trick, so it fails the
  "genuinely useful free tier" bar on its own. Listed for completeness.
- **Build cost:** ~4 h, but not a freemium system by itself.

---

Scoring and winner: see `docs/idea-ranking.md`.
