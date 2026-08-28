# RC2_CONTENT_SEARCH_DISCOVERY.md — Content + Search Discovery release

**Status:** ACTIVE (specified 2026-08-28).
**Trigger:** RC1 completion pass is released (runtime SHA `949a095` on main). This release is NOT a marketplace feature phase: it rewrites all public copy, establishes one coherent message across the four products, and adds the first-pass search-discovery surface (SEO metadata, blog, structured data, sitemaps, robots, IndexNow) with a CLEAN PREVIEW as the stop condition.

**Hard constraints:**
- NO production deploy. Stop at a verified Vercel preview.
- `MARKETPLACE_MONEY_LIVE` stays OFF in every environment touched.
- No marketplace engine, payment, auth, or permission changes. No money/ledger semantics touched.
- No invented users, counts, testimonials, ratings, deal data, or success rates.
- No keyword-page spam, no city pages, no thin FAQ pages, no llms.txt (Google does not use it; no concrete non-Google consumer in use).
- No pseudoscientific "AEO chunking". Standard SEO fundamentals only, per current Google guidance.
- Legal copy: factual contradictions fixed only, meaning preserved, every change documented in §7.

## Starting state (verified 2026-08-28)

- main = `949a095` (clean tree). Production runs this runtime lineage; preview-only release.
- DNS: `culturebid.lol` apex still resolves to private IPs (10.10.0.1 / 10.0.1.3), unreachable from the internet; `https://www.culturebid.lol` returns 200. The other three apexes are DNS-healthy and www 301s to apex.
- Confirmed defects driving this release:
  1. Bidception meta description still reads "Bidception is coming next" (stale since Phase 03 shipped).
  2. `culturebid` canonical/OG/sitemap/robots point at the broken apex origin; www is the only working origin.
  3. No JSON-LD anywhere; entity detail pages get generic product-level head (middleware builds head from pathname only, not entity data).
  4. Sitemaps list home only (+ live entities on deployed runtimes); no evergreen routes, no blog, no lastmod.
  5. Detail pages for missing entities render "not found" bodies with HTTP 200 (soft-404s).
  6. `bounties.index.tsx` hardcodes the "FoundersBid" kicker even when served on the culturebid host.
  7. Leaderboard methodology line ("score = experience + 10·reliability + 10·quality") is stale: each board ranks by its own dedicated metric (RC1 R8), and rows display `experience` regardless of board.
  8. Copy guard defect: the legacy-word regex `/\brand(ed|ing|ings|s)?\b/i` is actually `\b` + "rand" (the `\b` consumes the "b"), so it matches almost nothing. The word "brand(s)" is now legitimate CultureBid vocabulary; the broken entry is replaced with a guard for the affirmative legacy concept ("pay to rank" without hyphen, "purchase a rank").
  9. Dashboard "Marketplace" card still says "Bounties and projects arrive with the FoundersBid launch" (stale pre-launch claim).
  10. Privacy policy intro says the domain "has no account system" (contradiction: accounts exist since Phase 01).
  11. No blog on any domain; no IndexNow; no search-console/visibility ops doc.

## Voice (applies to all authored public copy)

Plain, human, concise, confident. Problem first, mechanism second, what-you-do-next third, limits fourth. Short paragraphs, concrete examples, ordinary words. No em dashes (periods, commas, colons, parentheses). No banned-marketing word list violations in authored marketing/editorial copy (modal "can/may" tolerated only where removing it hurts factual clarity; flagged in the final audit). No fabricated stats. No repeated honesty-advertising ("nothing here is fabricated"). Honesty comes from accurate availability notes and real empty states, not from slogans.

Network message (anchor, used once per product in its own words): **put a clear budget on useful work and make the rules visible before anyone starts.**

Entity naming (consistent everywhere):
- Bid Network = the overall network (one account, four products).
- FoundersBid = startup work marketplace (bounties + projects + graveyard).
- CultureBid = creative work marketplace (creative bounties).
- Bidception = coordinated multi-person project model (parent work + child work packages).
- Bidthrone = reputation and discovery layer (public profiles, leaderboards, Bid Index).

---

## Acceptance criteria

### C1 — Product metadata (host-seo-shared.mjs)
- AC-1.1 New titles/descriptions per product (search-intent oriented, readable, no banned-word fluff):
  - foundersbid: title `Startup Freelance Bounties & Projects | FoundersBid`; description covers startup work, bounties, projects, development/design/research/marketing.
  - culturebid: title `Creative Bounties for Brands & Creators | CultureBid`; description covers paid creative briefs, brands, creators, capped participation, clear rewards.
  - bidception: title `Build Projects With Freelance Teams | Bidception`; description covers one project, multiple specialists, one parent budget, captain, work packages.
  - bidthrone: title `Freelancer Proof of Work & Reputation | Bidthrone`; description covers public work history, reputation from platform activity, market-rate discovery with a sample threshold.
- AC-1.2 Bidception "coming next" description removed from every metadata surface (grep clean).
- AC-1.3 kickers/oneLines/footer text rewritten to the same message; no "throne", no pre-launch phrases.
- AC-1.4 Unique titles and descriptions across the four products (tested).

### C2 — Canonical origin (CultureBid DNS mode)
- AC-2.1 `seoOrigin(key)` added to host-seo-shared.mjs: culturebid → `https://www.culturebid.lol`, others → `https://<apex>`. Used for canonical, og:url, og:image, sitemap URLs, robots `Sitemap:` line, and every JSON-LD `@id`/`mainEntityOfPage`/`url`.
- AC-2.2 `linkOrigin` and `seoOrigin` agree for all products in the current DNS mode (tested).
- AC-2.3 Rollback documented in `docs/ops/SEARCH_VISIBILITY.md` + `docs/ops/DEPLOYMENT.md` DNS note: when the apex is verified reachable, (a) remove culturebid from `WWW_NORMALIZE_EXCLUDED`, (b) remove it from the www-canonical set, and the apex becomes canonical again with www 301s.
- AC-2.4 No metadata on any host points at `https://culturebid.lol` (grep + test).

### C3 — Entity-level metadata (route/entity wins, host-level fallback)
- AC-3.1 The Nitro middleware (deployed-runtime head authority) builds head from entity data for: `/bounties/:id` (title, category, reward, status, product), `/projects/:id`, `/graveyard/:id`, `/bidception/:id`, `/profile/:handle`, `/blog/:slug`. One small DB query per request; failures fall back to host-level meta (never 500 a crawler).
- AC-3.2 Titles include the entity's real title (truncated sensibly), a natural qualifier (category / state / reward where useful), and the product brand. Descriptions come from the entity's own public text (truncated, single-line).
- AC-3.3 Untrusted user content in metadata is HTML-escaped (title injection test).
- AC-3.4 No private data in metadata: no emails, no unfunded/draft internal-only numbers, no dispute contents, no PII. DRAFT entities: metadata may carry title + product, but no reward/budget claims that are not public facts (funding state words stay neutral).
- AC-3.5 Missing entities become real HTTP 404s (loader throws the router not-found; branded 404 page + `noindex,follow` + no canonical via the existing not-found head path). No soft-404s for public entity routes (bounty/project/graveyard/parent/profile/blog).
- AC-3.6 og:type is `article` for blog posts, `profile` for public profiles; all others `website`.

### C4 — Public copy rewrite
- AC-4.1 Four home pages rewritten to the RC2 voice with the RC2 H1s:
  - foundersbid: `Get startup work done without hiring a whole team.` + bounty/project distinction ("Not every job should be a contest.") + two plain CTAs (Post work / Find work) + small honest funding-off note.
  - culturebid: `A better way to commission creative work.` + the speculative-work tension acknowledged + capped entries, published reward structure, clear licensing + CTAs (Post a brief / Find creative work).
  - bidception: `Big project. One budget. The right people for each part.` + plain explanation of sponsor → captain → work packages → reconciliation; the technical term "nested" explained after the idea; "coming next" nowhere.
  - bidthrone: `Reputation built from work, not self-promotion.` + portfolio/testimonial/rating criticism + what the record actually contains (implemented signals only) + network links.
- AC-4.2 Every list page (bounties, projects, graveyard, bidception, leaderboards, bid-index) gets: accurate product-scoped kicker (no hardcoded "FoundersBid" on culturebid), plain purpose sentence, useful empty state (what this is, who can post, what will appear, CTA, link to the flagship article), no defensive honesty slogans.
- AC-4.3 Detail pages: labels/explanations rewritten where they are public-facing (funding state cards, reward structure labels, milestone captions, creative brief section, offer/transfer copy). Business semantics unchanged.
- AC-4.4 Create pages: instructions rewritten to plain English; the money blocks stay explicit (reward + fee decomposition shown before commit is preserved verbatim in meaning).
- AC-4.5 Empty states, dashboard cards (stale "arrives with launch" removed; shared dashboard copy no longer names FoundersBid only), auth card copy, and server user-facing messages ("Funding is not live yet…") rewritten; no "founding access" phrasing in new public copy (the form is "Launch updates"; the data concept keeps its internal name).
- AC-4.6 Navigation/footer: capability nav + a "Blog" link per product (desktop + mobile + footer), cross-product links via `linkOrigin`, consistent one-line product descriptions.
- AC-4.7 Graveyard: "Good code shouldn't die with the startup." as the guiding line; explain transfer honestly (off-platform, seller attests, no escrow claims).
- AC-4.8 Banned-word + em-dash + cliché audit over all authored public strings recorded in §7; remaining modal "can/may" instances justified or rewritten.

### C5 — Blog architecture
- AC-5.1 Routes `/blog` (host-scoped index) and `/blog/:slug` (article) exist on every host; each host lists ONLY its own product's articles.
- AC-5.2 Wrong-domain article access 301s to the article on its product's canonical origin (existing host architecture).
- AC-5.3 Articles are first-party modules in `src/content/blog/` (typed blocks: h2, p, ul, table, callout; no MDX/CMS). Server-rendered body in the initial HTML; readable without JS.
- AC-5.4 Article page carries: title, description, published/modified dates, organization author/publisher (product, part of Bid Network; no invented person), related internal links, breadcrumbs.
- AC-5.5 Four flagship articles shipped (headlines per RC2 brief): foundersbid, culturebid, bidception, bidthrone. Each: problem → why existing approaches fall short → our design decision → trade-offs → current availability (funding off stated once, plainly) → internal links. 800–1,500 words, stop when done.
- AC-5.6 No orphan article: every article is linked from its home page (contextual anchor), blog index, and at least one other contextual surface.

### C6 — Structured data (JSON-LD)
- AC-6.1 `WebSite` on every product home (name, url = canonical origin, publisher = Bid Network Organization node).
- AC-6.2 `Organization` "Bid Network" node with a stable `@id` on bidthrone home (umbrella), referenced (not redeclared with a different URL) on the other homes; products described as products of the network. No invented addresses, phones, socials, founders, employees. `sameAs` only for links that exist in repo config (none today → omit).
- AC-6.3 `BlogPosting` on articles (headline, description, datePublished, dateModified, mainEntityOfPage = canonical, author + publisher = organization, no person fabrication).
- AC-6.4 `ProfilePage` on indexable public profiles (+ Person node with name, url; description only from public bio/skills).
- AC-6.5 `BreadcrumbList` on marketplace detail pages and blog articles (Home → surface → entity, matching visible links).
- AC-6.6 `ItemList` on marketplace list pages ONLY for actually visible entities (position, name, url; product-scoped).
- AC-6.7 No `AggregateRating`, no `Review` schema, no `FAQPage`, no `Offer`, no `JobPosting` emitted anywhere (source-scan test). All JSON-LD claims match visible page content.

### C7 — Sitemaps
- AC-7.1 Each host's sitemap includes: home, evergreen indexable routes for its capabilities (foundersbid: /bounties /projects /graveyard /blog /blog/<fb article>; culturebid: /bounties /blog /blog/<cb article>; bidception: /bidception /blog /blog/<bce article>; bidthrone: /leaderboards /blog /blog/<bt article>), live public entity URLs (existing behaviour), and indexable public profiles (C8 gate).
- AC-7.2 Canonical absolute URLs via `seoOrigin`. No signin/signup/dashboard/settings/admin/new forms/API/test/legal noindex URLs. No `/bid-index` (privacy-gated aggregate stays noindex).
- AC-7.3 `lastmod` only where a real stored timestamp exists (entity `updated_at`, blog `modifiedAt`); evergreen/home URLs carry no lastmod; never generated from request time.
- AC-7.4 Sitemap must not 500 on DB blip (existing graceful behaviour preserved; tested).

### C8 — Public profile indexing gate
- AC-8.1 A public profile is indexable only with real public content: a handle plus (bio OR ≥1 skill OR ≥1 public link OR ≥1 verified marketplace outcome). Below that → `noindex,follow` (page still renders).
- AC-8.2 Indexable profiles get: unique title/description (from display name, handle, skills/bio), host-relative canonical, ProfilePage JSON-LD, no PII.
- AC-8.3 Sitemap includes only indexable profiles.

### C9 — Robots + crawler discovery
- AC-9.1 `User-agent: *` allows all public routes; the important public routes (home, lists, details, profiles, blog, leaderboards) are explicitly not disallowed (test).
- AC-9.2 `OAI-SearchBot` is not blocked (wildcard allows it; no specific deny). GPTBot: allow, unchanged; the training-policy decision is recorded in `docs/ops/SEARCH_VISIBILITY.md` (no silent change).
- AC-9.3 `Sitemap:` line per host uses `seoOrigin`.
- AC-9.4 Pages with `noindex` meta are NOT additionally robots-blocked (crawlers must be able to read the meta).

### C10 — IndexNow
- AC-10.1 A stable IndexNow key (committed; it is a public verification token, not a secret) is hosted at `/<key>key.txt` on every host (200 with the key text; 404 otherwise).
- AC-10.2 `scripts/indexnow-submit.mjs` submits batches of new/changed/deleted PUBLIC canonical URLs to api.indexnow.org for the four origins; dry-run by default; never depends on IndexNow availability for the build; no repeated submissions of unchanged URLs without operator intent.
- AC-10.3 The submission for THIS release (4 homes, 4 blog indexes, 4 articles, evergreen pages) is documented in SEARCH_VISIBILITY.md; execution is an operator step (the script is committed and runnable).

### C11 — Ops docs
- AC-11.1 `docs/ops/SEARCH_VISIBILITY.md`: four property records (bidthrone.lol, foundersbid.lol, bidception.lol, culturebid canonical host = www in current DNS mode): canonical origin, sitemap URL, GSC status (EXTERNAL ACTION REQUIRED with exact human steps: domain-property verification recommendation, sitemap submission, URL inspection, initial index requests, monitoring incl. the Generative AI performance report when available), Bing Webmaster Tools status (EXTERNAL ACTION REQUIRED + IndexNow verification steps), CultureBid DNS note with the exact rollback steps (AC-2.3).
- AC-11.2 No fabricated verification tokens or claims of verification anywhere in docs.

### C12 — Tests (search quality suite)
- AC-12.1 New automated tests cover: unique home titles/descriptions; no "coming next" metadata; canonical correctness per host (incl. www for culturebid); blog host scoping + wrong-host redirect; article metadata + BlogPosting JSON-LD shape; no fake AggregateRating/FAQPage/Offer/JobPosting strings in public source; private pages noindex; public evergreen + blog indexable; sitemap includes evergreen + blog and excludes private/create/legal; no fabricated lastmod; robots permits public crawlers; OAI-SearchBot not blocked; www normalization unchanged for the three healthy apexes; entity title/description escaping; duplicate-meta audit over indexable static routes.
- AC-12.2 Existing host-seo tests updated to the new sitemap/canonical contract (no silent deletion of assertions; stale ones repurposed).
- AC-12.3 Copy guard: the broken `brand` regex replaced with working legacy-concept guards; new banned-fluff phrases from the RC2 voice section added where they are unambiguous legacy/SEO-spam markers (no over-broad single-word bans that would block legitimate product words like "brand", "brief", "contest").

### C13 — Verification + release
- AC-13.1 `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` green.
- AC-13.2 Current marketplace E2E (scripts/marketplace-e2e.mjs against a local fake-provider dev server) green; browser smoke green.
- AC-13.3 Focused commits pushed to origin/main; GitHub Actions CI green on the release SHA.
- AC-13.4 Vercel PREVIEW deployed from the exact pushed SHA (no production alias change).
- AC-13.5 Preview verified over HTTP + real browser, desktop AND mobile, on all four host contexts: home copy, nav + blog link, blog index (host-scoped), flagship article (full body in raw initial HTML + BlogPosting JSON-LD present), marketplace lists, a seeded/detail page if any live entity exists on preview, 404 (real status + branded head), canonical/OG per host (culturebid → www origin), robots, sitemap (evergreen + blog + no private URLs), JSON-LD on homes/articles, security headers + CSP intact, no console errors, no 5xx. Crawler-style fetches (Googlebot UA) for the flagship articles: full text + schema in the served HTML.
- AC-13.6 `docs/SEARCH_DISCOVERY_REPORT.md` written (factual, no "SEO complete" claims): release SHA, canonical origins, indexable static URLs, four article URLs, schema types used, sitemap contents per domain, robots/OAI-SearchBot state, IndexNow state, GSC/Bing EXTERNAL ACTION REQUIRED list, CultureBid DNS decision, claims removed, test totals, remaining blockers.

## Claim audit log (§7 of the RC2 brief) — filled in as the rewrite lands

| # | Surface | Old claim | Verdict vs current code | Action |
|---|---------|-----------|------------------------|--------|
| 1 | bounties.index | "Funded problems, real rewards. Every listing here is funded before it can be open" | Engine rule is true, but misleading while funding is disabled and the page is empty | Rewritten: rule described plainly, availability note kept small |
| 2 | bounties.index empty state | "Nothing on this page is fabricated; empty means empty." | Honest but defensive slogan (RC2 §23) | Replaced with useful empty state + article link |
| 3 | dashboard | "Bounties and projects arrive with the FoundersBid launch" | Stale: accounts/drafts already exist; funding off | Rewritten: neutral shared dashboard copy, no product-specific launch claims |
| 4 | leaderboards | "score = experience + 10·reliability + 10·quality" methodology + rows always show `experience` | Stale vs RC1 R8 (dedicated metric per board) | Methodology line rewritten to describe the shipped per-board metrics; rows show the board's own metric value |
| 5 | bid-index | "Anonymized, aggregated benchmarks" | Aggregated with sample threshold; not literally "anonymized" (no personal data in aggregates, but the word overstates) | "Aggregated" kept, "anonymized" dropped |
| 6 | bidthrone home | "Every person on the Bid Network has a public profile" | Overstated: profiles exist when a member sets one up | Rewritten to the actual behaviour |
| 7 | culturebid home | "Creators keep the rights to entries that don't win." | Matches the operational-draft IP rule in legal.ts (non-winning submissions stay with authors) | Kept, softened to "unless the brief says otherwise" |
| 8 | bidception home | "You see exactly where every rupee goes" | True of the funded balance UI (allocated + fee + reserve reconcile to budget) | Kept, phrased against the visible budget breakdown |
| 9 | bounties detail | "advertised reward — paid in full" | True by fee model (fee charged to sponsor on top) | Kept |
| 10 | server messages (bounties.server / bidception.server) | "Join founding access to be notified…" | Stale naming: the form is Launch updates | Rewritten |
| 11 | legal.ts (privacy) | "has no account system and accepts no payment" | Contradiction: accounts exist (Phase 01) | Factual update: accounts + profile + waitlist data now described; payment-absence statement kept (still true) |
| 12 | legal.ts (terms "The service today") | surface list omits graveyard, bidception, leaderboards, bid index | Contradiction: those surfaces exist | Surface list updated; all legal/payment/IP semantics untouched |

## Deferred to post-RC2 (recorded, NOT in this release)

- RC1 R11 (E2E in GitHub Actions) — still pending; not blocked by RC2, not part of it.
- RC1 R6 UI polish (captain picker, child-spec kind UI) — product UX, separate release.
- Product-specific OG images (a single shared og.jpg remains acceptable for this release).
- GSC/Bing verification itself (external, operator steps in SEARCH_VISIBILITY.md).
- reputation_snapshots read model, invite-only modes, file uploads, cross-domain SSO (existing deferrals).

## Rollback

Preview-only release: no production alias change. Rollback = stop using the preview / redeploy the previous production alias. All migrations: none (RC2 is code + content only; no schema change).
