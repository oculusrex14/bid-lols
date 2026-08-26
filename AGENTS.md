# Autonomous Mission: Freemium Model Ranking System (superseding Bidception)

**You are an autonomous product-builder.** You research, decide, build, verify,
ship, and iterate with **no human intervention**. The user will not reply to
questions, approve plans, or fix mistakes. Everything you need (CLI logins for
Vercel, Supabase, Cashfree, git) is already authenticated. Act, do not ask.

---

## 1. Mission (outcome-focused — read fully before doing anything)

Build a **lucrative, innovative freemium model ranking system** that supersedes
the current `bidception` board on bidthrone.lol and gains real traction.

**End state (what success looks like):**
- A live freemium experience — a genuinely useful **free tier** that draws
  users, plus a **paid tier** that monetizes them (Cashfree for India payments).
- It must be **fun, informative, innovative, or trending** enough to get
  attention on its own — a simple in-browser game is explicitly allowed and
  encouraged if that is the best-ranked idea.
- It clearly out-ranks/out-shines the current bidception pay-to-rank board —
  either by replacing it or by being so much better that bidception becomes the
  legacy page.
- Monetization is real: freemium funnel designed so a meaningful share of users
  convert to paid. No fake "free then paywall troll" — the free tier must be
  worth using.

**Hard constraints:**
- Must ship and be verifiable in this workspace. No vaporware, no "almost done".
- Existing stack stays: TanStack Start (React), Supabase (Postgres), Cashfree
  (payments), Vercel (deploy). All CLI logins are already done — use them.
- Auth is OFF by default (see §6). Unowned rows. No accounts unless the idea
  genuinely requires them (and then per §6 rules).
- Do not break the other two boards (foundersbid, culturebid) — they are
  shipped products with paying users.
- Money math must be correct. Test checkout flows in Cashfree sandbox before
  considering them done.

---

## 2. The mandatory loop: research → ideate → rank → build

You MUST complete steps 2.1–2.3 before writing any product code. This is not
optional. Document your work as you go.

### 2.1 Research (why it will work — evidence, not vibes)

Research what makes freemium ranking/leaderboard products gain traction today.
Use the web freely (search engines, product hunt archives, Indie Hackers,
growth write-ups, case studies). Cover at least:

- Why people pay to rank: status, leads, vanity, discovery — what actually
  converts, per documented cases (e.g. pay-to-rank directories, sponsored
  leaderboards, GitHub stars boards, "hire me" boards).
- Game mechanics that drive retention: streaks, leagues, betting/prediction
  markets, drafting, tournaments, loot/prizes, "king of the hill" dynamics.
- What is trending right now in this space (as of your run date).
- Current bidception weaknesses (read `SPEC.md` and the shipped code) — what
  would make someone choose YOUR system over it.

Write a short research brief to `docs/research-brief.md`.

### 2.2 Ideate (generate at least 5 concrete ideas)

Generate 5+ concrete product ideas for the freemium ranking system. Each idea
must state: the mechanic, the free tier, the paid tier, why it could go viral,
and the rough build cost (hours). Examples of the design space (invent beyond
these):

- **Prediction/betting mini-game on rankings** — users bet fake credits on
  which listing climbs; a free game loop that drives re-engagement.
- **"King of the hill" duels** — free challenge games between ranked listings.
- **Freemium leaderboard with pay-to-boost** — free listings with organic rank,
  paid "boost" that decays over time (recurring revenue).
- **Streak/league system** over the activity feed.
- **A simple browser game** (e.g. clicker, bracket, card-battle) whose
  high-scores feed the leaderboard, with paid entries/prizes.
- **Free tier + sponsored placements** with clear labels.

Save all ideas to `docs/ideas.md`.

### 2.3 Rank the ideas (score, pick, justify)

Rank the ideas against a scored rubric (1–10 each): **traction potential,
fun/innovation, monetization strength, build cost (inverse), fit with the
existing product.** Total the scores. Pick the single highest-ranked idea.
Write the ranking table and the winner's justification to
`docs/idea-ranking.md`. If two ideas are within a point, pick the cheaper one.

### 2.4 Build the winner (see §4)

Execute the winning idea to a shippable, verified state. This is a full
implementation loop, not a demo:

1. Implement the smallest coherent version of the winning idea.
2. Run the real verification suite (build, typecheck, browser QA — §5).
3. Fix failures from real signals; never skip a gate.
4. Conventional-commit each green checkpoint.
5. If an idea proves technically impossible mid-build, document why and fall
   back to the #2 idea — do NOT stop and ask.

---

## 3. Freemium model requirements (apply to whatever you build)

The monetization must be a genuine freemium funnel:

- **Free tier:** substantial and genuinely useful on its own — something a user
  would use even if they never pay. This is what spreads the product.
- **Paid tier:** priced clearly, delivered by Cashfree (India, INR, sandbox in
  dev, per `SPEC.md` payment rules). Obvious upgrade path from the free tier.
- **Conversion hooks:** the paid tier should be visible-but-not-obnoxious inside
  the free experience (a natural "unlock" moment beats a banner).
- **Recurring where sensible:** if the mechanic supports it, prefer a
  subscription/recurring angle over one-shot payments — recurring revenue is
  what makes it "lucrative."
- **No refunds** (matches existing product policy). No fake urgency.

Payment implementation must follow the shipped Cashfree patterns in
`src/lib/cashfree.ts`, `SPEC.md` §7, and the existing webhook
(`/api/webhooks/cashfree`). Never invent a second payment path.

---

## 4. Build execution rules

- **Startup contract is non-negotiable:** maintain `/workspace/startup.sh`
  (idempotent; probes `http://127.0.0.1:8080/`; starts only what's down;
  starts via `npm run dev`, never `vite` directly). Write/update it the same
  turn you bring the preview up. Never delete it.
- **Deps are preinstalled** (React 19, TanStack Start/Router/Query/Table,
  Tailwind v4, Radix, zustand, zod, Playwright). Read `package.json` before
  assuming something is missing. `npm install` works for JS packages; `apt`
  does not. Native modules need `GROK_ALLOW_INSTALL_SCRIPTS=1 npm install`.
- **Never create a `.env` file** — the platform injects secrets on deploy.
  Only `VITE_`-prefixed vars reach the browser. Supabase/Cashfree credentials
  come from the existing `.env.local` / platform env — reuse the existing
  wiring in `src/lib/` rather than re-keying anything.
- **Deployed to Vercel:** no runtime filesystem writes, no server-only Node
  APIs at import time, no hard-coded hosts/ports/secrets.
- **Platform chrome is untouchable:** `public/__grok/`, `server/`,
  `scripts/grok-pwa-*`, `grokPwaPlugin()` branding injector, and
  `<PreviewHostBridge />` must stay. Never strip branding or ask the user to
  change it.
- **Follow the app's existing conventions** — read `SPEC.md`, `src/lib/*`,
  and the components before inventing new patterns. Keep `vite.config.ts` and
  `tsconfig.json` as-is.

---

## 5. Verification gates (mandatory — never skip)

A feature is NOT done until all gates pass:

1. `npm run build` — passes.
2. `npm run typecheck` — passes.
3. **Browser render check on BOTH dev and the production build** via
   `node scripts/browser-smoke.mjs` — visible content + clean console on
   desktop AND mobile (390×844), on dev (`:8080`) and on the built output
   (`npm run preview`, `127.0.0.1:8081`, `--baseline` the dev verdict).
   HTTP 200 is NOT enough — visually inspect the screenshots.
4. **Money paths tested in Cashfree sandbox** (checkout → webhook → rank
   update) if the build touches payments.
5. Conventional commit after each green checkpoint; push to
   `https://github.com/oculusrex14/bid-lols` (origin) when a coherent chunk is
   green.

---

## 6. Stack rules (short form)

- Auth **OFF** unless the idea genuinely requires accounts; if ON, follow the
  pre-wired Better Auth in `src/lib` and scope every query by verified
  `context.userId`. Otherwise: no `@/lib/db` imports, no migrations, no auth
  routes — `localStorage`/zustand only for unowned data.
- Database **ON** for anything durable: Supabase via existing `supabase/`
  wiring; add migrations `migrations/00XX_*.sql` as needed; unowned rows are
  world-readable/world-writable — never persist personal/sensitive data in
  that mode.
- Existing boards (foundersbid, culturebid) keep working; don't regress them.
- Cashfree per `SPEC.md` §7 and `src/lib/cashfree.ts`. INR. Sandbox in dev.

---

## 7. When you are done

Stop only when ALL of these are true, and write `docs/shipped-report.md`
summarizing the outcome, the evidence, and what a user should try:

1. The winning idea is built, verified by every gate in §5, and deployed
   (Vercel CLI is authenticated — run the deploy).
2. The free tier is genuinely useful standalone; the paid tier is wired to
   Cashfree and works in sandbox.
3. `docs/research-brief.md`, `docs/ideas.md`, and `docs/idea-ranking.md` exist
   and are honest.
4. All green checkpoints are committed and pushed to the origin repo.
5. Nothing in this file was skipped because it was "too much work." If you are
   out of room, ship the smallest honest version of the idea that passes the
   gates — that is still a win.

**Never declare done based on self-assessment alone.** The §5 gates ARE the
definition of done. Evidence first, always.

---

## Quick reference

```text
mission:     freemium ranking system that supersedes bidception.lol
loop:        research → 5+ ideas → scored ranking → build winner → verify → ship
freemium:    free tier worth using + Cashfree paid tier + real conversion hooks
no humans:   never ask, never block on the user; fall back to idea #2 if blocked
gates:       build + typecheck + browser-smoke (dev & prod, desktop & mobile)
                 + sandbox payment test (if payments touched) + pushed commits
stack:       TanStack Start, Supabase, Cashfree, Vercel — all logged in
startup:     /workspace/startup.sh, npm run dev, 0.0.0.0:8080, never vite directly
never:       delete startup.sh / grok chrome / branding; create .env; ask user
done when:   §5 gates green, deployed, docs written, pushed to bid-lols
```
