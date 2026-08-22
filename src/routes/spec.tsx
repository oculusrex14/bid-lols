import { Link, createFileRoute } from "@tanstack/react-router";
import { ModeToggle } from "@/components/mode-toggle";
import { SiteFooter } from "@/components/site-footer";
import { PORTAL, SITE_IDS, SITES } from "@/lib/sites";

export const Route = createFileRoute("/spec")({
  component: SpecPage,
  head: () => ({
    meta: [
      { title: `${PORTAL.domain} — How it works` },
      {
        name: "description",
        content:
          "How bidthrone ranking works, what you need to know before you bid, and important disclaimers.",
      },
    ],
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
        <p className="text-xs uppercase tracking-kicker text-subtle">Need to know</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-6xl">
          Pay once to rank. Highest bid stands first.
        </h1>
        <p className="mt-5 text-lg text-muted">
          {PORTAL.domain} is the front door to three public boards. Ranking is paid
          and visible. Read this before you bid.
        </p>

        <H>The three boards</H>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-muted">
          <li>
            <strong className="text-fg">foundersbid.lol</strong> — founding teams,
            about pages, studios.
          </li>
          <li>
            <strong className="text-fg">culturebid.lol</strong> — company culture and
            careers pages.
          </li>
          <li>
            <strong className="text-fg">bidception.lol</strong> — other marketing
            platforms and directories.
          </li>
        </ul>

        <H>How ranking works</H>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          <li>Highest total bid ranks first. No editorial slots. No complex ranking algorithm.</li>
          <li>Minimum $5. Whole US dollars only. Re-bidding the same URL charges only the difference.</li>
          <li>There are no accounts. After payment you receive a secret manage link. Save it — it is the only way to re-bid or swap that listing.</li>
          <li>URL swaps are paid fees based on the current bid. Rules are on each board’s Rules page.</li>
          <li>No refunds after Cashfree marks an order paid.</li>
        </ul>

        <H>Payments</H>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          <li>Checkout is Cashfree. Indian payment methods only for now (UPI, cards, netbanking, wallets).</li>
          <li>Board prices are shown in USD. You pay the INR equivalent at checkout.</li>
          <li>A global payment gateway may be added later.</li>
        </ul>

        <H>Disclaimers</H>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
          <li>
            <strong className="text-fg">No traffic guarantee.</strong> Buying rank does
            not guarantee visits, clicks, leads, hires, sales, or conversions.
          </li>
          <li>
            <strong className="text-fg">Rank can change.</strong> Anyone can outbid you
            at any time. Paid rank is not permanent placement.
          </li>
          <li>
            <strong className="text-fg">Not an endorsement.</strong> A listing’s position
            reflects bid amount only. We do not vouch for any page, company, or
            platform.
          </li>
          <li>
            <strong className="text-fg">Real counts only.</strong> Site-level “visits
            today” and “total views” are recorded counts — zero means zero. They do
            not affect rank. Per-listing click counts on a row are real outbound
            clicks.
          </li>
          <li>
            <strong className="text-fg">Manage links.</strong> If you lose the manage
            URL, we cannot restore control from an email or name. Optional checkout
            email is forwarded to Cashfree for the receipt only and is not stored by
            us.
          </li>
          <li>
            <strong className="text-fg">As-is service.</strong> Boards may have downtime.
            We are not liable for lost manage links, lost rank, or outcomes from a
            listing.
          </li>
        </ul>

        <H>Legal</H>
        <p className="mt-4 text-muted">
          Full terms, privacy, refund, and contact pages live on each board:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
          {SITE_IDS.map((id) => (
            <li key={id}>
              <span className="text-fg">{SITES[id].domain}</span>
              {" — "}
              <Link
                to="/$site/terms"
                params={{ site: id }}
                className="underline underline-offset-2 hover:text-fg"
              >
                Terms
              </Link>
              {", "}
              <Link
                to="/$site/privacy"
                params={{ site: id }}
                className="underline underline-offset-2 hover:text-fg"
              >
                Privacy
              </Link>
              {", "}
              <Link
                to="/$site/refund"
                params={{ site: id }}
                className="underline underline-offset-2 hover:text-fg"
              >
                Refund
              </Link>
              {", "}
              <Link
                to="/$site/contact"
                params={{ site: id }}
                className="underline underline-offset-2 hover:text-fg"
              >
                Contact
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-14 flex flex-wrap gap-3">
          {SITE_IDS.map((id) => (
            <Link
              key={id}
              to="/$site"
              params={{ site: id }}
              className={
                id === "founders"
                  ? "inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
                  : "inline-flex h-11 items-center rounded-md px-4 text-sm shadow-[var(--shadow-border)]"
              }
            >
              Open {SITES[id].wordmark}
            </Link>
          ))}
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
