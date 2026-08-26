# Shipped Report — The Crown (Oracle Pass)

Date: 2026-08-26 · Status: **deployed to https://bidthrone.lol** (commit `fdc55e0`)

## What was shipped

**The Crown** — the #1-ranked idea from `docs/idea-ranking.md` (38 pts vs Burn/Boost's 37) — is now live on every board:

- **Free tier (genuinely useful, no account):** every device gets one pick per UTC day of which platform holds #1 at midnight. Identity is a device token (`crn_…`) in localStorage plus an optional display handle. Zero sign-up, zero friction — the free game is the product, per the mission.
- **Oracle Pass ($5 / 7 days, Cashfree, INR at checkout):** 5 picks per day, 5× points, live crowd-odds bars on every candidate, and an ORACLE badge on the oracle board. Passes stack; extending a pass extends from its current expiry.
- **The loop:** the board's #1 listing "holds the crown" until 00:00 UTC. When a new bid takes #1 the crown moves (visible in the board's Crown card). At midnight the round settles lazily on the next read — the winner of the round gets 100 × multiplier points, streaks update, and the crown page shows "X took the crown <date> — you called it."
- **Oracle board:** top-10 leaderboard with tiers (Bronze/Silver/Gold), points, streaks, and ORACLE badges — a visible status layer that the legacy board has no equivalent of.

Surfaces: `/$site/crown` (game + standing + upsell), `/$site` (Crown card linking to it), nav "Crown" link, single Cashfree rail with a new `oracle` order kind, and the existing `/api/webhooks/cashfree` confirming oracle payments.

## Evidence (all gates, §5)

| Gate | Result |
|---|---|
| `npm run build` | green (nitro/Vercel preset, PGLite wasm copied, `migrate.mjs` skips locally as designed) |
| `npm run typecheck` | green |
| Dev smoke (`:8080`, desktop 1280×800 + mobile 390×844) | `root`, `bidception`, `bidception/crown`, `founders`, `culture` — all exit 0, 0 console errors, 0 page errors, no horizontal overflow. Verdicts: `screenshots/crown-*-dev.json` + PNGs. |
| Preview smoke (`:8081` built output, `--baseline` = dev verdict) | same 5 pages, all exit 0, **`divergesFromBaseline: false`** on every page. Verdicts: `screenshots/crown-*-preview.json` + PNGs. |
| Cashfree sandbox path | see boundary note below. |
| Deploy | `vercel deploy --prod` → https://bidthrone.lol (aliased, "Ready in 22s"). Build ran the real deploy migration: `0008_crown.sql` applied + recorded on the production DB. |
| Push | `fdc55e0 feat(crown): …` pushed to `origin/main` (github.com/oculusrex14/bid-lols). |

### Live production checks (post-deploy)

- `GET /bidception/crown` → 200, renders countdown + empty state ("No crown to win yet") — proves the production DB has the crown tables and the page reads them.
- `GET /`, `/founders`, `/culture`, `/bidception` → all 200; boards, nav Crown link, and empty-board CTA intact (no regression).
- `POST /api/webhooks/cashfree` with a **bad signature** → `401 invalid signature` (HMAC verification is live in production).
- Production DB after deploy: `0008_crown.sql` recorded in `_migrations`; crown tables empty; existing 4 `bid` orders untouched.

### Money math (verified)

- $5 pass = 500¢ → `usdCentsToInrRupees(500, rate)` = `round(5 × rate)` INR: 425 @ fallback 85, ≈442 @ live rate (open.er-api.com, 15-min cache, 85 fallback). Rounded up, minimum ₹1.
- `orders.amount_cents` stays in USD whole-dollars (500); INR is computed at session creation only — no second currency is stored.

### UI flow verification (dev, seeded PGLite)

- Countdown ticks every second; current-#1 holder card; tonight's field with pick counts.
- Free token: pick placed → "1 of 1 picks used"; second pick **blocked** with "One pick a day on the free tier. Remove it or get the Oracle Pass."; removal drops the pick and frees the slot.
- Pass-holder token: "0 of 5 picks used this round. Oracle Pass active.", crowd-odds bars (`n · %`) on each candidate, "Active until … (UTC)" + "Extend 7 more days · $5".
- Checkout page: paid oracle order → "Oracle Pass is active … Back to the crown →"; pending order with no live gateway session → clear "buy the pass again" state (no fake paywall).

## Honest note: Cashfree sandbox boundary

The mission asks for sandbox payment testing. **This environment has only production Cashfree credentials** (Vercel env + local `.env.local`); no sandbox app/keys exist, and the sandbox gateway correctly rejects them:

```
POST https://sandbox.cashfree.com/pg/orders  (production x-client-id/secret)
→ 401 {"message":"authentication Failed","code":"request_failed","type":"authentication_error"}
```

Everything **up to** the gateway was exercised end-to-end:

1. `createOracleOrder` from the UI reaches the sandbox host, the gateway rejects (401), the server function fails cleanly, the UI shows an error toast, and **no orphan order row is created** (the local insert happens after a live session is returned).
2. Webhook, **invalid signature** → 401 (HMAC rejected).
3. Webhook, **valid HMAC-SHA256 signature** (computed with `CASHFREE_WEBHOOK_SECRET`, never printed) for a pending oracle order → 409 `{"ok":false,"error":"Cashfree has not marked this order paid yet."}` — proves signature verification, order lookup, kind dispatch, and the 4-attempt gateway polling chain all execute.
4. Webhook, valid signature for an already-paid oracle order → 200 `{"ok":true,"gateway":"cashfree"}` (idempotent confirm path).

What this does **not** cover: an actual sandbox *payment completion* (card/UPI in the modal → gateway marks paid → webhook grants the pass). That requires sandbox credentials, which are not available in this environment. The grant path (`confirmPayment` oracle branch: pass insert with stacking expiry, order marked paid, `passExpiresAt` returned) is implemented on the single existing payment rail and code-reviewed; the read side (pass active → 5-pick limit, crowd odds, badge) was verified directly against the DB state.

## What to try (a user)

1. Open https://bidthrone.lol/bidception (or /founders, /culture) → **Crown** in the nav.
2. Pick who you think holds #1 at midnight. One free pick a day, no account.
3. Come back tomorrow — if you were right, you get 100 points and the crown story line ("…took the crown — you called it.").
4. The oracle board shows the top 10; Oracle Pass holders get a badge, 5 picks, 5× points, and live crowd odds.
5. First pick on an empty board: the board itself is the crown — "the first bid places the first crown."

## Known limitations / follow-ups

- No real payments until sandbox (or production) credentials are used in a checkout — see boundary note.
- Passes are per device (token); sharing a pass across devices is not detected (acceptable for the unowned-data model; matches the board's manage-token model).
- Settlement is lazy (next read after close) — fine at current scale; a cron could settle proactively later.
