import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PORTAL, SITE_IDS, SITES, COPY, otherSites, type SiteId } from "@/lib/sites";
import { contactEmail } from "@/lib/legal";
import { LegalLinks } from "@/components/legal-links";

export function SiteFooter({
  site,
  showSister = true,
}: {
  site: SiteId | "portal";
  showSister?: boolean;
}) {
  const portal = site === "portal";
  const cfg = portal ? null : SITES[site];
  const email = portal ? null : contactEmail(site);
  const sisters = portal ? SITE_IDS : otherSites(site);

  return (
    <footer className="border-t-2 border-fg/20 bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 sm:px-5">
        <p className="text-sm text-muted">
          {portal ? PORTAL.domain : cfg!.domain} · highest bid ranks first · {COPY.minBid}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link to="/" preload="intent" className="hover:text-muted">
            {PORTAL.domain}
          </Link>
          {showSister
            ? sisters.map((id) => (
                <Link
                  key={id}
                  to="/$site"
                  params={{ site: id }}
                  preload="intent"
                  className="inline-flex items-center gap-1 hover:text-muted"
                >
                  {SITES[id].domain}
                  <ArrowUpRight className="size-3.5" />
                </Link>
              ))
            : null}
        </div>
        <div className="border-t border-border pt-5">
          <p className="text-sm text-fg">
            Cashfree Payments · no refunds
            {portal ? (
              <span className="mt-2 block text-sm text-muted">
                {SITE_IDS.map((id, i) => (
                  <span key={id}>
                    {i > 0 ? " · " : null}
                    <a
                      href={`mailto:${contactEmail(id)}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {contactEmail(id)}
                    </a>
                  </span>
                ))}
              </span>
            ) : (
              <>
                {" · "}
                <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">
                  {email}
                </a>
              </>
            )}
          </p>
          <LegalLinks site={portal ? "founders" : site} className="mt-4" />
        </div>
      </div>
    </footer>
  );
}
