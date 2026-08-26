# Idea ranking

Rubric (1–10 each; "build cost" is inverse — 10 = cheapest/smallest surface):

| # | Idea | Traction | Fun / innovation | Monetization | Build cost (inv) | Product fit | **Total** |
|---|------|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **The Crown** — daily #1 prediction + public oracle leaderboard + paid Oracle Pass | 8 | 9 | 7 | 5 | 9 | **38** |
| 2 | Burn / Boost — decaying paid boost on listings | 7 | 5 | 9 | 7 | 9 | **37** |
| 3 | King-of-the-hill duels (60s click battles for rank 1) | 7 | 9 | 5 | 4 | 8 | 33 |
| 4 | Sponsored Spotlight — rotating paid slot above the board | 5 | 3 | 8 | 7 | 8 | 31 |
| 5 | Bidder streaks & leagues (Bronze→Gold tiers on rows) | 5 | 6 | 4 | 6 | 6 | 27 |
| 6 | Bid Royale — weekly 8-place vote-off bracket | 7 | 9 | 5 | 3 | 7 | 31 |

## Winner: The Crown

**Why:**

1. **Freemium shape is clean.** The free tier (one crown pick per board per day,
   public leaderboard, streaks) is a complete, standalone, daily-return product
   that needs no account and no spend. The paid tier (Oracle Pass, $5/7 days,
   Cashfree) is a real, clearly-priced upgrade: 5 picks instead of 1, 5× points,
   live crowd-odds %, ORACLE badge. Not a paywall troll — the free game is the
   game.
2. **Recurring revenue.** The pass is a 7-day duration bought on the existing
   Cashfree rail; holders re-buy weekly. `crown_passes.expires_at` makes
   entitlement time-bounded, which is what makes it a subscription-like
   recurring stream rather than a one-shot bid.
3. **It out-shines bidception specifically.** Bidception today is a static
   table: look, scroll, leave. The Crown turns the *same* board into a daily
   event with a winner, a losing moment, a streak, and a public leaderboard of
   predictors — a ranking of the rankers, which is the natural meta-layer a
   pay-to-rank board is missing. The board's existing "highest bid stands
   first" rule becomes the game's settlement rule: zero new ranking machinery,
   zero editorial interference, same trust story.
4. **Viral surface.** Every settled round produces a shareable outcome
   ("I called the crown on foundersbid — 3 in a row"), and the oracle
   leaderboard is inherently linkable (handles, streaks, badges). Prediction on
   a public board is a proven engagement loop (Polymarket-style), but with no
   real money at risk on the user side — no gambling surface, no KYC.
5. **Risk profile fits the stack.** No cron: settlement is lazy, idempotent,
   and runs on read (serverless-safe). No accounts (auth stays OFF per SPEC
   §6): identity is a device token + display handle in localStorage over
   unowned rows. Money path reuses the exact existing Cashfree order →
   webhook → confirm flow; only a new order `kind` is added.

**Why not the others:**
- *Burn/Boost (37)* is the strong runner-up: best monetization per hour, but
  it only monetizes *sellers* and adds no free-audience loop — the weakest
  freemium "free" tier of the set.
- *Duels* are more fun but need an hourly pairing/settlement loop and per-duel
  anti-abuse — the highest build risk on a serverless stack.
- *Spotlight* is just an ad slot — fails "fun" and doesn't supersede
  bidception, it ad-dresses it.
- *Leagues* only reward the people who already pay; *Brackets* have the
  largest state machine (7 rounds of seeding/voting/results) for the same
  novelty the Crown gets daily.

Tie-break rule (within one point → cheaper) is not needed: 38 vs 37 is not
within a point on total, and Crown's edge is on the dimensions the mission
weights (traction + innovation + freemium fit), not on build cost.
