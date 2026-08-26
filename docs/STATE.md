# State

Current phase: PHASE_00_5_ALIGNMENT
Status: implementation complete — clean-SHA release in progress (2026-08-27)
Phase 00 foundation: COMPLETE (2026-08-26).

Completed:
- Phase 00 (W1–W11): legacy product removed; host-aware surfaces; fail-closed webhook + atomic settlement; truthful analytics; pure build; request-id + JSON envelope; 0009 gated-applied to prod.
- Phase 00.5 (WS0–WS9): Phase 00 chain pushed to GitHub (origin/main, fast-forward, no force-push); legal copy rewritten to pre-launch truth (no legacy product language — regression-tested); four distinct pre-launch product pages with labelled EXAMPLE/DEMO content; founding-access capture (email + role + host-derived origin + consent; honeypot + per-IP rate limit + email uniqueness; migration 0010 gated-applied); header CTA primary / theme secondary; DNS-safe cross-links for culturebid; host-aware sitemaps + branded 404 (HTTP 404, noindex,follow, no canonical for missing paths); graceful stale-serverFn 404 instead of unhandled 500; security header baseline (non-permissive CSP with per-request nonces, nosniff, referrer, permissions); PGLite excluded from cloud build output (loud cloud misconfig); dormant Vercel env vars removed (12).

Next:
- finish the release: push 00.5 chain, Vercel preview + production deploy from the clean pushed SHA, verify domains/logs, mark the phase checklist COMPLETE.
- then: specify PHASE_01_FOUNDERSBID. Do NOT start Phase 01 until specified + authorized.

Blocked / external (non-repo):
- culturebid.lol APEX DNS: public A records resolve to private IPs → apex unreachable from the internet; www.culturebid.lol works. Exact correction + verification in docs/ops/DEPLOYMENT.md ("DNS note"). Until fixed, clickable cross-links use www.culturebid.lol.
- Vercel ↔ GitHub Git-integration: needs the Vercel GitHub App installed for the account (browser-side). Until then releases are CLI deploys from the clean pushed SHA (docs/ops/DEPLOYMENT.md, "Releasing from a clean SHA").
- 4 legacy PENDING Cashfree orders: settle only via verified webhook — operational runbook in docs/ops/LEGACY_ORDERS.md.

Do not work on:
- Phase 01+ implementation / bounty marketplace features / future gamification

Last release: see docs/phases/PHASE_00_5_ALIGNMENT.md completion notes.
