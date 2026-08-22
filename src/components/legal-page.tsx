import { Link } from "@tanstack/react-router";
import { contactEmail, legalDoc, type LegalSlug } from "@/lib/legal";
import { SITES, type SiteId } from "@/lib/sites";
import { LegalLinks } from "@/components/legal-links";

export function LegalPage({ site, slug }: { site: SiteId; slug: LegalSlug }) {
  const cfg = SITES[site];
  const doc = legalDoc(site, slug);
  const email = contactEmail(site);

  return (
    <article className="mx-auto max-w-2xl">
      <p className="text-xs uppercase tracking-kicker text-subtle">{cfg.domain}</p>
      <h1 className="mt-3 font-display-site text-4xl tracking-tight sm:text-5xl">
        {doc.title}
      </h1>
      <p className="mt-2 text-xs text-subtle">Updated {doc.updated}</p>
      <p className="mt-5 text-muted">{doc.intro}</p>
      {slug === "contact" ? (
        <a
          href={`mailto:${email}`}
          className="mt-6 inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
        >
          {email}
        </a>
      ) : null}
      {doc.blocks.map((block) => (
        <section key={block.heading ?? block.body[0]} className="mt-8">
          {block.heading ? (
            <h2 className="font-display-site text-2xl tracking-tight">{block.heading}</h2>
          ) : null}
          <div className="mt-3 space-y-3 text-muted">
            {block.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
      ))}
      <div className="mt-12 border-t border-border pt-6">
        <LegalLinks site={site} />
        <Link
          to="/$site"
          params={{ site }}
          className="mt-4 inline-block text-sm text-muted hover:text-fg"
        >
          Back to the board
        </Link>
      </div>
    </article>
  );
}
