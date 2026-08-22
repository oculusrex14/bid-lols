# bidthrone.lol — Product specification

**Status:** shipped in this workspace (demo-quality, Cashfree sandbox in preview).  
**Updated:** 22 August 2026  
**In-app copy:** `/spec`

The umbrella site is **https://bidthrone.lol/**. Two sibling pay-to-rank boards share one app, one database, one payment path:

| Board | Domain (brand) | Route | Who lists |
|---|---|---|---|
| Foundersbid | foundersbid.lol | `/founders` | Founding-team pages, about pages, studio / personal founder URLs |
| Bidception | bidception.lol | `/bidception` | Outbid clones, `.lol` bid sites, other pay-to-rank boards |

Taglines:

- Foundersbid: *Pay to prove the founding team. Build trust. Rank higher.*
- Bidception: *The leaderboard of leaderboards. Outbid the bids.*

---

## 1. Temporary Hype System (views and visits only)

**Shipped.** Display-only multiplier for **site-level total views** and **visits today**. Never used for live/concurrent viewers. **Never changes rank.**

### Rules

| Rule | Implementation |
|---|---|
| Start at 6× on day 1 | `hypeMultiplier`: elapsed full days = 0 → 6 |
| Linear drop every 24 hours | `6 - 5 * (floor(hours/24) / 21)` |
| Exactly 1× after 21 days | elapsed days ≥ 21 → 1 |
| Real daily visits ≥ 8,000 | `hype_locked = true` forever, multiplier 1× |
| Display | “X visits today” and “Y total views” |
| Storage | Real integers in `site_stats`. Only the painted number is multiplied |
| Labels | Neutral. No “live viewers”, no “people online” |

Worked values (day 1, unlocked):

- multiplier = 6
- real 412 visits today → **2,472 visits today**
- real 28,400 views → **170,400 total views**

Day 11 (elapsed 10 days): `6 - 5*(10/21) ≈ 3.619×`.  
Day 22: 1×.

### What is a view vs a visit

- **View:** one page impression of the portal (counts both boards once per session), a board, a listing, or the activity tape. Stored in `site_stats.views`. Not counted on poll refetches. Deduped per browser session.
- **Visit:** outbound click (“Visit page” / “Open board”). Increments `listings.clicks` (real, shown on the row) **and** `site_stats.visits` + `visits_today` (real; **displayed** total is multiplied).

### What it is not

- Not concurrent viewers.
- Not a rank signal.
- Per-listing click numbers on a row are **real**, not hyped.
- No IPs or unique-visitor de-dupe.

---

## 2. Product rules (shared)

Pure pay-to-rank. Highest **total bid** stands first. Rank `01` is first.

- Minimum bid **$5**. **Whole US dollars only** (stored as integer cents, always `n * 100`).
- Re-bid on the **same URL** (same `url_key` on the same board) charges **only the difference**. New total must **strictly beat** the current total.
- Ties: `bid_cents DESC`, then `last_bid_at ASC` (whoever reached the amount first), then `id ASC`.
- No accounts, passwords, or logins. Ownership is a **secret manage URL** issued at first paid bid (`/founders/manage/$token` or `/bidception/manage/$token`).
- No editorial slots. No burying a higher bid. No free rank.
- **No refunds** after Cashfree marks an order paid.
- Real-time enough: board, listing, and activity refetch every **3–5 seconds**.
- Auth is **OFF**. Database is **ON**. Rows are unowned (no `user_id`).

### URL identity

A listing is unique per board by `url_key`:

1. Require `http` or `https` (bare hosts get `https://`).
2. Lowercase hostname; strip leading `www.`.
3. Drop hash; drop trailing slash on pathname (except `/`).
4. Keep query string.
5. Key = `host + path + search` (lowercase).

Re-bidding the same key updates the existing row. A different key is a new listing.

---

## 3. Dual identity

One TanStack Start app. `$site` is `founders` | `bidception`. Unknown `$site` redirects to `/`.

| | Foundersbid | Bidception |
|---|---|---|
| Wordmark | `foundersbid` (Newsreader italic) | `bidception` (Syne) |
| Kicker | Portfolios · about pages · founding teams | Outbid clones · .lol domains · bid platforms |
| Extra field | Founding team (names, public) | What it is (short public note) |
| Primary CTA | Bid the team | Outbid the bids |
| Visit CTA | Visit page | Open board |
| Empty board | “No founding teams on the board yet. Five dollars puts you first.” | “No bid sites listed. Five dollars crowns the first meta leader.” |
| Empty tape | “Quiet. The next bid for a founding team lands here.” | “No movement. A clone will blink first.” |
| Masthead | “Vol. 01 · The founding record” + italic tagline | Geometric wordmark, no letterhead |
| Contact | contact@foundersbid.lol | contact@bidception.lol |

Copy, fonts, and tokens switch via `data-theme={site}`. Logic does not.

---

## 4. Tiered Swap Link system

A swap **only changes the destination URL**. Bid, rank, and click count stay. Eligibility is re-checked at **payment time** (rank can move while checkout is open). A swap cannot steal a `url_key` already held on that board.

Fee is always the **full** rate of the current bid. Never the difference between rates.

1. Base rate from current bid: under $100 → 10%; $100–$999 → 15%; $1,000–$4,999 → 20%; $5,000+ → 25%.
2. Top 50: 1st swap base, 2nd **35%**, 3rd **50%**, 4th+ blocked.
3. Rank 51+: base rate, unlimited.
4. Round to whole dollars, clamp **$10–$2,500**.

$1,000 Top 50: $200 / $350 / $500. $80 Top 50: $10 / $28 / $40.

---

## 5. Page map

| Route | Purpose |
|---|---|
| `/` | **bidthrone.lol** portal split. Left foundersbid, right bidception. Top 3, pool, visits today, total views. |
| `/spec` | In-app product contract. |
| `/$site` | Leaderboard + stats (including visits today / total views). |
| `/$site/rules` | Public rulebook + swap fee preview. |
| `/$site/activity` | Full live tape. |
| `/$site/bid` | New listing or re-bid. |
| `/$site/checkout/$orderId` | Cashfree sandbox. |
| `/$site/manage/$token` | Secret control. |
| `/$site/listing/$id` | Public detail. |
| `/$site/terms` `privacy` `refund` `contact` | Cashfree legal. No refunds. contact@foundersbid.lol |
| `POST /api/webhooks/cashfree` | Settle paid orders. |

---

## 6. Database additions for hype

```sql
site_stats (
  site text pk,                 -- founders | bidception
  views bigint,                 -- real total page views
  visits bigint,                -- real total outbound visits
  visits_today bigint,          -- real visits since visits_day
  visits_day date,              -- rolls over; resets visits_today
  launched_at timestamptz,      -- day 1 of the 21-day curve
  hype_locked boolean           -- latched at 8,000 real daily visits
)
```

Listings, orders, and activity are unchanged from the original boards schema (`migrations/0002_boards.sql`). Hype is `migrations/0003_hype.sql`. Founder socials are `migrations/0004_socials.sql` (`listings.socials jsonb`, max 5 URLs).

---

## 7. Payments, ranking, legal, UI

Unchanged from the shipped product: Cashfree, $5 whole-dollar bids, re-bid = difference, manage links, no refunds, light/dark appearance bar, foundersbid letterhead, Newsreader / Syne / Outfit.

Auth **OFF**. Database **ON**. Unowned rows.

Math: `src/lib/hype.ts`. Tracking: `trackView`, `trackClick` in `src/lib/board-fns.ts`.

---

## 8. Conversion box, favicons, founding-team socials

### Conversion box

On both boards, above the ranking:

- Headline: **Claim #1** (foundersbid) / **Outbid the leader** (bidception)
- Live price to take #1: current leader dollars + 1, or $5 if the board is empty
- **+/− stepper** on that price (whole dollars, floor $5). The number is also typeable.
- If the bid is at or below the leader: warning that rank follows the bid and they will sit below #1. Equal bids lose to whoever reached the amount first.
- URL field + primary **Bid now**
- Helper: `$5 minimum · Whole dollars · Re-bids only pay the difference`
- Submits to `/$site/bid` with the URL and the take-#1 amount prefilled

### Favicons

Every listing row, detail page, manage page, and portal top-3 shows the submitted URL’s favicon. If it fails, a letter monogram from the title.

### Foundersbid people-first

- Public headline is the **founding team names**, italic Newsreader. Company name and host sit secondary.
- Up to **5 founder socials** (X, LinkedIn, personal site) as icon links on the board, detail, and manage pages.
- Bid form field order: company name → page URL → one-line proof → founding team names (required) → up to 5 socials → bid amount.
- Bidception is unchanged: board name remains the headline; no social row.