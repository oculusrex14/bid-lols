import { Link, createFileRoute } from "@tanstack/react-router";
import { ModeToggle } from "@/components/mode-toggle";
import { SiteFooter } from "@/components/site-footer";
import { PORTAL, SITE_IDS, SITES } from "@/lib/sites";

export const Route = createFileRoute("/spec")({
  component: SpecPage,
  head: () => ({
    meta: [{ title: `${PORTAL.domain} — Product spec` }],
  }),
});

function SpecPage() {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="mx-auto max-w-3xl px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-xs font-medium uppercase tracking-kicker text-fg">
            {PORTAL.domain}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {SITE_IDS.map((id) => (
              <Link
                key={id}
                to="/$site"
                params={{ site: id }}
                preload="intent"
                className="text-sm text-muted hover:text-fg"
              >
                {SITES[id].wordmark}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <ModeToggle />
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-24 pt-8">
        <p className="text-xs uppercase tracking-kicker text-subtle">Product requirements</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-6xl">
          Three boards. One mechanic. Built to ship in a weekend.
        </h1>
        <p className="mt-5 text-lg text-muted">
          bidthrone.lol is the front door. foundersbid.lol, culturebid.lol, and bidception.lol share ranking, payments, swap math,
          and the manage-link model. They do not share identity, copy, or who
          belongs on the board. This page is the contract. The running product
          is the proof.
        </p>

        <H>1. Product</H>
        <H2>foundersbid.lol</H2>
        <p>
          Founders and creators bid to promote personal portfolios, about pages,
          and founding-team pages. The point is proof of who is behind the work.
        </p>
        <Quote>Pay to prove the founding team. Build trust. Rank higher.</Quote>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-muted">
          <li>Allowed: team pages, about pages, studio sites, personal founder URLs.</li>
          <li>Row content: founding team names first (italic headline), company title and URL second, up to five founder social icons, bid, visits. Favicon beside every row.</li>
          <li>Primary CTA: “Bid the team”.</li>
          <li>Tone: editorial, studio, letterhead. Warm ink and bone.</li>
        </ul>

        <H2>culturebid.lol</H2>
        <p>
          Companies bid to showcase culture, team, and why join us so the best
          talent finds them first. Careers pages, culture pages, values.
        </p>
        <Quote>Rank your culture. Attract the people who matter.</Quote>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-muted">
          <li>Allowed: careers / team / culture pages.</li>
          <li>Row content: company name, culture statement, up to five values, optional quote, bid, visits.</li>
          <li>Primary CTA: “Bid the culture”.</li>
          <li>Tone: professional letterhead. Cool stone, Outfit wordmark.</li>
        </ul>

        <H2>bidception.lol</H2>
        <p>
          A discovery board for other marketing platforms. Have leftover budget
          after foundersbid or culturebid? Find the next directory, newsletter
          board, or visibility tool and run the same strategy there.
        </p>
        <Quote>Find where else to spend your marketing budget.</Quote>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          <li>Allowed: marketing platforms, directories, pay-to-rank tools, newsletter sponsorships, community boards.</li>
          <li>Row content: platform name, pitch, what it is, bid, visits. Favicon beside every row.</li>
          <li>Primary CTA: “List a platform”.</li>
          <li>Tone: nested frame, cool ink and silver.</li>
        </ul>

        <H>2c. Conversion, logos, founding team</H>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Every board has a conversion box above the ranking: “Claim #1” on foundersbid and culturebid, “Take the top slot” on bidception. Live price to take #1 with +/− to adjust (floor $5). If the bid is at or below the leader, a warning: rank follows the bid — you will sit below #1. URL field, Bid now, helper “$5 minimum · Whole dollars · Re-bids only pay the difference”.</li>
          <li>Every listing shows the submitted URL’s favicon (lazy, same-origin proxy). Missing favicon falls back to a letter monogram.</li>
          <li>Foundersbid is people-first. The founding team is the headline on the board, the detail page, and the manage page. Bid form fields: company name, page URL, one-line proof, founding team names, up to five founder socials, bid amount.</li>
          <li>On foundersbid and culturebid, a leftover-budget card points to bidception.lol. Bidception is the discovery board for other marketing platforms.</li>
        </ul>

        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Pure pay-to-rank. Highest total bid = higher rank. Rank 01 is first.</li>
          <li>Minimum $5. Whole dollars only. No cents on bids.</li>
          <li>Re-bid on the same URL only pays the difference. New total must strictly beat the current total. Ties break to whoever reached the amount first (`last_bid_at` ascending).</li>
          <li>No accounts. Ownership is a secret manage URL issued at payment. Keep it; losing it means the listing cannot be managed from this browser unless the link is recovered.</li>
          <li>Clicks from the board increment a public counter. No IPs, emails, or names stored as personal data.</li>
          <li>Real-time enough: the board and live tape refetch every 3–5 seconds.</li>
          <li>No refunds after an order is marked paid. No editorial slots. No burying a higher bid.</li>
        </ul>

        <H>2b. Temporary hype (views and visits)</H>
        <p>
          Displayed site totals use a decaying multiplier. Rank is never affected.
          Real counts stay in the database. Labels are “visits today” and “total views”
          — never live viewers or people online.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          <li>Day 1: 6×. Linear drop every 24 hours. Exactly 1× after 21 days.</li>
          <li>If real visits in a calendar day reach 8,000, the multiplier locks at 1× forever.</li>
          <li>A view is a page load of the portal, a board, a listing, or the tape. A visit is an outbound click from a listing.</li>
          <li>Per-listing click counts on a row stay real. Only the site-level totals are multiplied.</li>
        </ul>

        <H>3. Tiered swap links</H>
        <p>
          A swap changes the destination URL. Bid, rank, and clicks stay. Fee is
          a percentage of the current bid, rounded to whole dollars, then clamped
          to $10–$2,500.
        </p>
        <div className="mt-4 overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-4 py-3">Current bid</th>
                <th className="px-4 py-3">Base rate</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-t border-border"><td className="px-4 py-2.5">Under $100</td><td className="px-4 py-2.5">10%</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">$100 – $999</td><td className="px-4 py-2.5">15%</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">$1,000 – $4,999</td><td className="px-4 py-2.5">20%</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">$5,000+</td><td className="px-4 py-2.5">25%</td></tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          <li>Top 50 ranks: maximum 3 swaps lifetime. 1st at base rate, 2nd at 35%, 3rd at 50%.</li>
          <li>Rank 51+: unlimited swaps at the base rate.</li>
          <li>Eligibility is re-checked at payment time, because rank can move while checkout is open.</li>
          <li>A swap cannot steal a URL already held by another listing on the same board.</li>
        </ul>

        <H2>Worked examples</H2>
        <div className="mt-4 overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)]">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-4 py-3">Bid</th>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Swap</th>
                <th className="px-4 py-3">Math</th>
                <th className="px-4 py-3">Fee</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-t border-border"><td className="px-4 py-2.5">$50</td><td className="px-4 py-2.5">12</td><td className="px-4 py-2.5">1st</td><td className="px-4 py-2.5">10% = $5 → floor</td><td className="px-4 py-2.5">$10</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">$200</td><td className="px-4 py-2.5">8</td><td className="px-4 py-2.5">2nd</td><td className="px-4 py-2.5">35% of $200</td><td className="px-4 py-2.5">$70</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">$12,400</td><td className="px-4 py-2.5">1</td><td className="px-4 py-2.5">3rd</td><td className="px-4 py-2.5">50% = $6,200 → cap</td><td className="px-4 py-2.5">$2,500</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">$50</td><td className="px-4 py-2.5">61</td><td className="px-4 py-2.5">any</td><td className="px-4 py-2.5">10% → floor, unlimited</td><td className="px-4 py-2.5">$10</td></tr>
            </tbody>
          </table>
        </div>

        <H>4. Page structure</H>
        <ol className="list-decimal space-y-3 pl-5 text-muted">
          <li>
            <strong className="text-fg">Portal /</strong> — bidthrone.lol. Three equal columns:
            foundersbid (“Trust the founding team”), culturebid (“Rank your culture. Attract the people who matter.”),
            bidception (“Discover other marketing platforms”). Live top 3, pool, visits today, total views.
            No full board and no activity on the portal. Header: bidthrone.lol + Full spec.
          </li>
          <li>
            <strong className="text-fg">Board /founders, /culture, /bidception</strong> —
            sticky header (wordmark, Board / Rules / Live, Bid now). Hero,
            three-stat bar, conversion box, leftover-budget card (founders + culture),
            ranked rows, sticky live tape, swap-rate card,
            your listings (this browser). Mobile: sticky bottom CTA.
          </li>
          <li>
            <strong className="text-fg">Rules</strong> — public rulebook, same math
            as the engine, plus a live fee preview.
          </li>
          <li>
            <strong className="text-fg">Bid</strong> — URL, title, tagline,
            team/quote/note, culture values or founder socials, whole-dollar amount. Live quote of charge (full vs
            difference). Prefills title/team/values when the URL already exists.
          </li>
          <li>
            <strong className="text-fg">Checkout /checkout/$orderId</strong> —
            Cashfree checkout. Confirm payment settles the order. Already-paid
            orders do not charge twice.
          </li>
          <li>
            <strong className="text-fg">Manage /manage/$token</strong> — rank, bid,
            visits, re-bid (difference only), swap with live quote, copy manage
            link. Token is the key.
          </li>
          <li>
            <strong className="text-fg">Listing /listing/$id</strong> — public row
            detail, tracked visit, outbid, tape for that listing.
          </li>
          <li>
            <strong className="text-fg">Activity</strong> — full live tape of bids,
            re-bids, swaps.
          </li>
          <li>
            <strong className="text-fg">This spec</strong> — the contract.
          </li>
        </ol>

        <H>5. UI / UX</H>
        <H2>Tokens</H2>
        <div className="mt-4 overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-border)]">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-subtle">
              <tr>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">foundersbid</th>
                <th className="px-4 py-3">culturebid</th>
                <th className="px-4 py-3">bidception</th>
              </tr>
            </thead>
            <tbody className="text-muted">
              <tr className="border-t border-border"><td className="px-4 py-2.5">bg</td><td className="px-4 py-2.5">#f4efe4</td><td className="px-4 py-2.5">#f1efe8</td><td className="px-4 py-2.5">#f3f3f5</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">surface</td><td className="px-4 py-2.5">#ebe4d6</td><td className="px-4 py-2.5">#e8e6de</td><td className="px-4 py-2.5">#eaeaee</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">fg</td><td className="px-4 py-2.5">#1c1712 walnut</td><td className="px-4 py-2.5">#1a1c19 stone</td><td className="px-4 py-2.5">#18181b</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">display</td><td className="px-4 py-2.5">Newsreader</td><td className="px-4 py-2.5">Outfit</td><td className="px-4 py-2.5">Syne</td></tr>
              <tr className="border-t border-border"><td className="px-4 py-2.5">body</td><td className="px-4 py-2.5" colSpan={3}>Outfit, all three</td></tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          <li>Mobile-first. 390px single column. Tap targets 44px (`h-11`). Sticky Bid CTA on small screens. No horizontal overflow.</li>
          <li>Desktop board: `max-w-6xl`, main + 300px sticky aside. Rules `max-w-2xl`. Checkout `max-w-lg`.</li>
          <li>Header 56px, sticky, `bg/90` blur. Hairline borders. Cards `rounded-xl`, controls `rounded-md` (concentric).</li>
          <li>One accent per theme. No purple, gold, emoji, or gradient blobs. Tabular numbers on bids, ranks, visits.</li>
          <li>Rank 01 is the only large gesture on the board (display size). Motion: 150–400ms fade+rise, reduced-motion off.</li>
          <li>Spacing scale 4 / 8 / 12 / 16 / 24 / 32 / 48. Type: kickers xs uppercase, body sm/base, display 4xl–7xl.</li>
        </ul>

        <H>6. Database</H>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-surface p-4 text-xs leading-relaxed text-muted shadow-[var(--shadow-border)]">{`listings (
  id text pk,
  site text check ('founders' | 'culture' | 'bidception'),
  url text not null,
  url_key text not null,          -- host + path, lowercased
  title text not null,
  tagline text default '',
  team text default '',           -- names, quote, or "what it is"
  socials jsonb default '[]',     -- foundersbid, max 5
  values jsonb default '[]',      -- culturebid, max 5
  bid_cents int not null,         -- whole dollars * 100
  rank int,                       -- recast after every paid bid
  clicks int default 0,
  swap_count int default 0,
  manage_token text unique,       -- secret, never in public select
  created_at timestamptz,
  last_bid_at timestamptz,
  unique (site, url_key)
)

orders (
  id text pk,
  site text,
  kind text check ('bid' | 'swap'),
  amount_cents int,               -- charge today, not the new total
  status text check ('pending'|'paid'|'failed'|'expired'),
  listing_id text,
  manage_token text,              -- issued on first bid
  payload jsonb,                  -- url, title, targetBidCents, newUrl…
  created_at timestamptz,
  paid_at timestamptz
)

activity (
  id text pk,
  site text,
  listing_id text,
  kind text check ('bid'|'rebid'|'swap'|'click'),
  amount_cents int,
  rank_to int,
  title text,
  created_at timestamptz
)`}</pre>
        <p className="mt-3 text-muted">
          Rank recomputed after every paid bid as `row_number()` ordered by
          `bid_cents desc, last_bid_at asc, id asc`. `manage_token` never leaves
          paid-order and manage endpoints. Unowned rows: no `user_id`, no
          accounts.
        </p>

        <H>7. Payment + webhook</H>
        <ol className="list-decimal space-y-2 pl-5 text-muted">
          <li>Bid or swap form creates a pending order. Charge is computed server-side (full bid, difference, or swap fee). Client amount is not trusted.</li>
          <li>Checkout shows Cashfree. Confirm payment settles the order. Production: Cashfree order + `payment_session_id` + JS checkout.</li>
          <li>Webhook `POST /api/webhooks/cashfree` on `order.paid`. Body: `data.order.order_id`. Verify signature. Call the same settle path as the confirm button (`confirmPayment`).</li>
          <li>Settle: insert or update listing, recast ranks, write activity, mark order paid, return manage token. Re-bid updates title/tagline/team/url and `last_bid_at`.</li>
          <li>Idempotent: a second paid event for the same order returns the existing listing. A bid that is no longer high enough fails closed.</li>
          <li>After pay: remember the manage token in this browser, toast the new rank, go to `/manage/$token`.</li>
        </ol>

        <H>8. Button, empty, and rules copy</H>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Bid now / Bid the team / Bid the culture / List a platform / Outbid / Pay the difference / Pay with Cashfree / Swap URL / Copy manage link / Copied / Visit page / Visit culture page / Open platform / Read the rules / Live feed / Back to the board</li>
          <li>Empty board (founders): “No founding teams on the board yet. Five dollars puts you first.”</li>
          <li>Empty board (culture): “No culture pages on the board yet. Five dollars puts you first.”</li>
          <li>Empty board (bidception): “No marketing platforms listed. Five dollars puts the first tool first.”</li>
          <li>Empty tape: “Quiet. The next bid for a founding team lands here.” / “Quiet. The next culture bid lands here.” / “Quiet. The next platform bid lands here.”</li>
          <li>Checkout: “Cashfree Payments · USD”</li>
          <li>Min bid: “Minimum $5. Whole dollars only.” Re-bid: “Re-bidding the same URL only charges the difference.”</li>
          <li>Manage invalid: “Manage link not valid.” Swap spent: “Top 50 listings get three URL swaps for the life of the listing. This one is spent.”</li>
          <li>Rules live on each board at /founders/rules, /culture/rules, and /bidception/rules.</li>
        </ul>

        <H>9. Design language</H>
        <p>
          Premium, viral, quiet. A letterhead, not a casino. Three sibling
          identities, one grid. Large display type, small uppercase kickers,
          bone/stone/silver as the only loud material. The product should feel like
          it was typeset, then wired to a card network.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          <li>foundersbid: Newsreader italic for the second hero line, warm paper-on-ink, team names in the row.</li>
          <li>culturebid: Outfit wordmark, cool stone, values chips, optional quote. Professional letterhead.</li>
          <li>bidception: Syne geometric wordmark, silver accent, marketing-platform discovery.</li>
          <li>Portal: three equal columns. Board: rank as the left column, bid as the right, visits as a quiet counter.</li>
          <li>Never: purple, gold, emoji chrome, blob gradients, Inter-on-Inter, identical radii on parent and child.</li>
        </ul>

        <div className="mt-14 flex flex-wrap gap-3">
          <Link
            to="/$site"
            params={{ site: "founders" }}
            className="inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
          >
            Open foundersbid
          </Link>
          <Link
            to="/$site"
            params={{ site: "culture" }}
            className="inline-flex h-11 items-center rounded-md px-4 text-sm shadow-[var(--shadow-border)]"
          >
            Open culturebid
          </Link>
          <Link
            to="/$site"
            params={{ site: "bidception" }}
            className="inline-flex h-11 items-center rounded-md px-4 text-sm shadow-[var(--shadow-border)]"
          >
            Open bidception
          </Link>
        </div>
      </article>
      <SiteFooter site="portal" />
    </div>
  );
}

function H({ children }: { children: string }) {
  return (
    <h2 className="mt-14 font-display text-2xl tracking-tight sm:text-3xl">{children}</h2>
  );
}

function H2({ children }: { children: string }) {
  return <h3 className="mt-8 text-lg font-medium">{children}</h3>;
}

function Quote({ children }: { children: string }) {
  return (
    <blockquote className="mt-4 border-l border-border pl-4 font-display text-xl italic text-fg">
      {children}
    </blockquote>
  );
}
