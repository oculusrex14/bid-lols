# SEARCH_DISCOVERY_REPORT.md — RC2 content + search discovery

**Last code SHA:** `fb25a93cbe08bacda3052b2e7f250787165e81ea` (all runtime
changes); docs-only successors on main: `558a006`, `7bd6c0d`, and this report.
**GitHub Actions:** run `33150057407` on `fb25a93` and run `33152804124` on
`558a006` — both SUCCESS (lint, typecheck, 1202 mjs + 200 ts tests, build).
Docs-only commits carry no runtime change.
**Vercel PREVIEW (final):** `dpl_G6Xj5WcTK6zm6rkMB3QYQYQ7bwkB` at
`https://bidthrone-41f6wm3zd-oculusrex14s-projects.vercel.app` (READY, from the
exact pushed SHA). An earlier preview `dpl_8cgy1tSyoZpYsdV37yE9vJTBqbkP`
(code-identical `fb25a93`) was the first cloud verification pass; it was
redeployed once to pick up the preview `DATABASE_URL`.
**NO production deployment in this release.** Production remains the RC1 copy
pass (`949a095` lineage).
**Preview environment note:** the team's Vercel project had no preview
`DATABASE_URL`; it was set via the API to the shared production Neon URL
(read-only verification, no writes on the preview). `BETTER_AUTH_SECRET`
requires no preview entry (only `VERCEL_ENV=production` demands it; previews
use the dev fallback).
**Funding:** `MARKETPLACE_MONEY_LIVE` OFF everywhere, as before; no money path
changed.

## Canonical origins (current DNS mode, verified 2026-08-28)

| Product | Canonical origin | Why |
|---|---|---|
| Bidthrone | https://bidthrone.lol | apex healthy; www 301s to apex |
| FoundersBid | https://foundersbid.lol | apex healthy; www 301s to apex |
| CultureBid | https://www.culturebid.lol | apex DNS still broken (private 10.x A records, unreachable); www is the only serving origin, so it is also the canonical origin |
| Bidception | https://bidception.lol | apex healthy; www 301s to apex |

Rollback for CultureBid when the apex is fixed: `docs/ops/SEARCH_VISIBILITY.md`
and `docs/ops/DEPLOYMENT.md` (DNS note). No metadata anywhere points at the
broken apex.

## Indexable static URLs (evergreen, from sitemaps)

- bidthrone.lol: `/`, `/leaderboards`, `/blog`, `/blog/reputation-from-completed-work`
- foundersbid.lol: `/`, `/bounties`, `/projects`, `/graveyard`, `/blog`, `/blog/bounty-or-project`
- www.culturebid.lol: `/`, `/bounties`, `/blog`, `/blog/fair-creative-bounty`
- bidception.lol: `/`, `/bidception`, `/blog`, `/blog/building-a-project-with-multiple-freelancers`
- plus: live public entity URLs (DB-backed, with truthful `lastmod` from
  `updated_at`) and indexable public profiles (handle + real public content).

Deliberately NOT indexable: signin/signup/dashboard/settings/admin, create
forms, legal pages (noindex,follow), `/bid-index` (privacy-gated aggregate),
unknown routes (404, noindex, no canonical).

## The four flagship articles

| Product | Visible headline | SEO title | Canonical URL |
|---|---|---|---|
| FoundersBid | Small startup jobs are too important for a backlog and too awkward for an agency | A Better Way to Hire Freelancers for Startup Projects \| FoundersBid | https://foundersbid.lol/blog/bounty-or-project |
| CultureBid | A creative contest shouldn't mean 100 people working for free | How to Run a Fair Creative Bounty for Brands and Creators \| CultureBid | https://www.culturebid.lol/blog/fair-creative-bounty |
| Bidception | Big freelance projects break when one person is expected to do everything | How to Build a Project With Multiple Freelancers \| Bidception | https://bidception.lol/blog/building-a-project-with-multiple-freelancers |
| Bidthrone | A portfolio tells you what someone says they did. We want the work record. | Why Freelancer Reputation Should Be Based on Completed Work \| Bidthrone | https://bidthrone.lol/blog/reputation-from-completed-work |

Wrong-domain article reads 301 to the article's product canonical origin.

## Structured data implemented

- `Organization` "Bid Network": stable `@id` `https://bidthrone.lol/#organization`,
  declared on the bidthrone home, referenced by all other nodes. No invented
  addresses, phones, socials, founders, or employees; `sameAs` omitted (no
  org-level links in repo config).
- `WebSite` on every product home (url = canonical origin, publisher = the
  organization).
- `BlogPosting` on each article (headline, description, datePublished,
  dateModified, mainEntityOfPage, organization author + publisher; no persons
  invented).
- `ProfilePage` + `Person` on public profiles that pass the content gate.
- `BreadcrumbList` on marketplace detail pages and blog articles.
- `ItemList` on list pages, only for entities actually visible (bounties,
  projects, graveyard assets, team projects, blog index).
- Not emitted anywhere: `AggregateRating`, `Review` schema, `FAQPage`,
  `Offer`, `JobPosting` (source-scan test).

## Sitemap / robots / crawlers

- `/sitemap.xml` per host on the canonical origin; `User-agent: *` allows all
  public routes; no `Disallow` at all; OAI-SearchBot covered by the wildcard
  (not blocked); GPTBot unchanged (training access stays open by decision,
  recorded in `docs/ops/SEARCH_VISIBILITY.md`).
- `lastmod` only from stored timestamps (entity `updated_at`, blog
  `modifiedAt`); never from request time.

## IndexNow

- Stable public key committed in `scripts/host-seo-shared.mjs`
  (`007a94fe-3404-482d-b88c-cef5d087511c`), served at
  `https://<host>/<key>key.txt` on every host (200; 404 for other paths).
  Verified on the preview.
- `scripts/indexnow-submit.mjs` (dry-run default, `--apply` to POST). First
  submission URL list: `docs/ops/SEARCH_VISIBILITY.md`. Operator step, not
  yet executed against the live preview (preview URLs must not be submitted;
  submit the canonical origins once they are indexable).

## Search Console status

- Google Search Console: **EXTERNAL ACTION REQUIRED** for all four properties
  (domain verification recommended). Steps: `docs/ops/SEARCH_VISIBILITY.md`.
  No verification tokens exist in this repo and none are fabricated.
- Bing Webmaster Tools: **EXTERNAL ACTION REQUIRED**; IndexNow verification
  steps in the same document.

## Verification performed

- Gates on `fb25a93`: lint (0 errors), typecheck, 1402 tests, build.
- Marketplace E2E (`scripts/marketplace-e2e.mjs`, local dev + fake provider):
  PASS (signup, funding decomposition, publish, apply, submit, public list).
- Browser smoke (dev + local built preview): PASS, 0 console/page errors, no
  horizontal overflow (desktop + mobile); baselines regenerated for the RC2
  surfaces.
- Local built preview (same artifact, `fb25a93`): HTTP + browser verification
  of all four host contexts (desktop + mobile): home copy + H1s, nav with Blog,
  blog index (host-scoped), flagship articles (complete body + BlogPosting
  JSON-LD in raw initial HTML, no JS needed), marketplace lists, capability
  301s, entity/profile 404s (real status, noindex, no canonical), culturebid
  www canonical, sitemaps, robots, IndexNow key, CSP + request-id headers.
- Vercel preview (cloud runtime, production Neon; final deployment
  `dpl_G6Xj5WcTK6zm6rkMB3QYQYQ7bwkB`): head/canonical, blog SSR + JSON-LD,
  sitemap, robots, IndexNow key, cross-domain article 301, unknown route 404,
  0 x 5xx in deployment logs. Note: team SSO gates anonymous browser access to
  the `.vercel.app` preview URL, and the Vercel edge rejects Host-header
  overrides; per-product host contexts were therefore verified on the
  identical local built preview, and the Vercel preview on the umbrella
  (bidthrone) context plus HTTP level.
- Crawler-style raw-HTML fetches of all four flagship articles (Googlebot UA):
  full article text + structured data present in the served HTML.

## Known limitations (factual, not claims)

- No GSC/Bing verification has happened; no coverage or query data exists yet.
- The marketplace has little or no live public activity: sitemaps carry
  home + evergreen + blog today and gain entity URLs as real work lands.
- One shared OG image per host; per-product social cards are later.
- No llms.txt (deliberate: Google does not use it; no concrete consumer in use).
- The RC1-tip CI run (`33110669651` on `949a095`) had failed on a stale test
  pinning old home metadata; that test is corrected in this release and the
  RC2 run is green.
