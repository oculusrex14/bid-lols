# State

Current phase: RC1 PRODUCT COMPLETION (copy pass released)
Status: RC1 copy rewrite deployed to production. All four domains show plain, warm, operational marketplace copy. Runtime SHA: 0408bea. No aggressive marketing, no "throne", no "coming next". Funding remains OFF.
Durable memory: docs/handoffs/PHASE_01_HANDOFF.md
Phase 00 foundation: COMPLETE (2026-08-26).
Phase 00.5 alignment: COMPLETE (release SHA 2a8edf7, 2026-08-27).
Phase 00.6 guardrails: COMPLETE (release SHA c50cbdb, 2026-08-27).

Completed:
- Phase 00 (W1–W11): legacy product removed; host-aware surfaces; fail-closed webhook + atomic settlement; truthful analytics; pure build; request-id + JSON envelope; 0009 gated-applied to prod.
- Phase 00.5 (WS0–WS10): clean-SHA production release (2a8edf7, bidthrone-4cgj1bqx4); pre-launch legal truth; four distinct product pages; founding-access capture (0010); branded 404 + host-aware sitemaps; security header baseline; stale-serverFn graceful 404; PGLite excluded from cloud builds; 12 dormant env vars removed.
- Phase 00.6 (WS1–WS7, AD-1): waitlist normalized to people + interests — one email, many coexisting product/role intents (migration 0011, additive + backfilled, gated-applied to the shared DB: ledger 0002–0011, no data loss, running 00.5 production unaffected); privacy disclosure technically accurate (transient in-memory IP processing, not persisted, no advertising/profiling); analytics product origin server-derived (client payload carries nothing) + deliberate, tested visit-dedup semantics + precise metric docs (visits ≠ unique visitors; no public stats exposure); www→apex 301 for the three DNS-healthy apexes (app-level in all runtimes — vercel.json host-scoped redirects are schema-rejected; culturebid excluded pending its DNS fix); middleware composition: stale-serverFn 404 keeps code + refresh message + requestId === x-request-id after the full chain (a latent body-consumption defect in the specific-envelope branch was caught by the integration test and fixed), boundary-aware unknown-route classification, Cashfree ignored-path request-id consistency (regression-tested); GitHub Actions CI gate (Node 24, npm ci → lint → typecheck → test → build, hermetic, no secrets) green on the release SHA; deliberate indexing policy (home index,follow / legal noindex,follow / 404 noindex,follow) + home-only sitemaps; favicon.ico (valid PNG-in-ICO from the SVG, generator script, SVG kept).

Last release (Phase 00.6 → production cutover):
- Production deployment: dpl_E9k1ajtFZzGT6UJ9pFP8zqeiRpDT (bidthrone-91lotrdjf), READY, deployed from the exact audited SHA c50cbdbf2342e71eb6be78c61a7ebd05e9e9ce3e (clean detached checkout; no gitDirty). Aliased to all four apex + www hosts.
- CI: run 33038698521 SUCCESS on the release SHA (lint, typecheck, test, build).
- Production verification (2026-08-27): apex 200s + correct product titles (bidthrone/foundersbid/bidception + www.culturebid.lol); www→apex 301 on the 3 healthy apexes (path+query preserved; culturebid excluded by design); legal pages with the 00.6 privacy truth; home-only sitemaps; favicon.ico 200; branded HTML 404; unknown-JSON 404 envelope with requestId === x-request-id; CSP nonce + frame-ancestors 'none' (no X-Frame-Options by design); stale serverFn → 404 stale_client_bundle with matching ids; unsigned Cashfree webhook → 401 invalid_signature; waitlist live round-trip: ONE person, TWO coexisting interests (foundersbid/builder + bidthrone/sponsor), repeat submit updated in place; analytics per-site counters incremented from real page loads; 0 × 5xx in the last 100 runtime events.
- One operational waitlist row from cutover verification: ops-cutover@bidthrone.lol (1 person, 2 interests) — deliberate ops record, not a fabricated signup.

Next:
- PHASE_01_FOUNDERSBID: specify (docs/phases/PHASE_01_FOUNDERSBID.md) → implement → release per the full phase loop.

Blocked / external (non-repo):
- culturebid.lol APEX DNS: public A records still resolve to private IPs (10.10.0.1 / 10.0.1.3) → apex unreachable from the internet; www.culturebid.lol works. Exact correction + verification: docs/ops/DEPLOYMENT.md ("DNS note"). The www→apex 301 is deliberately EXCLUDED for culturebid until the apex is verified reachable; linkOrigin() still routes culturebid cross-links through www.
- Vercel ↔ GitHub Git-integration: needs the Vercel GitHub App installed for the account (browser-side). Until then releases are CLI deploys from the clean pushed SHA.
- GitHub branch protection (require CI status on main, no force pushes): recommended in docs/ops/DEPLOYMENT.md; applies in the browser if the account lacks API permission.
- 4 legacy PENDING Cashfree orders: settle only via verified webhook — runbook in docs/ops/LEGACY_ORDERS.md.
