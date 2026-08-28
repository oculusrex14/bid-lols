# SEARCH_VISIBILITY.md — Search discovery operations

**Status:** operator runbook. RC2 (2026-08-28) shipped the in-repo half of
search discovery (metadata, sitemaps, robots, structured data, IndexNow
key + script). The console-side half below is EXTERNAL ACTION REQUIRED for
every property: no Search Console or Bing Webmaster Tools credential exists
in this repository, and none has been verified.

Scope: this is a discovery runbook, not a ranking strategy. IndexNow and
sitemaps tell crawlers where content lives; they do not guarantee rankings.

## Properties

| Property | Canonical origin | Sitemap | GSC | Bing WMT |
|---|---|---|---|---|
| bidthrone.lol | https://bidthrone.lol | https://bidthrone.lol/sitemap.xml | EXTERNAL ACTION REQUIRED | EXTERNAL ACTION REQUIRED |
| foundersbid.lol | https://foundersbid.lol | https://foundersbid.lol/sitemap.xml | EXTERNAL ACTION REQUIRED | EXTERNAL ACTION REQUIRED |
| culturebid.lol (current DNS mode) | https://www.culturebid.lol | https://www.culturebid.lol/sitemap.xml | EXTERNAL ACTION REQUIRED | EXTERNAL ACTION REQUIRED |
| bidception.lol | https://bidception.lol | https://bidception.lol/sitemap.xml | EXTERNAL ACTION REQUIRED | EXTERNAL ACTION REQUIRED |

Note the CultureBid row: while the apex DNS is broken, the canonical origin
is the **www** host. See "CultureBid DNS mode" below for the rollback.

Recommendation: verify **domain properties** (apex, e.g. `bidthrone.lol`)
rather than URL prefixes. A domain property covers www + apex + subpaths in
one place, and the app already 301s www to apex on the three DNS-healthy
products, so domain-level signals consolidate correctly.

## Google Search Console (per property, EXTERNAL ACTION REQUIRED)

1. search.google.com/search-console → Add property → Domain → enter the apex
   (e.g. `bidthrone.lol`).
2. Verify with the DNS TXT token Google provides: add the TXT record at the
   zone level (the same registrar as the A records). Recheck after DNS
   propagates.
3. Once verified:
   - Sitemaps → add `<canonical-origin>/sitemap.xml` → submit.
   - URL inspection: check the home page and one flagship blog article per
     property; confirm the rendered title/description match the deployed
     head (the app serves entity-aware head on deployed runtimes).
   - Request indexing on a small priority set only: the four home pages,
     the four flagship articles, and the blog indexes. Do not bulk-request.
   - Monitor: Indexing → Pages (coverage), Performance (queries), and the
     Generative AI Search performance report where the property shows one
     (it is not available to every property yet; record its state when it
     appears).
4. Record the outcome (verified / blocked / token) here, in the table above,
   instead of leaving "EXTERNAL ACTION REQUIRED".

## Bing Webmaster Tools + IndexNow (per property, EXTERNAL ACTION REQUIRED)

1. bing.com/webmasters → Add a site → use the domain, verify by DNS TXT
   (or by importing the verified GSC data, which Bing accepts for domain
   properties).
2. Sitemaps: submit the same `<canonical-origin>/sitemap.xml`.
3. IndexNow:
   - The publisher key is committed in `scripts/host-seo-shared.mjs`
     (`INDEXNOW_KEY`) and is a PUBLIC verification token, not a secret.
   - Bing verifies control by fetching
     `https://<host>/<key>key.txt` (e.g.
     `https://bidthrone.lol/007a94fe-3404-482d-b88c-cef5d087511ckey.txt`),
     which the app serves on every host (middleware + dev twin).
   - Submissions: `node scripts/indexnow-submit.mjs --file urls.txt`
     (dry run) and add `--apply` to POST to api.indexnow.org. Batches are
     capped at 10,000 URLs per request; the script groups by host
     automatically.
   - IndexNow is a discovery notification, not a ranking guarantee, and the
     build never depends on it. Do not resubmit unchanged URLs routinely;
     submit new/changed/deleted public canonical URLs after a release.

Release-URL list for the first IndexNow submission (RC2):

```
https://bidthrone.lol/
https://bidthrone.lol/blog
https://bidthrone.lol/blog/reputation-from-completed-work
https://bidthrone.lol/leaderboards
https://foundersbid.lol/
https://foundersbid.lol/bounties
https://foundersbid.lol/projects
https://foundersbid.lol/graveyard
https://foundersbid.lol/blog
https://foundersbid.lol/blog/bounty-or-project
https://www.culturebid.lol/
https://www.culturebid.lol/bounties
https://www.culturebid.lol/blog
https://www.culturebid.lol/blog/fair-creative-bounty
https://bidception.lol/
https://bidception.lol/bidception
https://bidception.lol/blog
https://bidception.lol/blog/building-a-project-with-multiple-freelancers
```

## Crawler policy decisions (documented, deliberate)

- `User-agent: *` allows every public route; the robots file carries no
  `Disallow` at all (verified in `robotsTextFor` + tests).
- **OAI-SearchBot** (OpenAI's ChatGPT Search crawler): NOT blocked. Covered
  by the wildcard. This is the crawler OpenAI documents for search
  discovery.
- **GPTBot** (OpenAI model-training crawler): NOT blocked, unchanged from
  pre-RC2. Decision: keep training access open for now; the network has no
  confidential content that would justify a separate policy. If that
  changes, add an explicit `User-agent: GPTBot` / `Disallow: /` block in
  `robotsTextFor` and update this document in the same commit.
- Pages marked `noindex` (legal, accounts, settings, admin, the Bid Index
  gated aggregate, unknown routes) are deliberately NOT robots-blocked:
  crawlers must be able to read the meta tag for the noindex to take
  effect.

## CultureBid DNS mode (verified 2026-08-28)

Current external state, verified with public DNS + HTTPS:

- `culturebid.lol` apex A records point at private addresses
  (10.10.0.1 / 10.0.1.3) and are unreachable from the internet.
- `https://www.culturebid.lol` serves the application (HTTP 200).

Therefore, in this release, `https://www.culturebid.lol` is the canonical
CultureBid origin for: canonical link, og:url, og:image, sitemap URLs, the
robots `Sitemap:` line, JSON-LD `@id`/url fields, blog URLs, and IndexNow.
The app does NOT 301 www to apex for culturebid, so the www URL stays live.

**Rollback, once the apex is verified reachable publicly:**

1. Fix the DNS (remove the private A records; point `culturebid.lol` at the
   same targets as the other three apexes). Verify with a public resolver
   and `curl -sI https://culturebid.lol` from outside the network.
2. In `scripts/host-seo-shared.mjs`: remove `"culturebid"` from
   `WWW_NORMALIZE_EXCLUDED` and from `SEO_CANONICAL_WWW`.
3. Run the test suite (the `seoOrigin` / `linkOrigin` agreement tests and
   the www-redirect tests pin both sets).
4. Redeploy; www now 301s to apex and the apex becomes canonical again.
5. In GSC/Bing for the CultureBid property: add the apex domain, resubmit
   the apex sitemap (`https://culturebid.lol/sitemap.xml`), and note the
   www → apex change in the console (URL Inspection on the old www URLs,
   or a bulk change note if the console shows one).

## Preview vs production

Vercel preview deployments (per-branch URLs) serve the app under an
unknown host, which resolves to the bidthrone umbrella product. They are
for verification only: do not add preview hosts to any console, and do not
point any sitemap or IndexNow payload at them.

## Known limitations (honest list)

- No GSC/Bing verification has happened; coverage and query data are
  unavailable until the steps above run.
- The marketplace has little or no live public activity, so most entity
  URLs do not exist yet; the sitemaps carry home + evergreen + blog today
  and gain entity URLs as real work lands (the middleware queries live).
- One shared OG image per host (`og.jpg`); per-product social cards are a
  later, cosmetic item.
- No llms.txt: Google does not use it, and there is no concrete
  non-Google consumer in use; adding one for its own sake is exactly the
  kind of pseudo-optimization this release deliberately skips.
