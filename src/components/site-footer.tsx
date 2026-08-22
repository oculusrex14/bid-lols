import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PORTAL, SITES, COPY, type SiteId } from "@/lib/sites";
import { contactEmail } from "@/lib/legal";
import { LegalLinks } from "@/components/legal-links";

export function SiteFooter({
  site,
  showSister = true,
}: {
  site: SiteId;
  showSister?: boolean;
}) {
  const cfg = SITES[site];
  const email = contactEmail(site);
  const other: SiteId = site === "founders" ? "bidception" : "founders";

  return (
    <footer className="border-t-2 border-fg/20 bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-5">
        <p className="text-sm text-muted">
          {cfg.domain} · highest bid ranks first · {COPY.minBid}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link to="/" className="hover:text-muted">
            {PORTAL.domain}
          </Link>
          {showSister ? (
            <Link
              to="/$site"
              params={{ site: other }}
              className="inline-flex items-center gap-1 hover:text-muted"
            >
              {SITES[other].domain}
              <ArrowUpRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
        <div className="border-t border-border pt-5">
          <p className="text-sm text-fg">
            Cashfree Payments · no refunds ·{" "}
            <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">
              {email}
            </a>
          </p>
          <LegalLinks site={site} className="mt-4" />
        </div>
      </div>
    </footer>
  );
}
