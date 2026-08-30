# RC5 Release Report — Product Object Redesign + RC4.1 Trust Correctness

**Status:** COMPLETE (production release, 2026-08-30)

## Release identity

| Item | Value |
| --- | --- |
| Baseline main (spec written against) | `ca49dc8` |
| Baseline production runtime | `b9a698f` (`dpl_8Rx9WTFQC3b7kuPCqPAepEuLswPd`) |
| **RC5 runtime SHA (deployed)** | **`c2423e5`** |
| **Production deployment** | **`dpl_BmNTfoudCa2417AsevLXFcaYL7xR`** (`bidthrone-4wjwso2ol-…`) |
| Preview deployment (same SHA) | `dpl_DeVZuTFWB5e6EizpvVvwJVx2Rouq` |
| origin/main at deploy time | `c2423e5` (local == origin == production source) |
| gitDirty | 0 (deployed from a detached clean worktree of the exact pushed SHA) |
| Post-deploy docs commit | (this report; runtime unchanged) |

Commit chain on main: `ba6cd46` (RC4.1 trust correctness) → `9da0c20`
(RC5 product objects + two-layer law) → `5bf5c29` (ghost-ledger 390px
containment + self-diagnostic overflow check) → `c2423e5` (job-card title
wrap fix).

## Migration

- **0019_trust_snapshot_equivalence.sql** (strictly additive, idempotent):
  1. `trust_score_snapshots.span_days` (integer ≥ 0, default 0) — the one
     RoleScoreResult fact that existed nowhere else.
  2. `trust_events_reject_mutation()` + `trust_events_append_only`
     BEFORE UPDATE OR DELETE row trigger — database-enforced append-only.
- Gated preflight executed BEFORE the code deploy: dry-run (1 pending =
  0019) → apply → ledger verified `…0017, 0018, 0019` → `span_days`
  column present → trigger present and enabled (`BEFORE UPDATE`,
  `BEFORE DELETE` events) → row counts unchanged
  (trust_events 0, snapshots 0, users 2, bounties 0 — honest empty
  production, same as the RC4 baseline).
- Boot-gate `REQUIRED_MIGRATIONS` includes 0019; the ledger-drift test
  pins the list to the directory.

## RC4.1 trust correctness (Gate 1)

- **5.1 Cold/warm equivalence:** `snapshotToResult()` now rebuilds the
  COMPLETE `RoleScoreResult` — persisted fields (score, status,
  confidence, pillars, primary/unique outcomes, effective sample size,
  verified volume, span_days, caps) + deterministic reconstructions:
  `bRaw = roleBase(stored pillars)` (model-versioned, proven by test) and
  `uncappedScore = roleScore(bRaw, confidence)` when a cap applied.
  Deep-equality regression covers a clean provider, a capped provider
  (649 cap + preserved uncapped value), and the overall blend.
- **5.2 Fingerprint:** `reportFingerprint()` now includes
  `currentlyRestricted` and `severeEventReinstatedDaysAgo` plus the model
  version. Regression: a cache hit can no longer survive a same-day
  restriction (the read is RESTRICTED, not the stale 780), and a
  reinstatement re-fingerprints and restores the previous score exactly.
  Unit test pins the fingerprint sensitivity directly.
- **5.3 Leaderboard cache:** eligible-provider regression — a warm
  snapshot no longer zeroes `n_eff`/counterparties/confidence; the
  provider and overall boards keep the member eligible.
- **5.4 Marginal impact:** counterfactuals that are NR/RESTRICTED carry
  `impactPoints: null` + `counterfactualStatus`; the private report
  renders "Without this event, there is not enough history for a
  comparable score" instead of 0. Numeric comparable counterfactuals keep
  their true with-minus-without value (adverse events ≤ 0).
- **5.5 One registry:** `src/lib/marketplace/leaderboard-registry.ts`
  (key/title/family/metric/floor/format/role/explanation). The serverFn
  validator, server dispatch, the board rail/selector, titles, and row
  formatting all derive from it; the duplicated `BOARD_NAMES` arrays and
  the route-local `TITLES` map are deleted. Unknown keys throw, never
  guess.
- **5.6 Most Reliable:** now ranks the BI-1.0 provider RELIABILITY PILLAR
  ("Reliability 92% · 8 verified outcomes", 0..1) with the score-board
  evidence floor (score-eligible, n_eff ≥ 5, U ≥ 3). Divergent fixtures
  pin it: high-reliability/low-volume A leads Most Reliable while
  lower-reliability/high-volume B leads the Top Provider Bid Index board
  (300-900). The boards are distinct in kind, not just in order.
- **5.7 Homepage Market Rates:** the bespoke `bidIndexReady` SQL is
  deleted; the preview consumes `marketRateFor()` +
  `MARKET_RATE_MIN_SAMPLE` (the same gated source as /market-rates) with
  presentation category selection (top-3 by real sample size; fallback
  list when the network has no categories). Regression proves identical
  sampleSize/sufficient/min/median/max.
- **5.8 Append-only:** decided SAFE at the database level (PostgreSQL and
  PGLite both ship PL/pgSQL row triggers; verified on PGLite in CI:
  INSERT works, UPDATE and DELETE are rejected before any row is touched;
  projector/rebuild tooling inserts only). The application layer remains
  UPDATE/DELETE-free. Documentation (methodology + TRUST_SCORE ops runbook
  + 02_DATA_MODEL) now states exactly where append-only is enforced,
  including the single documented escape (the RC4 §41 reproducibility
  test's explicit trigger disable/re-enable).
- **Latent P0 found and fixed during 5.1:** the snapshot primary id was
  keyed on `userId.slice(0, 12)` — two users sharing a 12-char prefix
  (e.g. `usr_rc41_provider_a/b/c`) collided and the second member's
  snapshot write 500'd. Ids now use a short SHA-256 of the full user id;
  regression test pinned.

## RC5 design (Gate 2)

- **Two-layer law** documented in `docs/03_DESIGN_SYSTEM.md` (supersedes
  the RC3 "tokens + copy only" doctrine where stated): Layer A operational
  spine unchanged; Layer B product objects in
  `src/components/product-objects/` + `src/components/brand/` with named
  `styles.css` classes under the marked PRODUCT OBJECT LAYER (raw values
  in CSS, never in TSX; presentation only).
- **Palettes:** RC5 targets in `styles.css` (FoundersBid workshop paper
  #f3eadc/#faf4ea/#8d4a28; CultureBid lilac editorial #f3eef7/white
  cards/#6d28d9; Bidception slate console #f2f5f6/white/#0f766e with the
  dark graphite #152028 header token even in light mode; Bidthrone dark
  archival ledger #0c0d10/#12131a/#8570ff). New tokens: chip/line/
  line-strong/header family. Bidthrone's violet accent is the spec
  #7b5cff lightened one step to #8570ff with a dark accent foreground:
  the raw target fails WCAG AA as text on the page background (4.3:1) and
  white-on-#7b5cff fails at 3.9:1 — documented in the CSS.
  `THEME_COLORS` + `DEFAULT_THEME_MODE` synchronized in
  host-seo-shared.mjs; contrast-audit gate passes unchanged in strictness.
- **Fonts:** Newsreader display for the three serif products; Outfit
  600/700 tight (-0.04em) for the Bidception console; **Syne retired**
  (repo-wide search: only the bidception display token referenced it;
  `@fontsource/syne` uninstalled, lockfile updated, build green).
- **Bidthrone dark-first:** `readMode(fallback)`,
  `modeBootScript(fallback)`, `DEFAULT_THEME_MODE` — SSR `data-mode`
  equals the product default, the boot script overrides only when a
  stored preference exists, React's initial state equals the SSR value.
  Verified: new-visitor bidthrone.lol SSRs dark with theme-color
  #0c0d10 (dev, built preview, production); stored light overrides; the
  other three products default light; zero hydration-mismatch console
  errors in the style-audit captures.
- **Header:** 64px sticky product-bar on the header token, blur 16px,
  hairline bottom, 1fr/auto/1fr grid, ProductMark + wordmark, inset 2px
  accent active rule, improved network switcher (marks, "current"
  label), ONE mobile menu (nav + network + account + appearance + blog +
  funding status; 44px targets), funding chip from `moneyMode()`
  (public-safe string through the shell context; never the capability
  matrix) on the three marketplace products.
- **Product marks:** `ProductMark` (bidthrone seal/keystone, foundersbid
  ring+dashed ring+3 builder dots, culturebid framed brief, bidception
  2x2 opposing filled/outlined nodes) + shared `NetworkMark` — SVG,
  currentColor, decorative by default.
- **Sample contract:** `src/lib/sample-content.ts` (`SampleObject<T>`),
  `data-example="true"` + visible EXAMPLE/SAMPLE text on every sample
  root; no sample rows in any table (PGLite regression), no sample
  JSON-LD, no sample counts in real headings; "Open now" real-only;
  samples in separate labelled sections. Pinned by tests incl. the
  exact sample-tree reconciliation (100,000 = 10,000 + 30,000 + 20,000 +
  25,000 + 15,000 + 0 reserve).
- **FoundersBid:** manila work-ticket hero object (clipped tab, paper
  tape, rotated EXAMPLE ribbon; real work uses the same morphology with
  real fields and no ribbon), job-board cards (3/2/1), honest empty
  stage, separate labelled Sample work, two-mode chooser
  (Compete/Submit/Review vs Propose/Choose/Milestones/Approval), category
  chips on the REAL filter vocabulary, Graveyard document-register rows.
- **CultureBid:** editorial poster hero (16:9 local SVG art, EXAMPLE
  ribbon, "Example brief. Not live."), sample brief wall
  (UGC/Photography/Naming/Music, spec amounts, 4/2/1), real cards from
  stored fields only (usageNotes or "See brief for usage terms"; never
  inferred rights), brief detail grouped CREATIVE/RULES/LICENSE,
  deterministic local sample media under `public/sample-media/culture/`
  (no Unsplash, no CSP change).
- **Bidception:** console identity, role rail with three honest doors
  (Start a project → /bidception/new; Captain a team → the existing
  captain interest section, no dead route; Take a part → FoundersBid
  open work, labelled as such), BudgetTree product object (presentation
  only; receives authoritative values; renders an honest
  "does not reconcile" line if the math ever breaks), sample tree in the
  hero, real parent summary when a parent exists (no synthesized trees),
  real allocation tree in the 8/4 workspace.
- **Bidthrone:** sample public-record card (SAMPLE RECORD / NOT A REAL
  MEMBER, @example, EX avatar, Bid Index NR only, 0/0/0 counters, dashed
  review slots, neutral timeline, no fake chronology), lower grid
  leaderboard preview (ghost ledger: headers + ghost bars + blank rank
  cell + "No eligible records yet") / Market Rates preview (real
  sampleSize/sufficient/min/median/max, progress = sample completeness
  only, "n/10 verified" in text), /leaderboards board rail + single
  ledger, /bid-index NR as first-class state, /market-rates
  sample-completeness column. Taxonomy separation enforced in code, copy,
  tests, and docs (Bid Index = personal 300-900; Market Rates = category
  pricing aggregate).
- **Public profile:** case-file layout (identity masthead, Bid Index
  state, factual counters, role breakdown with counterparties, revealed
  reviews, company/skills/links) — no cover photo, no follower count, no
  vanity badges.
- **Money display:** `formatMinorTrimmed` / `MoneyValue
  trimZeroDecimals` — zero paise trim on marketing surfaces only;
  accounting stays precise; nonzero paise always visible; zero-decimal
  currencies untouched.

## QA results

| Gate | Result |
| --- | --- |
| `npm ci` | clean (lockfile updated only for the Syne removal) |
| `npm run lint` | 0 errors (78 pre-existing-class warnings) |
| `npm run typecheck` | clean |
| `npm test` | **1693 + 329 = 2022 pass, 0 fail** (incl. 11 RC4.1 regressions, 8 registry invariants, 8 sample/money/theme tests) |
| `npm run build` | clean (Vercel preset, PGLite excluded from cloud builds) |
| Complexity gate | **0 violations** (CC ≤ 15, depth ≤ 5, fns ≤ 120 lines) |
| Contrast audit | 2/2 (all text roles AA on all surfaces, all 8 product × mode combos; THEME_COLORS == CSS --bg) |
| Public copy scan | pass (no em-dash in rendered copy; legacy terms; sample labels) |
| `npm audit --omit=dev --audit-level=high` | 0 vulnerabilities |
| CI (c2423e5) | success — run 33284587135 |
| CodeQL (c2423e5) | success — run 33284587153 |
| Playwright critical paths | **53/53** (incl. dark-first, stored-preference override, one mobile menu, funding posture, registry rail, record card, sample tree, overflow self-diagnostic) |
| Marketplace journey (fake provider) | **7/7** |
| Style audit (dev, real-data state) | 100 captures; **zero horizontal overflow at 390/768/1440** on all RC5 routes; every `[data-example]` element carries visible EXAMPLE/SAMPLE text |
| Preview (c2423e5) | Ready; dark-first + #0c0d10 chrome + sample record + no 5xx on /, /leaderboards, /bid-index, /market-rates, /blog, /signup, /terms |
| Production smoke | **17/17** critical routes 200; 55-route posture sweep: public 200, capability 301, auth 307 → /signin; zero 5xx observed |
| Production ledger | 0002–0019 present; trust_events 0, snapshots 0 (unchanged) |

Two CI-driven fixes landed before the release SHA: the ghost ledger's
420px min-width table propagating through the home grid track at 390px
(min-w-0 containment), and a truncate (nowrap) job-card title forcing
the board track 33px wide on CI's real-data state (wrap instead).

## Flags

- **Production funding: OFF** (`moneyMode()` = off; no
  MARKETPLACE_MONEY_LIVE; the shell chip "Funding not live" renders on
  the three marketplace domains in production, absent on Bidthrone by
  design).
- **TRUST_VERIFICATION_LIVE: 0** (unchanged; no verification purchase
  surface).
- CSP unchanged: local fonts/icons/sample art only; no Unsplash, no
  Google Fonts, no remote tracking; Syne font files removed entirely.

## External follow-ups (unchanged from RC4, still operator-side)

- CultureBid apex DNS (public A records → private 10.x); www canonical
  in place until fixed.
- X page-cache refresh check once via `https://bidthrone.lol/?share=trust-v1`
  (canonical stays clean).
- GSC / Bing Webmaster verification.
- Vercel ↔ GitHub git integration + browser-side branch protection
  (Dependabot majors intentionally unmerged).
- Confirm `contact@foundersbid.lol` mailbox provisioning at Hostinger.

## Rollback

`vercel deploy --prod` of the previous deployment
(`dpl_8Rx9WTFQC3b7kuPCqPAepEuLswPd`, runtime b9a698f). Migration 0019 is
additive and harmless to the RC4 runtime (the span_days column is simply
unwritten; the trigger is satisfied by RC4 code, which never mutates
trust_events). No rollback of the database is required or provided.
