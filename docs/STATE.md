# State

Current phase: PHASE_00_6_FOUNDATION_GUARDRAILS
Status: COMPLETE at source level (2026-08-27) — release SHA pushed, CI green, Vercel preview live; **NO production deploy** (explicit directive; STOP for external audit of the SHA)
Phase 00 foundation: COMPLETE (2026-08-26).
Phase 00.5 alignment: COMPLETE (deployed + verified 2026-08-27, release SHA 2a8edf7).

Completed:
- Phase 00 (W1–W11): legacy product removed; host-aware surfaces; fail-closed webhook + atomic settlement; truthful analytics; pure build; request-id + JSON envelope; 0009 gated-applied to prod.
- Phase 00.5 (WS0–WS10): clean-SHA production release (2a8edf7, bidthrone-4cgj1bqx4); pre-launch legal truth; four distinct product pages; founding-access capture (0010); branded 404 + host-aware sitemaps; security header baseline; stale-serverFn graceful 404; PGLite excluded from cloud builds; 12 dormant env vars removed.
- Phase 00.6 (WS1–WS7, AD-1): waitlist normalized to people + interests — one email, many coexisting product/role intents (migration 0011, additive + backfilled, gated-applied to the shared DB: ledger 0002–0011, no data loss, running 00.5 production unaffected); privacy disclosure technically accurate (transient in-memory IP processing, not persisted, no advertising/profiling); analytics product origin server-derived (client payload carries nothing) + deliberate, tested visit-dedup semantics + precise metric docs (visits ≠ unique visitors; no public stats exposure); www→apex 301 for the three DNS-healthy apexes (app-level in all runtimes — vercel.json host-scoped redirects are schema-rejected; culturebid excluded pending its DNS fix); middleware composition: stale-serverFn 404 keeps code + refresh message + requestId === x-request-id after the full chain (a latent body-consumption defect in the specific-envelope branch was caught by the integration test and fixed), boundary-aware unknown-route classification, Cashfree ignored-path request-id consistency (regression-tested); GitHub Actions CI gate (Node 24, npm ci → lint → typecheck → test → build, hermetic, no secrets) green on the release SHA; deliberate indexing policy (home index,follow / legal noindex,follow / 404 noindex,follow) + home-only sitemaps; favicon.ico (valid PNG-in-ICO from the SVG, generator script, SVG kept).

Last release (Phase 00.6):
- Pushed branch: main @ github.com/oculusrex14/bid-lols (fast-forward only, no force-push)
- Release SHA: c50cbdbf2342e71eb6be78c61a7ebd05e9e9ce3e (== origin/main at deploy; tree clean; 8 focused commits on top of 36906df)
- CI: run 33038698521 (push) = SUCCESS on the release SHA — lint, typecheck, test (498 mjs + 127 ts), build all green; a prior run (33038285395) was green on the superseded SHA 495dedd
- Preview deployment: bidthrone-blm1i9ar8 (READY, githubCommitSha=c50cbdb…, no gitDirty)
- Production: **unchanged** — still bidthrone-4cgj1bqx4 @ 2a8edf7 (Phase 00.5). 0011 is additive, so the live 00.5 app and the 00.6 preview coexist on the shared DB without conflict.
- Evidence: docs/phases/PHASE_00_6_FOUNDATION_GUARDRAILS.md "Completion notes".

Next:
- EXTERNAL AUDIT of release SHA c50cbdb (this phase deliberately stops here — no production deploy).
- after the audit passes and cutover is authorized: deploy Phase 00.6 to production from the clean SHA; then re-verify the culturebid www/apex behavior (www 301 stays OFF until the apex DNS is fixed).
- then: specify PHASE_01_FOUNDERSBID (docs/phases/PHASE_01_FOUNDERSBID.md). Do NOT start Phase 01 until specified + authorized.

Blocked / external (non-repo):
- culturebid.lol APEX DNS: public A records still resolve to private IPs (10.10.0.1 / 10.0.1.3) → apex unreachable from the internet; www.culturebid.lol works. Exact correction + verification: docs/ops/DEPLOYMENT.md ("DNS note"). The www→apex 301 is deliberately EXCLUDED for culturebid until the apex is verified reachable; linkOrigin() still routes culturebid cross-links through www.
- Vercel ↔ GitHub Git-integration: needs the Vercel GitHub App installed for the account (browser-side). Until then releases are CLI deploys from the clean pushed SHA.
- GitHub branch protection (require CI status on main, no force pushes): recommended in docs/ops/DEPLOYMENT.md; applies in the browser if the account lacks API permission.
- 4 legacy PENDING Cashfree orders: settle only via verified webhook — runbook in docs/ops/LEGACY_ORDERS.md.

Do not work on:
- Phase 01+ implementation / bounty marketplace features / future gamification
