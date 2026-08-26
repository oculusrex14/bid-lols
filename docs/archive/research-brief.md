> **DEPRECATED — archived in Phase 00 (2026-08-26).** Legacy product research / ops
> record; NOT authoritative. Active product definition: `docs/00_PRODUCT.md`.

# Research Brief — Freemium Ranking System (superseding Bidception)

Date: 2026-07-25 · Run: autonomous overnight build

> Sourcing note: live web search was unavailable in this run (search API key
> missing). Evidence below combines (a) fetched reference extracts (Wikipedia
> REST API summaries for *Freemium*, *Prediction market*, *Gamification*,
> *Pay-to-play*) and (b) well-established product/growth knowledge, flagged as
> [prior knowledge]. Where a claim is inference rather than cited, it is labeled.

## 1. Why people pay to rank

- **Status + scarcity.** Pay-to-rank (Wikipedia: "pay-to-play": money exchanged
  for the privilege to participate) works because a ranked position is a
  *scarcity signal* — slot #1 on a finite board is visible proof. Existing
  boards (this product, SEO-era pay-to-rank directories) convert on exactly
  this: "highest total bid stands first."
- **Discovery / leads.** Directory-style boards (Clutch-style rankings, "hire
  me" boards, agency directories) convert because buyers of attention look
  there first; the buyer-side value is discovery, the seller-side value is
  status + clicks. [prior knowledge]
- **Trust transfer.** Public, tamper-evident ranking (no editorial slots, no
  free rank — as in our SPEC) is the moat: "no algorithm, no free rank" is a
  trust claim competitors can't make.

## 2. Game mechanics that drive retention (from fetched sources + prior knowledge)

- **Gamification** (Wikipedia): integrating game design (points, rewards,
  competitive status) into non-game contexts increases engagement. Documented
  use cases include knowledge retention, icebreakers, and public
  self-marketing contexts.
- **Streaks / daily loops.** Duolingo (fetched summary) builds retention on
  *short daily lessons + points + rewards*; streaks are its flagship retention
  mechanic [prior knowledge]. A daily-resettable, one-minute interaction is the
  proven shape.
- **Prediction markets** (Wikipedia): "open markets that enable the prediction
  of specific outcomes." Polymarket's traction (fetched summary) shows people
  return daily to predict outcomes on *boards of known entities* — and
  prediction is social: people share "I called it" moments. Prediction on a
  *known, changing* leaderboard is the perfect substrate: our boards mutate
  when anyone bids, so the daily question "who will hold rank #1 tomorrow?" is
  always live.
- **King-of-the-hill** [prior knowledge]: visible, contestable territory
  (crown, throne, top slot) with visible change creates spectatorship —
  people return to see if the hill was stolen.

## 3. What's trending (2025–2026, as observed)

- Micro-prediction markets (Polymarket-style) normalized betting on
  non-financial outcomes without accounts/low entry — but *no real money on
  the user side* is a differentiator for a low-stakes marketing product
  (no gambling compliance, no KYC).
- "Proof" content and founder-branding are hot: foundersbid-style "prove it in
  public" boards ride this.
- AI-slop-era attention: simple, verifiable, single-mechanic products that
  are *actually playable* stand out vs. chatbot wrappers.

## 4. Current bidception weaknesses (read from SPEC.md + shipped code)

1. **One-shot economics.** A bid is paid once; revenue = new listings +
   re-bids/swaps. No recurring surface, no reason for a *viewer* (non-payer)
   to return — the free audience has nothing to do but scroll and click out.
2. **No loop for non-payers.** The audience (everyone) gets zero value from
   watching except passive ranking. No identity, no streak, no points.
3. **No social/viral artifact.** Nothing on the board is share-worthy beyond
   "look, I bought #1." No personal scoreboard, no "I predicted it" moment.
4. **Hype counters are fake-ish** (display-only scaling) — fine for FOMO, but
   they're one-directional decoration; they don't create a *user-side* reason
   to come back.
5. **Bidception's positioning is passive** ("find where else to spend budget")
   — it's a directory. A game on top of the same board flips it into an
   arena, which is what gets shared.

## 5. Design implications for the new layer

- The new system must **add a free daily loop** (return visit without paying),
  keep the existing pay-to-rank board fully intact (no regressions), and
  monetize through the **existing Cashfree path** (no second payment rail).
- Identity must be **accountless** (auth OFF per SPEC §6): device-scoped
  token + chosen display handle, unowned rows, no PII.
- The game must survive **empty boards** (boards were wiped for launch; PGLite
  preview starts empty) with a clean empty state.
- Settlement must be **lazy & idempotent** (no cron on Vercel serverless):
  settle closed rounds on read.
