# 03_DESIGN_SYSTEM.md — Bid Network Design System

**Status:** Compact, implementation-oriented design system for the four Bid Network products, grounded in the existing codebase. Not a brand manual. Updated for the RC3 Network Spine: the spine primitives in `src/components/ui/` are the only control skin; raw hex and raw control markup in component code are drift.

## Shared UI Foundation

- One design system, four products. Differentiation is via **token values + copy**, not new components: `data-theme` on `<html>` (rendered at SSR by the root loader from the request host) plus light/dark `data-mode` — all four products support both, in light **and** dark. Dark palettes are product-aware via `html[data-mode="dark"][data-theme="…"]` (compound on the element that owns both attributes).
- Semantic roles only (`@theme` in `src/styles.css`): `bg / surface / raised / fg / muted / subtle / accent / accent-fg / accent-soft / border / ring / up / danger / warn`. Component code uses token utilities only — no raw hex outside `styles.css` (favicon SVG and the `theme-color` meta value are the only exceptions, both host-derived).
- Kept utilities: `.tabular`, `.sr-only`, `.row-line` (1px row separator), `.skeleton`, `.rise-in`. Canvas wrappers: `.canvas-wide` (1240px marketplace), `.canvas-app` (1080px application), `.canvas-prose` (720px forms/articles) — pages pick exactly one; raw `max-w-*` page containers are drift.
- **No drop shadows anywhere** (RC3). Elevation = 1px hairline borders + `surface`/`raised` tokens. `border-2` is reserved for selected states (e.g. the active market tab); never for cards or dividers.
- Radii: controls 8px (`rounded-sm`), cards 12px (`rounded-md`), pills only for status chips. Off-scale radii (16px cards, 12px buttons) are drift.
- Motion: 150/250ms tokens, one ease-out curve; `prefers-reduced-motion` disables all.
- Cashfree checkout keeps its own provider skin (`data-gateway="cashfree"`) — third-party context, never blended with product tokens.

## Spine primitives (single source for control skin)

- `Button` / `ButtonLink` (`ui/button`): the only button markup. Sizes sm/md/lg = h-8/h-10/h-12, `rounded-sm`, hover + active states, `loading` variant preserves the label.
- `Field` / `Input` / `Textarea` / `Select` / `CheckRow` (`ui/field`): h-10 controls, `rounded-sm`, `border-fg/20`, `focus:border-fg/50`, `placeholder:text-subtle`, errors via `aria-describedby`; checkbox/radio fill = `accent` (never `fg`).
- `StatusBadge` (`ui/status`), `MoneyValue` / `formatMinor` (`ui/money`), `Avatar` (`ui/identity`), empty/error/notice states (`ui/states`), `SectionHeader` (`ui/layout`), `BudgetBar` (`ui/data`), `ReviewCard` (`ui/review`).
- A component that writes raw `<input>` / raw `<button>` with its own class string is a bug by construction; the RC3 style pass (2026-08-29) eliminated the last legacy skins (auth, profile, waitlist, create-parent, 404, legal, admin, post-chooser).

## Typography

- Families (already loaded): **Outfit** (UI/body, 400/500/600), **Newsreader** serif (Founders/Bidthrone display, 400/500/600 + italic), **Syne** (Bidception display/meta, 600/700), monospace for ids/tokens. No new families.
- Scale: h1 ≈ `4xl`, `text-balance`, −0.03em, line-height 1.1; h2 `2xl`; h3 `lg`; body `text-base`; secondary `text-sm`; meta/kickers `text-xs` uppercase, `--tracking-kicker` (0.22em).
- Per-domain display font via the existing `--font-display-active` switch (Founders: Newsreader; Culture: Outfit; Bidception: Syne; Bidthrone: Newsreader).
- All numbers and money: `.tabular`.

## Spacing

- 4px base grid (Tailwind scale): 8px inside components, 16px between, 24–32px section spacing, 48–64px between page-level sections.
- Whitespace is the primary hierarchy device; dividers are 1px hairlines (`border-fg/10`–`/20`), used sparingly. There are no strong ink rules in the spine (the legacy masthead's 3px rule is retired).

## Layout

- Centered canvas column — one of `.canvas-wide` (1240px, marketplaces), `.canvas-app` (1080px, application surfaces), `.canvas-prose` (720px, forms/articles), `px-4` mobile / `px-5` desktop. Raw `max-w-*` page containers are drift.
- Sticky `h-14` header (1px bottom hairline, `bg-surface/95 backdrop-blur`); content-first, no hero-heavy layouts. Complex detail views: primary content + sticky meta/actions sidebar.
- Domain chrome = one shared `ProductShell` (`src/components/product-shell.tsx`), parameterized by host config (wordmark, nav, CTA, tagline, empty-state copy).

## Cards

- One card style for everything (bounties, listings, profiles): `bg-surface`, `rounded-md` (12px), 1px `border-fg/15`–`border-fg/20`, 16–24px padding. Hover rows use `bg-surface/70` or `raised`, not shadows. No drop shadows, glassmorphism, or gradients anywhere.
- Hierarchy: title (display font) → meta (`muted`) → body → footer row (actions left, meta right).

## Forms

- Use the spine `Field`/`Input`/`Textarea`/`Select`/`CheckRow` primitives only: `h-10` controls, `rounded-sm` (8px), `bg-surface`, `border-fg/20`, `focus:border-fg/50`, `placeholder:text-subtle`, global `:focus-visible` ring (never `outline-none` on a control). `Field` carries the visible `sm` label + `xs/subtle` hint + `danger` error wired via `aria-describedby`.
- Checkbox/radio fill is the product `accent`, not `fg`.
- Server-side zod validation is the source of truth; client hints only.
- Money is never free-typed: amounts are server-computed and labeled; the user confirms, never enters, a payment-critical amount.
- One primary action per form; destructive actions use `danger` plus a confirmation dialog.

## Buttons

- One `Button`/`ButtonLink` pair, 4 variants (`primary`/`secondary`/`ghost`/`danger`): `rounded-sm` (8px), sizes sm/md/lg = h-8/h-10/h-12, global focus ring, disabled opacity, `loading` variant (spinner + disabled, label preserved). Money CTAs use `primary` and state the server-verified price; unverified states get no money CTA.
- The header CTA and hero CTAs are the same component (`ButtonLink`); raw anchor/button markup with its own class string is drift and should not reappear.

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
