# 05_SECURITY.md — Security Requirements

**Status:** Minimum security baseline for the Bid Network, derived from repository inspection. No enterprise theater — only what this app's threat surface requires. Legacy webhook fail-open was classified UNACCEPTABLE and **fixed in Phase 00** (2026-08-26): dedicated `CASHFREE_WEBHOOK_SECRET` only, +/-15 min replay window, constant-time compare, no client-secret fallback.

## Legacy Baseline (verified)

- **No auth in prod today**: `VITE_AUTH_ENABLED=false` in `.grok/app-env.json` (Vercel value unverified — VERIFY item); no route or server function consumes a session. Ownership rests on an unguessable 192-bit `manage_token` (24 random bytes, `makeToken` in `src/lib/ids.ts`).
- **Dormant Better Auth scaffold** in `src/lib/auth/*` (11 files): same-origin isolation check (`isolation.server.ts` — only same-origin or `Site: none` allowed) and a CSRF/origin check on credentialed auth POSTs (`server.ts`). Migration `migrations/auth/0001_auth.sql` never applied. Federates against the platform "Grok auth broker" (`GROK_AUTH_ISSUER`) — REMOVE-by-default per the audit; the two isolation patterns are reusable.
- **All SQL is parameterized** through the single `getSql()` surface (tagged template or `query` with `$n`); no user data interpolated into SQL text.
- **No rate limiting anywhere** (bids, picks, `confirmPayment`, auth).
- **Webhook is open when unconfigured**: `verifyCashfreeWebhook` returns `true` with no secret, otherwise falls back to `CASHFREE_CLIENT_SECRET`; no replay/expiry check (see below).
- Secrets live in `.env.local` (gitignored; verified untracked) and mirrored in Vercel env.

## Minimum Requirements

### Authentication
- Shared accounts are a Phase 00/01 prerequisite (sponsor/participant attribution). Phase 00 decision (recorded in `phases/PHASE_00_FOUNDATION.md`): remove the Grok-coupled Better Auth scaffold (verified unused) and adopt the `users`/`sessions` tables from `02_DATA_MODEL` as the identity foundation; no user-facing auth UI until Phase 01.
- Slow-hash password storage (argon2/bcrypt) if email/password is chosen. No session data in localStorage (legacy Crown device token pattern is not a model to follow).

### Session Management
- Server-side session store (`sessions` table with `expires_at`) or signed cookie; `HttpOnly`, `Secure`, `SameSite=Lax`.
- Absolute + idle expiry; logout invalidates server-side; session rotation on privilege change.

### Authorization
- Enforced **server-side** in every server function, webhook handler, and admin route — never in the UI layer.
- Capability checks against stored identity: owner/sponsor/participant/admin; resource-scoped (own order, own listing, own bounty). Fail closed on unknown state.

### CSRF (where applicable)
- Cookie-authenticated state-changing POSTs require origin validation: same-origin or `Site: none` (reuse the `isolation.server.ts` check). The signature-verified webhook is exempt by design.

### XSS
- React auto-escaping stays the baseline; `dangerouslySetInnerHTML` only for static constants (today: the mode-boot script in `__root.tsx`).
- User-supplied text (titles, taglines, handles, submission content) renders as text only; no HTML parsing of user input anywhere.

### SQL / database safety
- Parameterized queries only, via `getSql()` — the existing convention, kept as hard rule.
- No dynamic table/column names from input; migrations are the only DDL path (see `01_ARCHITECTURE` deployment split).

### Webhook verification
- **UNACCEPTABLE (must fix in Phase 00): fail-open when the secret is missing, and the client-secret fallback.** Target: reject (401) on missing secret, missing/invalid signature, or unverifiable signature; dedicated `CASHFREE_WEBHOOK_SECRET` verified as set on Vercel.
- Timestamp freshness window (±15 min) to bound replay; idempotent handling keyed on provider event/order id so duplicate deliveries never double-settle.

### Payment tampering
- Amounts and order identity are server-computed; the local order id doubles as the provider order id, so a webhook for order X can only affect X.
- Settlement re-queries the provider (existing `cashfreeOrderIsPaid` pattern — keep); never trust client-claimed payment state or client-carried `gatewayLive`/amount values (legacy `payload` fields are informational only).
- Settlement is atomic (claim-guard on status, one-transaction effect+status) so concurrent webhook + client re-poll cannot double-apply.

### IDOR
- Legacy `manage_token` URLs: the manage/listing routes are removed in Phase 00, so no token-authenticated read surface remains; the 192-bit tokens stay only in archived `listings` data. No enumeration-friendly sequential ids exist (ids are prefixed random hex).
- New resources: ownership enforced by `user_id` scoping server-side; list views return only authorized rows.

### Rate limiting
- Server-side limits on abuse-sensitive paths: auth attempts, order creation, payment confirmation, public search/query endpoints. Per IP and per authenticated user; 429 + `Retry-After`. Implementation may be in-app counter (table or shared store) — no new infrastructure beyond that.

### Brute force
- Auth: per-account + per-IP attempt caps with backoff; uniform "invalid credentials" responses (no user enumeration).
- Manage-token and webhook endpoints: nothing to add beyond the above (token entropy and signature verification are the controls).

### Spam
- Bounded-input validation (zod at every boundary, clamps like existing `clampSocials`), email verification before a profile is publicly linked, rate-limited entry/submission endpoints, admin removal path. No fake volume (product principle) removes the incentive for most spam.

### File upload safety
- Applies when uploads land (CultureBid submissions, FoundersBid deliverables). Provider behind a `StorageAdapter` (see `01_ARCHITECTURE`); MIME-sniff + extension allowlist, size caps, non-executable storage outside the app's static origin, sanitized filenames. Until then: no upload endpoints exist — do not add ad hoc ones.

### URL validation
- User-supplied URLs (bounty URLs, submission links, socials): parse with `URL`, allow http/https only, reject userinfo and control characters; `urlKey` normalization kept.
- Server-side fetches: **allowlisted hosts only** (Cashfree API, FX API). No server-side fetch of arbitrary user URLs.

### SSRF risks
- Today: none material — server-side fetch targets are two fixed hosts.
- Rule: any future server-side fetch of user-influenced content (preview generation — `preview-thumbnail.mjs` exists; image proxies) must resolve to a public address, block private/loopback/link-local ranges, cap redirects, and use a short timeout.

### Secret management
- `.env.local` local-only, never committed (existing rule, verified clean); production secrets only in Vercel env vars.
- No secrets in source, committed files, logs, client bundles, or error responses; no secrets in `VITE_`-prefixed vars (they ship to the browser); webhook secret is dedicated and separate from API credentials.

### Logs
- Structured server logs with request id, route, actor (where known), outcome.
- No secrets, tokens, full payment payloads, or PII in logs; webhook raw bodies logged as hash/length only.
- Settlement attempts (success and failure) additionally recorded in `audit_events`.

### Admin access
- Minimal admin capability when first needed (order inspection, refund action, user suspension, content removal); behind an admin role checked server-side; every admin mutation audit-logged. No general-purpose admin dashboard in Phase 00.

### Privilege escalation
- Role/status transitions only through server-side code paths (no client-supplied role, status, or amount fields reach the database).
- Ownership changes (listing/bounty transfer, sponsor assignment) are explicit audited actions; `confirmPayment` re-derives state from the provider, never from request payload.

### Audit logging
- `audit_events` (Phase 00) covers: auth lifecycle events, every monetary transition (create/paid/refunded/disputed), admin mutations, and webhook receipt/verification outcomes.
- Append-only; retention ≥12 months for money-related events; queryable via shared admin.

### Dependency review
- `npm audit` at each phase gate; remove unused dependencies (audit lists 9: recharts, @tanstack/react-table, react-hook-form, @hookform/resolvers, cmdk, vaul, date-fns, react-day-picker, zustand) in Phase 00.
- New dependencies require review (license, maintenance, supply chain); prefer stdlib/zero-dep for small utilities; re-evaluate the pinned Nitro beta before the Phase 01 release.

### Production error exposure
- Client-facing errors: generic message + correlation id (extend existing `error-component.tsx`); no stack traces, SQL, env values, or provider error bodies in responses.
- Webhook failure responses carry no internal detail; 4xx/5xx structured logs keep the context server-side.

### Abuse reporting
- When user content is public (Phase 01+), provide a report action per item: stored with reporter identity, target, and reason; handled via admin queue; outcomes logged. No public abuse-report endpoints in Phase 00.

### Bot/fraud considerations
- Rate limits + email verification + honeypot fields on entry forms are the baseline anti-bot stack.
- Anti-fraud: no seeded/fake activity (product rule); monitor concentration signals (many orders from one IP/device/payment instrument) in admin views; `users.status='suspended'` blocks entry and payout paths.

### Content-Security-Policy (RC3 audit, 2026-08-28)
`server/middleware/00-security-headers.ts` (deployed runtimes only; dev HMR deliberately exempt) emits, on every `text/html` response:

```
default-src 'self'; script-src 'self' 'nonce-<per-request>';
style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;
connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';
frame-ancestors 'none'
```

plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a Permissions-Policy denying camera/microphone/geolocation/interest-cohort. HSTS is Vercel's on production domains (we never emit it; no `includeSubDomains`, no preload — CultureBid DNS). Audit outcome:

- `script-src`: no `unsafe-inline`; the SSR-emitted inline scripts receive a per-request nonce. Tightest feasible.
- `style-src 'unsafe-inline'`: **kept, audited and justified** — sonner (toast library) injects a runtime `<style>` element and the Toaster passes inline `style` objects to toast options; both require `unsafe-inline` and no per-request nonce alternative exists in sonner 2.x. Re-audit if the toaster is replaced or sonner gains nonce support.
- `img-src 'self' data:`: **not loosened** — this is why graveyard listing screenshots are stored (validated https URLs, max 6) but not rendered today (RC3 spec 7.2). Remote screenshot display needs an image proxy or a deliberate `img-src` expansion with subdomain pinning; that is a future explicit decision, not a silent relaxation.
- `connect-src 'self'`, `form-action 'self'`, `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'none'`: unchanged, verified in the preview/production smoke battery.


## RC4: trust-layer security

- Only trusted server services write trust_events; there is NO generic createTrustEvent endpoint and client input can never supply score, weight, severity, or outcome values (RC4 §9/§68).
- Admin adjudication (structured dispute resolution) is audited in audit_events; admins may correct FACTS via reversal events but can never type a score.
- trust_risk_flags with SUSPECTED states have zero effect on Bid Index until confirmed through adjudication (prevents false-positive punishment).
- Blind reciprocal review reveal shares one eligibility definition between the public review listing and scoring evidence; a hidden review cannot leak through HTML, server functions, or score breakdowns.
- Verification scaffolding (verification_cases/events) has no public surface and TRUST_VERIFICATION_LIVE remains 0; payment could never move the score.
- IDOR/authorization: /settings/trust is session-scoped; public trust blocks expose aggregates only; private disputed amounts stay private.
