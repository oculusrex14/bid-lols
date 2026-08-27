# State

Current phase: PHASE_00_5_ALIGNMENT
Status: COMPLETE (deployed + verified 2026-08-27)
Phase 00 foundation: COMPLETE (2026-08-26).

Completed:
- Phase 00 (W1–W11): legacy product removed; host-aware surfaces; fail-closed webhook + atomic settlement; truthful analytics; pure build; request-id + JSON envelope; 0009 gated-applied to prod.
- Phase 00.5 (WS0–WS10): Phase 00 chain pushed to GitHub; production now deployed from one clean pushed SHA (no gitDirty); legal copy rewritten to pre-launch truth (regression-tested, legacy terms gone from all public copy); four distinct pre-launch product pages with labelled EXAMPLE/DEMO content; founding-access capture (email + role + host-derived origin + consent; honeypot + rate limit + email uniqueness; 0010 gated-applied); CTA-primary header; DNS-safe cross-links; host-aware sitemaps + branded themed 404 (noindex,follow, no canonical for missing paths); stale-serverFn graceful 404 + JSON-route 500→404 quirk relabel; security header baseline (non-permissive CSP w/ per-request nonces, HSTS untouched); PGLite excluded from cloud build (loud cloud misconfig); 12 dormant env vars removed; ops docs (clean-SHA release protocol, DNS correction, legacy-order runbook).

Last release:
- Pushed branch: main @ github.com/oculusrex14/bid-lols
- Release SHA: 2a8edf7c11f04095134eb42b3a14f05989330805 (== origin/main at deploy; tree clean)
- Production deployment: bidthrone-4cgj1bqx4 (dpl_J5L1EUDD82U4RwQC2TrPZnsjmL8X), Ready, githubCommitSha=2a8edf7…, no gitDirty
- Preview deployment: bidthrone-t459jdsgj (same SHA, clean)
- Prod verified: 3/4 apex + all 4 www serve the new surfaces; legal pages CLEAN; unknown route → 404 branded/noindex/no-canonical; per-host sitemaps; security headers + CSP nonces; stale serverFn → 404 (warn, no unhandled); unsigned webhook → 401; waitlist validates with 0 prod rows written; logs clean. Evidence: docs/phases/PHASE_00_5_ALIGNMENT.md "Completion notes".

Next:
- specify PHASE_01_FOUNDERSBID (docs/phases/PHASE_01_FOUNDERSBID.md). Do NOT start Phase 01 until specified + authorized.

Blocked / external (non-repo):
- culturebid.lol APEX DNS: public A records still resolve to private IPs (10.10.0.1 / 10.0.1.3) → apex unreachable from the internet; www.culturebid.lol works. Exact correction + verification: docs/ops/DEPLOYMENT.md ("DNS note"). Re-check after the registrar change; then optionally normalize linkOrigin() back to apex-only.
- Vercel ↔ GitHub Git-integration: needs the Vercel GitHub App installed for the account (browser-side). Until then releases are CLI deploys from the clean pushed SHA (docs/ops/DEPLOYMENT.md, "Releasing from a clean SHA").
- 4 legacy PENDING Cashfree orders: settle only via verified webhook — runbook in docs/ops/LEGACY_ORDERS.md.

Do not work on:
- Phase 01+ implementation / bounty marketplace features / future gamification
