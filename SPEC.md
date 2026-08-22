# bidthrone.lol — Product specification

**Status:** shipped in this workspace (demo-quality, Cashfree sandbox in preview).  
**Updated:** 22 August 2026  
**In-app copy:** `/spec`

The umbrella site is **https://bidthrone.lol/**. Three sibling pay-to-rank boards share one app, one database, one payment path:

| Board | Domain (brand) | Route | Who lists |
|---|---|---|---|
| Foundersbid | foundersbid.lol | `/founders` | Founding-team pages, about pages, studio / personal founder URLs |
| Culturebid | culturebid.lol | `/culture` | Careers / culture / why-join-us pages |
| Bidception | bidception.lol | `/bidception` | Marketing platforms, directories, newsletter boards, visibility tools |

Taglines:

- Foundersbid: *Pay to prove the founding team. Build trust. Rank higher.*
- Culturebid: *Rank your culture. Attract the people who matter.*
- Bidception: *Find where else to spend your marketing budget.*

---

## 1. Site view / visit display scaling (internal)

Display-only scaling for **site-level total views** and **visits today**. Never used for live/concurrent viewers. **Never changes rank.** Not disclosed on public pages.

### Rules

| Rule | Implementation |
|---|---|
| Start up to 6× on day 1 | `hypeMultiplier`: per-board `hype_factor` in [1.2, 6] |
| Linear drop every 24 hours | steps down to 1× over 21 days |
| Exactly 1× after 21 days | elapsed days ≥ 21 → 1 |
| Real daily visits ≥ 8,000 | `hype_locked = true` forever, multiplier 1× |
| Storage | Real integers in `site_stats`. Only the painted number is scaled |
| Public copy | Neutral. No mention of scaling. Rank copy unchanged |

### What is a view vs a visit

- **View:** one page impression of the portal (counts all three boards once per session), a board, a listing, or the activity tape. Stored in `site_stats.views`. Not counted on poll refetches. Deduped per browser session.
- **Visit:** outbound click (“Visit page” / “Open board”). Increments `listings.clicks` (real, shown on the row) **and** `site_stats.visits` + `visits_today` (real; **displayed** total may be scaled).

### What it is not

- Not concurrent viewers.
- Not a rank signal.
- Per-listing click numbers on a row are **unscaled**.
- No IPs or unique-visitor de-dupe.
- Paid listing outbound links use `rel="sponsored"`.

---

## 2. Product rules (shared)

Pure pay-to-rank. Highest **total bid** stands first. Rank `01` is first.

- Minimum bid **$5**. **Whole US dollars only** (stored as integer cents, always `n * 100`).
- Re-bid on the **same URL** (same `url_key` on the same board) charges **only the difference**. New total must **strictly beat** the current total.
- Ties: `bid_cents DESC`, then `last_bid_at ASC` (whoever reached the amount first), then `id ASC`.
- No accounts, passwords, or logins. Ownership is a **secret manage URL** issued at first paid bid (`/founders/manage/$token`, `/culture/manage/$token`, or `/bidception/manage/$token`).
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

## 3. Triple identity

One TanStack Start app. `$site` is `founders` | `culture` | `bidception`. Unknown `$site` redirects to `/`. There is no separate `board_type` column — `site='culture'` is culturebid.

| | Foundersbid | Culturebid | Bidception |
|---|---|---|---|
| Wordmark | `foundersbid` (Newsreader italic) | `culturebid` (Outfit) | `bidception` (Syne) |
| Portal line | Trust the founding team | Rank your culture. Attract the people who matter. | Discover other marketing platforms |
| Tagline | Pay to prove the founding team. Build trust. Rank higher. | Rank your culture. Attract the people who matter. | Find where else to spend your marketing budget. |
| Kicker | Portfolios · about pages · founding teams | Careers pages · culture · why join us | Marketing platforms · directories · visibility tools |
| Extra field | Founding team (names, public) | Employee / founder quote (optional; stored in `team`) | What it is (short public note) |
| Extra list | Up to 5 founder socials | Up to 5 values / why-join-us (`values` jsonb) | — |
| Primary CTA | Bid the team | Bid the culture | List a platform |
| Visit CTA | Visit page | Visit culture page | Open platform |
| Claim box | Claim #1 | Claim #1 | Take the top slot |
| Contact | contact@foundersbid.lol | contact@culturebid.lol | contact@bidception.lol |

Copy, fonts, and tokens switch via `data-theme={site}`. Ranking, payments, swap math, and Cashfree do not.

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
| `/` | **bidthrone.lol** portal. Three equal columns: foundersbid, culturebid, bidception. Top 3 + pool + visits/views only (no full board, no activity). |
| `/spec` | In-app product contract. |
| `/$site` | Leaderboard + stats (including visits today / total views). |
| `/$site/rules` | Public rulebook + swap fee preview. |
| `/$site/activity` | Full live tape. |
| `/$site/bid` | New listing or re-bid. |
| `/$site/checkout/$orderId` | Cashfree sandbox. |
| `/$site/manage/$token` | Secret control. |
| `/$site/listing/$id` | Public detail. |
| `/$site/terms` `privacy` `refund` `contact` | Cashfree legal per board. No refunds. contact@foundersbid.lol / contact@culturebid.lol / contact@bidception.lol |
| `POST /api/webhooks/cashfree` | Settle paid orders. |

---

## 6. Database additions for hype

```sql
site_stats (
  site text pk,                 -- founders | culture | bidception
  views bigint,                 -- real total page views
  visits bigint,                -- real total outbound visits
  visits_today bigint,          -- real visits since visits_day
  visits_day date,              -- rolls over; resets visits_today
  launched_at timestamptz,      -- day 1 of the 21-day curve
  hype_locked boolean           -- latched at 8,000 real daily visits
)
```

Listings, orders, and activity are unchanged from the original boards schema (`migrations/0002_boards.sql`). Hype is `migrations/0003_hype.sql`. Founder socials are `migrations/0004_socials.sql` (`listings.socials jsonb`, max 5 URLs). Culturebid + repositioned bidception: `migrations/0005_culture.sql` (`listings.values jsonb`, `site='culture'`, marketing-platform seed on bidception).

---

## 7. Payments, ranking, legal, UI

Unchanged from the shipped product: Cashfree, $5 whole-dollar bids, re-bid = difference, manage links, no refunds, light/dark appearance bar, foundersbid letterhead, Newsreader / Syne / Outfit.

Auth **OFF**. Database **ON**. Unowned rows.

Math: `src/lib/hype.ts`. Tracking: `trackView`, `trackClick` in `src/lib/board-fns.ts`.

---

## 8. Conversion box, favicons, people-first, leftover budget

### Conversion box

On every board, above the ranking:

- Headline: **Claim #1** (foundersbid, culturebid) / **Take the top slot** (bidception)
- Live price to take #1: current leader dollars + 1, or $5 if the board is empty
- **+/− stepper** on that price (whole dollars, floor $5). The number is also typeable.
- If the bid is at or below the leader: warning that rank follows the bid and they will sit below #1. Equal bids lose to whoever reached the amount first.
- URL field + primary **Bid now**
- Helper: `$5 minimum · Whole dollars · Re-bids only pay the difference`
- Submits to `/$site/bid` with the URL and the take-#1 amount prefilled

### Favicons

Every listing row, detail page, manage page, and portal top-3 shows the submitted URL’s favicon via same-origin `/api/favicon` (lazy, `fetchPriority=low`, 24h cache). If the remote ico fails, a letter monogram from the title. Always HTTP 200.

### Foundersbid people-first

- Public headline is the **founding team names**, italic Newsreader. Company name and host sit secondary.
- Up to **5 founder socials** (X, LinkedIn, personal site) as icon links on the board, detail, and manage pages.
- Bid form field order: company name → page URL → one-line proof → founding team names (required) → up to 5 socials → bid amount.

### Culturebid

- Public headline is the **company name**. Culture statement, up to 5 values (chips), optional quote.
- Bid form: company name → careers/culture URL → short culture statement (required) → optional quote → up to 5 values → bid amount.
- Tone: professional / HR letterhead. Cool stone, Outfit wordmark.

### Bidception (repositioned)

- Discovery board for marketing platforms, directories, pay-to-rank tools, newsletter sponsorships, community boards.
- Tagline: *Find where else to spend your marketing budget.*
- Not a “leaderboard of leaderboards” / clone war.

### Leftover budget

On foundersbid and culturebid, a quiet card: “Have leftover budget? Discover other platforms on bidception.lol”. Bidception copy makes it the complementary destination. Footers list all three domains.

### Performance

Portal loads top-3 + grouped stats only (no activity, no 100-row boards). View tracking is one request (portal batches all three sites). Favicons are lazy + cached. Sister links use `preload="intent"`.