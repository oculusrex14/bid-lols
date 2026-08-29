# State

Current phase: RC3 NETWORK SPINE / UI V2
Status: COMPLETE (production release; see docs/reports/RC3_NETWORK_SPINE_REPORT.md)
Production: RC3 runtime + style-consistency pass (app SHA 48d5ba3; deployment dpl_7hLTtmKTR3vPwt2o5z3CbQZctkeE / bidthrone-nff5xd2fw; previous good deployment dpl_E2UdhbQVjJq3kPqKRBHaLCk8MhUQ)
Funding: OFF (no MARKETPLACE_MONEY_LIVE on any target; nothing takes payment)
Objective: complete
Next: post-RC3 product growth / real marketplace liquidity (GSC/Bing verification, IndexNow first submission remain operator follow-ups)

RC3 summary:
- Correctness: graveyard detail status regression (controls restored via graveyardControls matrix), bounty-detail `undefined` H1 (missing `b.title` projection), graveyard includes-checkbox silent drop, bidception allocate-form missing `kind`, apply/submit feedback lost on serverFn remount — each with regression tests.
- Security: authz session failures fail visibly (auth_unavailable + log; never silent-anonymous), Cashfree consolidated into payments/provider.ts (single credential/host/signature/replay/status source; dead Phase 00 rail removed), webhook battery extended, dev-endpoint production-simulation tests pinned, /.well-known/security.txt host-aware, CSP audit documented, Dependabot + CodeQL + pinned actions + npm audit --omit=dev gate.
- Complexity: measured audit (before/after snapshots in docs/reports/) — CC max 38→15, 0 functions > 120 lines, gate enforced in CI (production code only); hotspots refactored by business responsibility.
- Network Spine: ui/ primitives (Button/Field/Money/Status/Identity/states/layout/market/data/Review), layout canvases, product accents (contrast-verified light+dark), hairline surfaces, one status/money/identity treatment.
- UX V2: FoundersBid marketplace-first (hero preview, browse rows + URL filters, 8/4 detail, 5-step creation with conditional reward fields, /post chooser); CultureBid format-first (browse cards, "What are you commissioning?" create + brief step); Bidception workspace (work-unit tree, reconciling BudgetBar, searchable eligible-captain picker, kind+spec allocation form); Bidthrone data-first (home boards, dense leaderboards with skills, Bid Index DataTable with Insufficient-sample gates); auth-aware CTAs; product-aware theme-color; network switcher.
- E2E in CI: marketplace journey (fake provider; never real rails) + 38 cross-product critical paths; visual QA harness (48 captures, 0 problems at 390/768/1440, incl. accent/border/CTA/theme-color assertions).
- Style-consistency pass (2026-08-29, post-release): dark-mode product chrome bug fixed. `data-theme` is now rendered on `<html>` at SSR (root loader) and the dark skins use compound `html[data-mode="dark"][data-theme=…]` selectors, so page/background/header/footer theme as one in light AND dark (no more bidthrone-dark bleed onto the other three skins). All raw legacy control skins (auth, profile, waitlist, create-parent, post-chooser, 404, legal, admin) collapsed onto the spine Button/ButtonLink + Field/Input/Select/CheckRow primitives (single 8px control radius, token focus, accent checkboxes); dead `--shadow-border` + the one `shadow-lg` removed (spine is shadow-free); off-canvas `max-w-*` page containers moved to the `.canvas-*` rhythm; stray 2px table dividers → hairline; unused illustration components retired. 03_DESIGN_SYSTEM.md updated to pin the spine as the single control skin.

Previous phases:
- Phase 00 (W1–W11), 00.5 (2a8edf7), 00.6 (c50cbdb): foundation, clean-SHA release, guardrails.
- Phases 01/01B/02/03/04 + RC1 (949a095): marketplace engine, capability matrix, money precision, copy pass.
- RC2 (search discovery — copy voice, blog, entity metadata, canonical origins, JSON-LD, sitemaps, IndexNow) shipped to production together with RC3's deploy.

Blocked / external (non-repo):
- culturebid.lol APEX DNS: public A records still resolve to private IPs (10.10.0.1 / 10.0.1.3, re-verified 2026-08-29) → apex unreachable; www.culturebid.lol is the canonical CultureBid origin. Fix + rollback: docs/ops/DEPLOYMENT.md ("DNS note").
- Google Search Console + Bing Webmaster Tools verification for all four properties: EXTERNAL ACTION REQUIRED (docs/ops/SEARCH_VISIBILITY.md).
- Vercel ↔ GitHub git integration + branch protection: browser-side (docs/ops/DEPLOYMENT.md).
- 4 legacy PENDING Cashfree orders: settle only via verified webhook (docs/ops/LEGACY_ORDERS.md).
- `vercel curl -X POST` beta cannot deliver request bodies (webhook POST probes return a proxy-side 500 with no function invocation) — verify the webhook through real curl against the identical local built artifact (documented in the RC3 report).