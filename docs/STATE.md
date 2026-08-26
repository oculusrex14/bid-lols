# State

Current phase: PHASE_00_FOUNDATION
Status: COMPLETE (2026-08-26)

Completed:
- documentation bootstrap (AGENTS.md contract; 00_PRODUCT; ROADMAP; 01–05; LEGACY_MIGRATION audit; ops/ runbooks)
- Phase 00 (W1–W11): legacy product removed (boards/Crown/swap/hype/portal//spec), host-aware coming-next surfaces on all four domains, fail-closed webhook + atomic claim-guard settlement + FX fallback visibility, truthful views/visits/clicks analytics, pure build (no DB in build; local runtimes hermetic PGLite; Vercel production fails loudly without DATABASE_URL), request-id + JSON error envelope, Grok chrome / auth scaffold / 35 dead deps removed, 83 tests green, 0009_foundation.sql gated-applied to prod, SPEC.md + legacy docs archived
- Production: deployment bidthrone-5e612txbc live on bidthrone.lol (+ www, foundersbid, bidception, www.culturebid) — domain-specific title/canonical/OG/robots/sitemap verified; legacy paths 308 → /; unknown host → bidthrone umbrella; unsigned webhook → 401 fail-closed; prod ledger 0002–0009; row counts unchanged (listings 0 / orders 4 pending / activity 0 / crown_* 0)

Next:
- specify PHASE_01_FOUNDERSBID (docs/phases/PHASE_01_FOUNDERSBID.md). Do NOT start Phase 01 until specified + authorized.

Blocked / external (non-repo):
- culturebid.lol APEX DNS: public A records resolve to private IPs (10.0.1.3 / 10.10.0.1) → apex unreachable from the internet; www.culturebid.lol + all other domains are live. Fix = update the culturebid.lol zone's apex A records to Vercel (DNS provider console) — out of repo scope by design.
- 4 legacy PENDING Cashfree orders: settle only via verified webhook; manual close/expiry = post-Phase 00 ops task.
- Dormant Vercel env vars (VITE_AUTH_ENABLED, NEXT_PUBLIC_*, SUPABASE_*, CASHFREE_ENV) may be deleted from the project.

Do not work on:
- Phase 01+ implementation
- bounty marketplace features
- future gamification

Last verified commit: 803139e (2026-08-26, "Phase 00 docs: amend AC/FR …") + final docs/STATE commit
Last deployment: bidthrone.lol PRODUCTION = deployment bidthrone-5e612txbc (commit 803139e era code, 2026-08-26) — Phase 00 surface live; Vercel preview bidthrone-bnncr7ay7 (build clean; team deployment-protection blocks anonymous probes — verified via local built preview instead).
