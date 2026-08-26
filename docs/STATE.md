# State

Current phase: PHASE_00_FOUNDATION
Status: IMPLEMENTATION_IN_PROGRESS (code complete locally; prod migration + deploys pending)

Completed:
- documentation bootstrap (AGENTS.md contract; 00_PRODUCT; ROADMAP; 01–05; LEGACY_MIGRATION audit; ops/ runbooks)
- Phase 00 code: W1 legacy removal, W2 truthful analytics, W3 fail-closed webhook + atomic claim-guard settlement, W4 repo/grok/auth/deps cleanup, W5 pure build + hermetic PGLite + prod fail-loud, W6/W7/W8 host-aware coming-next + SEO (host-seo middleware + dev plugin + shared source), W9 request-id + JSON error envelope, W10 tests (83 green), 0009_foundation.sql authored (NOT yet applied to prod), W11 archives + doc amendments
- local gates green: typecheck, lint, test, pure build, dev :8080 + preview :8081 smoke (baselines regenerated)

Current objective:
- gated prod migration 0009 + row-count snapshot, then Vercel preview verify, then prod deploy + 4-domain verification per docs/ops/DEPLOYMENT.md

Next:
- `DATABASE_URL=… node scripts/migrate.mjs --dry-run` then apply; Vercel env existence check (CASHFREE_WEBHOOK_SECRET, CASHFREE_MODE=production, DATABASE_URL); preview deploy + probes; prod deploy; domain/SEO/log verification; STATE → COMPLETE

Blocked:
- none known

Do not work on:
- Phase 01+
- bounty marketplace features
- future gamification

Last verified commit: 791fdbc (2026-08-26, "Phase 00: foundation — host-aware coming-next surfaces, fail-closed payments, truthful analytics, safe build")
Last deployment: bidthrone.lol production still on commit fdc55e0 (legacy pay-to-rank + Crown surface) — Phase 00 not yet live.
Live check 2026-08-26 (dev env): bidthrone.lol 200; foundersbid/bidception.lol 302 → legacy paths; culturebid.lol apex DNS anomaly from dev env (www OK) — re-verify from Vercel after deploy.
