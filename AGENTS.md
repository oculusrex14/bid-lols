# AGENTS.md — Bid Network

## 1. Mission

This repository will become the **Bid Network**, a bounty platform across four domains:

- `foundersbid.lol` — startup work, projects, bounties
- `culturebid.lol` — creative bounties
- `bidception.lol` — nested / team bounties
- `bidthrone.lol` — reputation / discovery umbrella

The legacy pay-to-rank boards and The Crown are superseded product, not the target. What to keep, remove, or verify from the legacy codebase is recorded in `docs/LEGACY_MIGRATION.md`.

## 2. Source-of-truth priority

Read in this order:

1. `AGENTS.md`
2. `docs/STATE.md`
3. Active `docs/phases/PHASE_*.md`
4. `docs/01_ARCHITECTURE.md`
5. Only supporting documents required for the current task

The active phase specification overrides older product code. **Legacy code is not a product specification.**

## 3. Document map

- `00_PRODUCT` — product, personas, board rules
- `01_ARCHITECTURE` — stack, routing, server functions, middleware
- `02_DATA_MODEL` — tables, ownership, state machines
- `03_DESIGN_SYSTEM` — visual language, components, tokens
- `04_PAYMENTS_AND_TRUST` — payment flows, webhooks, money invariants
- `05_SECURITY` — auth, secrets, abuse controls
- `ROADMAP` — phase ordering and dependencies
- `STATE` — tiny current-state pointer, read at session start
- `phases/PHASE_*` — one file per phase, with acceptance criteria and checklist
- `ops/` — ENVIRONMENT, DEPLOYMENT, DATABASE_MIGRATIONS runbooks
- `archive/` — deprecated legacy product docs (non-authoritative; banners name the successor)
- `prompts/` — reusable task prompts

## 4. Context discipline

- Do not preload every document; read only documents relevant to the current task.
- Search the codebase before opening large files. Do not repeatedly reread unchanged documents.
- Keep `STATE.md` extremely small — it is read on every session.
- Never implement future phases speculatively.

## 5. Engineering discipline

- TypeScript strict; server-side validation of all user input (zod or equivalent).
- Explicit error handling; no silent failures — misconfiguration must fail loudly in production.
- No fake production data, no fake analytics, no hidden traffic multipliers (legacy hype scaling must not reappear in any form).
- No duplicate business logic where avoidable; minimize dependencies.
- Inspect the existing architecture before replacing it.

## 6. Database rules

- Schema changes via migration files only; no manual DDL or destructive mutation against production.
- Migrations must be idempotent, auditable, and production-safe.
- Monetary values in integer minor currency units (cents/paise); never floats.
- Protect referential integrity.

## 7. Payment rules

- Redirects and client-side callbacks never prove payment; provider verification is required server-side.
- Webhooks fail closed: no secret or unverifiable signature means reject.
- Idempotency is required for all money actions; monetary actions are auditable.
- Never trust client-calculated amounts.

## 8. Security

- Secrets are never logged or committed; `.env.local` is never tracked.
- Validate all uploaded and user-controlled input.
- Enforce authorization server-side.
- Rate-limit abuse-sensitive actions where appropriate.
- Prevent privilege escalation.

## 9. Verification

Before declaring work complete:

- `npm run typecheck`, tests, `npm run build`
- Relevant integration checks (Cashfree sandbox round-trip when payments are touched)
- Inspect `git diff`; check for leaked secrets or staged generated output; verify changed routes render

## 10. Documentation

After meaningful work:

- Update `docs/STATE.md` and the active phase checklist
- Record only durable architectural decisions, not trivia

## 11. Git

Never commit: env files, secrets, local databases, generated Vercel output (`.vercel/`), temporary files.
Use focused commits when commits are enabled.

## 12. Scope discipline

A task is not complete until active-phase acceptance criteria pass.
Do not ask to implement unrelated improvements — log them as follow-ups instead.

## Quick reference

```text
mission:     bounties on foundersbid / culturebid / bidception + bidthrone umbrella
truth:       AGENTS.md > STATE.md > active phase > 01_ARCHITECTURE > supporting docs
context:     read on demand; STATE.md stays tiny; no speculative future phases
money:       server-verified only; webhooks fail closed; integer minor units; idempotent
db:          migrations only; auditable; production-safe
security:    secrets never logged/committed; server-side authz; rate-limit abuse paths
done when:   active-phase acceptance criteria pass + §9 checks green
```
