# State

Current phase: RC3 NETWORK SPINE / UI V2
Status: IMPLEMENTING (branch rc3-network-spine from main @ 7315ad0)
Production: RC1 runtime (SHA lineage 949a095); RC2 is preview-only (dpl_G6Xj5WcTK6zm6rkMB3QYQYQ7bwkB)
Funding: OFF (no MARKETPLACE_MONEY_LIVE on any target; stays OFF through RC3)
Objective: correctness/security/complexity remediation + shared Network Spine design system + UI V2 for all four products + Playwright E2E in CI + verified production release
Next: execute RC3 workstreams (docs/phases/RC3_NETWORK_SPINE.md)
Blocked: only verified external blockers

Completed:
- Phase 00 (W1–W11): legacy product removed; host-aware surfaces; fail-closed webhook + atomic settlement; truthful analytics; pure build; request-id + JSON envelope; 0009 gated-applied to prod.
- Phase 00.5 (WS0–WS10): clean-SHA production release (2a8edf7, bidthrone-4cgj1bqx4); security header baseline; PGLite excluded from cloud builds.
- Phase 00.6 (WS1–WS7, AD-1): waitlist normalized (0011, gated-applied to shared DB, ledger 0002–0011); www→apex 301 (culturebid excluded); GitHub Actions CI gate (Node 24, hermetic) green; deliberate indexing policy + sitemaps.
- Phases 01/01B/02/03/04 + RC1: marketplace engine live; capability matrix + host redirects; money precision; RC1 copy pass (runtime 949a095). RC1 open: R6 UI polish (partially RC3), R11 E2E in CI (RC3), R13 report rebuild (RC3).
- RC2 CONTENT + SEARCH DISCOVERY: preview-only release from fb25a93/558a006 (dpl_G6Xj5WcTK6zm6rkMB3QYQYQ7bwkB). Copy rewrite to RC2 voice; host-scoped blog + 4 articles; entity-aware metadata; canonical origins (CultureBid = www while apex DNS broken); JSON-LD; sitemaps (evergreen + blog + live entities, truthful lastmod); robots (OAI-SearchBot allowed); IndexNow key + submit script; search-quality test suite. Report: docs/SEARCH_DISCOVERY_REPORT.md.

Last release (production): RC1 copy pass, runtime 949a095, all four domains 200, MARKETPLACE_MONEY_LIVE=OFF, BETTER_AUTH_SECRET on Vercel production only.

Blocked / external (non-repo):
- culturebid.lol APEX DNS: public A records resolve to private IPs (10.10.0.1 / 10.0.1.3, re-verified 2026-08-28) → apex unreachable; www.culturebid.lol is the canonical CultureBid origin. Fix + rollback: docs/ops/DEPLOYMENT.md ("DNS note") + docs/ops/SEARCH_VISIBILITY.md ("CultureBid DNS mode").
- Google Search Console + Bing Webmaster Tools verification for all four properties: EXTERNAL ACTION REQUIRED (docs/ops/SEARCH_VISIBILITY.md). No verification token in this repo; none fabricated.
- Vercel ↔ GitHub git integration + branch protection: browser-side (docs/ops/DEPLOYMENT.md).
- 4 legacy PENDING Cashfree orders: settle only via verified webhook (docs/ops/LEGACY_ORDERS.md).
