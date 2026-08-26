# 03_DESIGN_SYSTEM.md — Bid Network Design System

**Status:** Compact, implementation-oriented design system for the four Bid Network products, grounded in the existing codebase. Not a brand manual.

## Shared UI Foundation

- One design system, four products. Differentiation is via **token values + copy**, not new components: per-domain `data-theme` plus light/dark `data-mode` — all four products support both.
- Semantic roles only (already in `@theme`): `bg / surface / raised / fg / muted / subtle / accent / accent-fg / border / ring / up / danger`. Component code uses token utilities only — no raw hex outside `styles.css`.
- Kept utilities: `.hairline`, `.tabular`, `.sr-only`, `.grid-veil` (optional decorative backdrop).
- Motion: 150/250/400ms tokens, one ease-out curve, stagger capped at 160ms; `prefers-reduced-motion` disables all.
- Cashfree checkout keeps its own provider skin (`data-gateway="cashfree"`) — third-party context, never blended with product tokens.

## Typography

- Families (already loaded): **Outfit** (UI/body, 400/500/600), **Newsreader** serif (Founders/Bidthrone display, 400/500/600 + italic), **Syne** (Bidception display/meta, 600/700), monospace for ids/tokens. No new families.
- Scale: h1 ≈ `4xl`, `text-balance`, −0.03em, line-height 1.1; h2 `2xl`; h3 `lg`; body `text-base`; secondary `text-sm`; meta/kickers `text-xs` uppercase, `--tracking-kicker` (0.22em).
- Per-domain display font via the existing `--font-display-active` switch (Founders: Newsreader; Culture: Outfit; Bidception: Syne; Bidthrone: Newsreader).
- All numbers and money: `.tabular`.

## Spacing

- 4px base grid (Tailwind scale): 8px inside components, 16px between, 24–32px section spacing, 48–64px between page-level sections.
- Whitespace is the primary hierarchy device; dividers are hairlines, used sparingly (the masthead's 3px/1px ink rules are the one allowed strong rule).

## Layout

- Centered `max-w-6xl` column, `px-4` mobile / `px-5+` desktop — existing shell rhythm kept.
- Sticky `h-14` header; content-first, no hero-heavy layouts. Complex detail views: primary content + sticky meta/actions sidebar.
- Domain chrome = one shared `SiteShell`, parameterized by domain config (wordmark, nav, CTA, tagline, empty-state copy).

## Cards

- One card style for everything (bounties, listings, profiles): `bg-surface`, `rounded-lg`, `.hairline`, 16–24px padding. `raised` on hover/active; no drop shadows, glassmorphism, or gradients.
- Hierarchy: title (display font) → meta (`muted`) → body → footer row (actions left, meta right).

## Forms

- Keep `Input`/`Textarea` (`h-11`, `bg-raised`, `.hairline`, ring focus) and `Field` (visible `sm` label, `xs/subtle` hint); add `Select`/checkbox/radio from the existing Radix deps, same skin.
- Server-side zod validation is the source of truth; client hints only; field errors: `danger` `xs` under the field, `aria-describedby`.
- Money is never free-typed: amounts are server-computed and labeled; the user confirms, never enters, a payment-critical amount.
- One primary action per form; destructive actions use `danger` plus a confirmation dialog.

## Buttons

- Keep the 4-variant `Button` (`primary`/`outline`/`ghost`/`danger`): `h-11` (44px target), `rounded-md`, focus ring, disabled opacity.
- Add one state: **loading** (spinner + disabled, label preserved). No new variants.
- Money CTAs use `primary` and state the server-verified price (e.g. "Fund ₹5,000"); unverified states get no money CTA.

## Status Badges

- One `Badge` primitive: pill (`rounded-full`), `text-xs`, `bg-raised` + hairline; semantic variants — **neutral** (`muted`, default), **positive** (`up` = paid/verified/settled/awarded), **negative** (`danger` = failed/refunded/disputed/cancelled). No other colors; neutral covers pending/open/in review.
- Every badge shows its plain-text label — color reinforces, never replaces. Pair badge + amount in the same row.
- Canonical vocabulary (explicit, no synonyms) — payment order: pending · paid · failed · expired · refunded · disputed; bounty fund: pending_funding · funded · awarded · paid_out · cancelled (state machines in `04_PAYMENTS_AND_TRUST`).

## Monetary Values

- Always currency + amount in the correct locale (`formatInr` en-IN, `formatUsd` en-US), `.tabular`.
- Hierarchy: the primary amount is the only emphasized number on a card; supporting amounts (fee, net) are `muted` `sm`.
- **Transparent-fees rule:** when a fee exists, show reward, platform fee, and net as separate labeled lines — never net-only.
- Amounts always labeled (Reward / Fee / Net / Charged) — no bare numbers. Amount + status render side-by-side (₹5,000 · Paid); unconfirmed amounts render pending, never as paid.

## Tables/Lists

- Data lists (bounties, entries, activity) = hairline-divided rows, not heavy tables: 16–24px vertical padding, title `fg` sm/medium, meta `muted` (right-aligned desktop, below on mobile).
- Real `<table>`s only for dense admin/audit data: uppercase `xs` headers, tabular numerals, `raised/50` row hover.
- Ranks: zero-padded integers (existing `rankLabel`, "01") — factual, not gamified.
- No auto-updating "live" feeds or tape effects (legacy activity-tape retired): static or paginated lists, newest first.

## Empty States

- One pattern: centered, `max-w-sm`, display-font headline + one muted sentence + one primary action; copy from the domain config (existing `emptyBoard`/`emptyActivity`).
- Always honest — "No bounties yet — start the first one" — no placeholder or demo data.

## Error States

- Field-level: inline `danger` error; transient/system: sonner toast; load failure: page panel with headline, specific reason, retry, reference id.
- Payment errors are never ambiguous: state what was/wasn't verified, offer retry/re-check; copy stays plain and specific. No silent failures (AGENTS §5).

## Loading States

- Skeletons matching card/control geometry (`bg-raised`, `rounded-lg`); subtle opacity pulse only; reduced-motion → static.
- SSR first paint, no client-only splashes; async buttons use the loading variant; no navigation spinners; below-the-fold media loads lazily.

## Mobile Rules

- Single column; one primary action in a sticky bottom bar with safe-area inset (existing `SiteShell` pattern).
- 44px minimum touch targets; 16px body/input text (no zoom on focus); no hover-dependent affordances; meta rows reflow under content.
- No horizontal page scroll; dense tables become stacked cards or a scroll container with a sticky first column.

## Accessibility Rules

- WCAG AA contrast in light **and** dark for every text token on its background (`fg`/`bg`, `muted`/`surface`, `accent-fg`/`accent`); re-verify on palette changes.
- Color never the only status signal (badges labeled; `up`/`danger` always with text).
- `focus-visible` ring on every interactive element (existing `ring-2` pattern); landmarks; one `h1` per page; `aria-label` on icon-only controls; toasts `aria-live`.
- `prefers-reduced-motion` honored across all animation.

## Brand Personality

Lightweight, per-domain — personality via tokens, display font, and copy register, not new chrome.

- **FoundersBid** — *the term sheet of the internet.* Confident operator: warm paper tokens, Newsreader display (italic on key figures), dense data, declarative business copy — serious, precise, zero gimmick.
- **CultureBid** — *the creative bazaar.* Playful .lol energy: cool stone tokens, Outfit wordmark, looser spacing, image-forward cards, witty-but-specific copy — fun, never cringe; the marketplace stays plain and trustworthy.
- **Bidception** — *the meta.* Technical and system-like: graphite tokens, Syne display, dense tables, mono accents on ids/structure, terse copy with a dry wink. The only product allowed to look like an instrument.
- **Bidthrone** — *the hall of record.* Authoritative and institutional: default tokens, Newsreader display, masthead hairlines, record-keeping leaderboards, calm factual copy. Crown/throne language is a restrained mark of **earned** reputation — never a jackpot.

## Explicitly Prohibited

- **Fake counters** — no inflated or invented counts (legacy hype layer stays dead).
- **Fake users** — no seed avatars, demo profiles, or "N people are here" without real sessions.
- **Fake bids/entries** — no placeholder competition volume.
- **Fake activity** — no fabricated feeds or "live" effects.
- **Misleading scarcity** — no "last slots" or countdowns unless a server-verified limit exists.
- **UI implying payment where none is verified** — no "paid" badges or success states without server-side provider verification.
- **Casino/gambling visual language** — no jackpots, confetti-on-money, neon glows, odds displays, spin mechanics.
- **Excessive animation** — the stagger cap stands; no decorative looping motion.
