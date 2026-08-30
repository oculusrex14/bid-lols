# 03_DESIGN_SYSTEM.md — Bid Network Design System

**Status:** RC5 two-layer law (supersedes the RC3 "differentiation via token
values + copy only" doctrine where stated; the RC3 spine itself stands).
Implementation reference: `docs/phases/PHASE_RC5_PRODUCT_OBJECTS.md`.

## The two-layer law

The network has ONE operational design system and FOUR distinct product
object languages:

- **LAYER A — OPERATIONAL SPINE (shared, unchanged):** Button/ButtonLink,
  Field/Input/Textarea/Select/CheckRow, StatusBadge, MoneyValue /
  MoneyBreakdown, Avatar, ReviewCard, empty/error/loading primitives,
  DataTable, BudgetBar, filters, auth, forms, admin, payment states,
  lifecycle controls. Simple, tokenized, hairline, accessible, consistent,
  authority-free in presentation. **No per-product form-control skins.**
- **LAYER B — PRODUCT OBJECTS (RC5 exception):** clearly owned
  presentational components in `src/components/product-objects/` (and
  `src/components/brand/`) for homepage hero objects, marketplace card
  morphologies that genuinely differ per product, public-record
  presentation, brief posters, budget trees, and sample visualization.

Product objects MAY use:

- 14–16px radii where specified,
- selective shadows,
- decorative gradients (the Founders brand layer only),
- pseudo-elements (folder tab, paper tape, ribbon, tree connector),
- local illustrative media (`public/sample-media/`),
- a product-specific silhouette.

…BUT ONLY when they are:

- in clearly owned product-object components,
- presentation — never business logic,
- never authority, never payment/admin/security controls,
- token-clean: raw product colors/shadows/gradients live in
  `src/styles.css` under the marked **PRODUCT OBJECT LAYER**; TSX uses the
  named object classes. Runtime-calculated data widths (progress %,
  budget segment %) may be inline style; static hexes may not.

Accessibility, money invariants, truthful-data rules, CSP, and server
authorization are NOT weakened by the product-object exception.

## Product visual roles

| Product | Role | Display voice |
| --- | --- | --- |
| Bidthrone | archival ledger / public work record | Newsreader, **dark-first** |
| FoundersBid | workshop paper / job tickets | Newsreader |
| CultureBid | editorial creative studio / brief posters | Newsreader |
| Bidception | systems console / allocation tree | Outfit 700, tight tracking |

## Shared UI Foundation

- One design system, four products, differentiated by **tokens + object
  language + copy**. `data-theme` on `<html>` (SSR by the root loader from
  the request host) + `data-mode` light/dark.
- **Bidthrone dark-first (RC5 §9):** a new visitor gets the dark archival
  ledger on first paint (SSR `data-mode="dark"` + boot script default);
  a stored preference always wins. The other three products default light.
  `DEFAULT_THEME_MODE` in `scripts/host-seo-shared.mjs` is the source of
  truth; `themeColorFor()` returns the DEFAULT-mode background so the SSR
  browser chrome matches the first paint. No flash, no hydration mismatch
  (the React initial mode equals the SSR mode; the boot script corrects
  the DOM before paint when a stored preference exists).
- Semantic roles only (`@theme` in `src/styles.css`):
  `bg / surface / raised / chip / line / line-strong / fg / muted / subtle /
  accent / accent-fg / accent-soft / border / ring / up / danger / warn /
  header / header-fg / header-fg-soft / header-line`. Component code uses
  token utilities only; no raw hex outside `styles.css` (favicon SVG, the
  `theme-color` meta value, and the marked product-object layer are the
  documented exceptions).
- Kept utilities: `.tabular`, `.sr-only`, `.row-line` (1px row separator),
  `.skeleton`, `.rise-in`. Canvas wrappers: `.canvas-wide` (1240px browse/
  shell), `.canvas-app` (1080px application), `.canvas-prose` (720px
  forms/articles), `.canvas-brand` (1180px RC5 hero compositions and
  product-object galleries).
- **Shadows:** the operational spine stays shadow-free (elevation = 1px
  hairline + surface/raised). Explicitly named product-object classes may
  carry the documented shadows (work ticket, brief poster, budget tree,
  record card, example ribbon). A shadow on a control, form, badge, or
  admin surface is drift.
- **Gradients:** decorative gradients are allowed in the product-object
  layer (Founders brand layer, Bidthrone record card, brief-tile overlay)
  and nowhere else.
- Radii: controls 8px, spine cards 12px; brand objects 14–16px per spec.
  Pills remain status-chip territory.
- Motion: 150/250ms tokens, one ease-out curve; `prefers-reduced-motion`
  disables all.
- Cashfree checkout keeps its own provider skin (`data-gateway="cashfree"`)
  — third-party context, never blended with product tokens.

## Header (RC5 §15)

- One `ProductShell` header: 64px (`h-16`), sticky top-0, z-40, the
  product **header token** (`--header`; Bidception's is dark graphite even
  in light mode), backdrop blur 16px, 1px hairline bottom.
- Desktop grid `1fr auto 1fr`: left = ProductMark + wordmark (and the
  compact Bid Network switcher), center = product navigation, right =
  account + primary CTA (+ quiet funding chip, mobile menu button).
- Active nav = a subtle **inset 2px accent rule** (`.obj-nav-active`),
  never a thick SaaS pill.
- Mobile: product mark + wordmark, compact primary CTA, and **ONE** menu
  button (44px target). The menu owns product nav, the Bid Network group,
  account, appearance, blog, and the funding status. No second menu icon,
  no second top-level appearance button. **RC5.1:** the standalone
  light/dark icon toggle is desktop-only (`hidden` below `md`); below `md`
  the appearance control exists exactly once, inside the menu
  (`ModeToggle variant="inline"`). The header row is therefore
  `[mark + wordmark] … [funding chip (md+)] [account (md+)] [CTA] [menu]`
  on mobile — the CTA stays visible.
- The shared Bid Network mark + dropdown keeps four sibling products with
  the current product clearly marked; every cross-domain URL uses
  `linkOrigin()` (CultureBid stays on the working www origin until its
  apex DNS is fixed). No implication of cross-domain shared auth.
- The product mark family (`src/components/brand/product-mark.tsx`) is SVG
  only, `currentColor`-derived, decorative by default. The symbol may
  suggest; the word "crown" never appears in rendered copy.

## Funding status (RC5 §18)

- The single funding authority is `moneyMode()` in
  `src/lib/payments/provider.ts` (`off` | `sandbox` | `live`).
- The public-safe mode string is threaded through `getShellContext()`
  (never the capability matrix, never a second interpretation) and the
  shell renders a quiet **"Funding not live"** chip when `off` on the
  marketplace products (desktop top bar; inside the mobile menu).
  Money-facing forms keep the fuller contextual explanation. Repeated
  homepage funding paragraphs are retired once the chip is present.

## Typography (RC5 §6/§7)

- Families: **Outfit** (body/UI everywhere; Bidception display at 600/700),
  **Newsreader** (display for Bidthrone, FoundersBid, CultureBid heroes),
  monospace for ids. **Syne was retired in RC5** (no remaining usage;
  imports removed). No Google Fonts, no remote fonts.
- Hero display: `clamp(40px, 5.2vw, 64px)`, line-height 1.02, serif
  tracking −0.03em (Bidception −0.04em, Outfit 700) — `.obj-hero-type`.
- Hero lead: ~16.5px, max ~42ch (`.obj-hero-lead`).
- Section micro-labels: 11–12px uppercase, ~0.14em, weight 600
  (`.obj-microlabel`); kickers 11px uppercase 0.16em (`.obj-kicker`).
- Money and numeric data: `.tabular`.
- **No serif in inputs, labels, buttons, statuses, admin, payment
  controls, or lifecycle controls.**

## Colors (RC5 §8)

- `src/styles.css` is the semantic color source. The RC5 target palettes
  are: FoundersBid warm workshop paper (#f3eadc page, #faf4ea card, #8d4a28
  accent); CultureBid lilac editorial (#f3eef7 page, white cards, #6d28d9
  accent); Bidception cool slate console (#f2f5f6 page, #ffffff cards,
  #0f766e accent, #152028 header); Bidthrone dark archival ledger
  (#0c0d10 page, #12131a cards, #8570ff accent — the spec #7b5cff
  lightened one step because the raw target fails WCAG AA as text; the
  accent foreground is dark for the same reason).
- **Hard gate:** `node --test scripts/contrast-audit.test.mjs` — every text
  role clears AA (≥4.5:1) on every surface it can sit on, all four
  products, light and dark; `THEME_COLORS` must equal the CSS `--bg` per
  product/mode so the browser chrome never diverges. If a target value
  fails, adjust the TEXT TIER, not the visual concept.
- If `--bg` changes, update `THEME_COLORS` in
  `scripts/host-seo-shared.mjs` in the same commit.

## Cards and product objects

- Spine cards remain one style: `bg-surface`, `rounded-md` (12px), 1px
  `border-line`, no shadows.
- Product objects (Layer B) carry the distinct morphologies:
  - **FoundersBid work ticket** (`.work-ticket`): manila folder paper,
    clipped tab, paper tape, rotated EXAMPLE ribbon (samples only).
  - **CultureBid brief poster / tile** (`.brief-poster`, `.brief-tile`):
    16:9 local media, 16px radius, gradient overlay on tiles.
  - **Bidception allocation tree** (`.budget-tree-shell`, `.tree-*`):
    captain node + child grid + hairline connector (hidden when the
    geometry would mislead).
  - **Bidthrone public record** (`.record-card`): pinned dark archival
    object on any mode; ghost ledger (`.obj-*`, `GhostBoard`) for empty
    boards — headers + row lines + ghost bars, rank cell blank, no fake
    identities, scores, or ranks.
- Hierarchy: title → meta (`muted`) → body → footer row.

## Sample content contract (RC5 §12)

- Examples are **labelled presentation, never inventory.**
- Client-safe constants: `src/lib/sample-content.ts` (`SampleObject<T> =
  T & { example: true }`).
- Every sample root renders `data-example="true"` and visible text
  **EXAMPLE** or **SAMPLE** (prefer "Example, not live").
- No sample rows in `users / bounties / projects / parent_works / reviews /
  reputation_events / trust_events`; no sample in JSON-LD; no sample count
  in a real heading; samples never labelled verified/paid/settled/live.
- "Open now" sections show real rows only (or a designed empty stage);
  samples live in their own labelled section.
- CultureBid sample media is deterministic local artwork under
  `public/sample-media/culture/` (no Unsplash, no CSP expansion). The
  sample media may contain its own embedded artwork palette; component UI
  still uses semantic tokens.
- **Taxonomy:** the Bid Index is the personal 300–900 trust model; Market
  Rates is the category pricing aggregate (sample-gated at 10). The two
  never share copy, shapes, variable names, or numbers. A sample
  completeness bar means sample completeness only — never trust,
  ranking, or price.

## Money display (RC5 §29; RC5.1 currency foundation)

- Core arithmetic: `src/lib/money.ts`, integer minor units only.
- **Currency registry (RC5.1 WS5):** `SupportedCurrency = "INR" | "USD"`
  with locale (en-IN / en-US), minor digits (2 / 2) and symbol (₹ / $) in
  `CURRENCY_CONFIG`. Grouping follows the record's OWN currency: Indian
  digit groups for INR (₹1,00,000.00), US groups for USD ($100,000.00).
  No "USD 1,00,000.00" style code+grouping hybrids; unknown codes fail
  visibly (`toSupportedCurrency` throws) and are never assumed INR.
- `MoneyValue` / `formatMinor`: precise accounting (always 2 decimals in
  either currency). `formatMinorTrimmed` / `trimZeroDecimals`: marketing
  display that drops ".00" ONLY when minor units are exactly zero
  (₹1,00,000 not ₹1,00,000.00; $1,000 not $1,000.00); nonzero paise/cents
  stay visible (₹1,00,000.50, $1,000.50). Never round away real money.
- Marketing/product-object surfaces (work ticket, brief cards, allocation
  tree, market-rates preview, job cards) trim; detail/accounting/ledger
  surfaces (bounty detail, milestones, admin payments, funding plans) keep
  the exact form.
- **Work currency vs viewer currency (RC5.1):** a real record always
  renders in its persisted `currency` column, independent of who views it;
  SAMPLE objects render in the viewer-default currency (IN in India, USD
  elsewhere) and keep their visible EXAMPLE/SAMPLE labels.

## Spine primitives (single source for control skin)

- `Button` / `ButtonLink` (`ui/button`): the only button markup. Sizes
  sm/md/lg = h-8/h-10/h-12, `rounded-sm`, hover + active, `loading`
  preserves the label, `danger` for destructive.
- `Field` / `Input` / `Textarea` / `Select` / `CheckRow` (`ui/field`):
  h-10 controls, `rounded-sm`, token focus, errors via `aria-describedby`;
  checkbox/radio fill = accent.
- `StatusBadge`, `MoneyValue`/`MoneyBreakdown`, `Avatar`, `ReviewCard`,
  `EmptyState`/`InlineNotice`, `SectionHeader`/`PageHeader`, `BudgetBar`,
  `DataTable`, `FilterBar`/`FilterChip`/`SortControl`.
- A component that writes raw `<input>`/`<button>` with its own class
  string (in spine territory) is a bug by construction.

## Empty states

- Operational pages: the generic centered pattern (honest, one action).
- **Product-shaped empty states (RC5 §25)** where the object's chrome
  genuinely explains the product: the Founders dashed "Post the first
  bounty" stage, the Culture labelled sample poster wall, the Bidception
  sample allocation tree, the Bidthrone ghost ledger. These are explicit
  visual explanations, not fake activity.

## Mobile rules

- Single column; one primary action; 44px minimum touch targets; 16px
  body text on mobile; no horizontal page scroll; dense tables scroll
  locally. The header chrome is the single menu (above).

## Accessibility

- WCAG AA in light and dark for every text token on every surface
  (measured by `scripts/contrast-audit.test.mjs`); product-object text
  uses object-safe values that clear AA on their pinned object background.
- Color never the only signal: every sample label is TEXT, every progress
  bar exposes its count in text, badges carry labels.
- One `h1` per page; visible focus; keyboard navigation; `aria-current`
  on active nav; `prefers-reduced-motion` honored.

## Brand personality

- **FoundersBid** — *the workshop.* Warm paper, manila tickets, copper
  accent, Newsreader headlines; declarative operator copy.
- **CultureBid** — *the creative studio.* Lilac page, white posters,
  violet accent, editorial serif headlines; rules before anyone starts.
- **Bidception** — *the systems console.* Cool slate page over a dark
  graphite header bar, teal accent, Outfit 700 tight headlines, the
  allocation tree as the hero object.
- **Bidthrone** — *the hall of record.* Dark archival ledger, violet
  accent, serif record typography, case-file profiles; earned, never
  bought.

## Explicitly Prohibited

- Fake counters, fake users, fake bids/entries, fake activity, fake
  scores, fake market prices, fake leaderboard values.
- UI implying payment where none is verified; "paid" badges without
  server-side provider verification.
- Casino/gambling visual language; excessive animation.
- Remote media in product objects (Unsplash etc.); CSP weakening; Google
  Fonts.
- Product-object styling inside controls, forms, admin, payment, security
  or lifecycle surfaces (Layer B never touches Layer A).
- Raw hex/static gradients/shadows in TSX outside the marked product-
  object classes.
- Pay-to-rank language, "crown", "outbid", "hype", legacy "listings",
  unlabelled monetary examples, em dashes in rendered public copy
  (`scripts/public-copy.test.mjs`).
