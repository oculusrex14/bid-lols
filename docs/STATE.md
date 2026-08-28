# State

Current phase: RC2 CONTENT + SEARCH DISCOVERY (preview release)
Status: RC2 in flight. Public copy rewritten across the four products; host-scoped blog + four flagship articles; entity-aware metadata (middleware DB layer); culturebid canonical origin moved to www (apex DNS still broken, verified 2026-08-28); JSON-LD (WebSite/Organization/BlogPosting/ProfilePage/ItemList/BreadcrumbList); sitemaps with evergreen + blog + live entities (truthful lastmod); IndexNow key + submit script; search-quality test suite. Stop condition: CLEAN PREVIEW. No production deploy. Funding stays OFF.
Durable memory: docs/handoffs/PHASE_01_HANDOFF.md
Phase 00 foundation: COMPLETE (2026-08-26).
Phase 00.5 alignment: COMPLETE (release SHA 2a8edf7, 2026-08-27).
Phase 00.6 guardrails: COMPLETE (release SHA c50cbdb, 2026-08-27).

Completed:
- Phase 00 (W1–W11): legacy product removed; host-aware surfaces; fail-closed webhook + atomic settlement; truthful analytics; pure build; request-id + JSON envelope; 0009 gated-applied to prod.
- Phase 00.5 (WS0–WS10): clean-SHA production release (2a8edf7, bidthrone-4cgj1bqx4); pre-launch legal truth; four distinct product pages; founding-access capture (0010); branded 404 + host-aware sitemaps; security header baseline; stale-serverFn graceful 404; PGLite excluded from cloud builds; 12 dormant env vars removed.
- Phase 00.6 (WS1–WS7, AD-1): waitlist normalized to people + interests (0011, gated-applied to shared DB, ledger 0002–0011, no data loss); privacy disclosure technically accurate; analytics product origin server-derived + visit-dedup semantics; www→apex 301 for the three DNS-healthy apexes (culturebid excluded pending DNS fix); middleware composition: stale-serverFn 404 keeps code + requestId === x-request-id; GitHub Actions CI gate (Node 24, npm ci → lint → typecheck → test → build, hermetic) green on the release SHA; deliberate indexing policy (home index / legal noindex,follow / 404 noindex) + home-only sitemaps; favicon.ico.
- Phases 01/01B/02/03/04 + RC1: marketplace engine live (bounties/projects/graveyard/team projects/reputation), capability matrix + host redirects, money precision, dedicated leaderboard metrics, gated Bid Index, RC1 copy pass (runtime 949a095, all four domains verified). RC1 still open: R11 (E2E in CI), R6 UI polish (captain picker / child-spec UI), R13 report rebuild.

Last release (RC1 copy pass → production):
- Runtime SHA 949a095 on main; all four domains 200 with plain operational copy; MARKETPLACE_MONEY_LIVE=OFF; BETTER_AUTH_SECRET set on Vercel production.

Next:
- RC2: PREVIEW released from fb25a93 (dpl_8cgy1tSyoZpYsdV37yE9vJTBqbkP), CI green, verification in docs/SEARCH_DISCOVERY_REPORT.md. No production deploy. Follow-ups: GSC/Bing verification (EXTERNAL ACTION), IndexNow first submission, browser pass on the SSO-gated Vercel preview URL.

Blocked / external (non-repo):
- culturebid.lol APEX DNS: public A records still resolve to private IPs (10.10.0.1 / 10.0.1.3) → apex unreachable from the internet; www.culturebid.lol works and is now ALSO the canonical origin (RC2). Exact correction + rollback: docs/ops/DEPLOYMENT.md ("DNS note") and docs/ops/SEARCH_VISIBILITY.md ("CultureBid DNS mode").
- Google Search Console + Bing Webmaster Tools verification for all four properties: EXTERNAL ACTION REQUIRED (docs/ops/SEARCH_VISIBILITY.md). No verification token exists in this repo and none is fabricated.
- Vercel ↔ GitHub Git-integration + GitHub branch protection: browser-side (docs/ops/DEPLOYMENT.md).
- 4 legacy PENDING Cashfree orders: settle only via verified webhook (docs/ops/LEGACY_ORDERS.md).
