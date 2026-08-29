import { Link } from "@tanstack/react-router";
import { contactEmail, legalDoc, type LegalSlug } from "@/lib/legal";
import { product, type ProductKey } from "@/lib/host";
import { LegalLinks } from "@/components/legal-links";
import { ButtonLink } from "@/components/ui/button";

export function LegalPage({
  productKey,
  slug,
}: {
  productKey: ProductKey;
  slug: LegalSlug;
}) {
  const cfg = product(productKey);
  const doc = legalDoc(productKey, slug);
  const email = contactEmail(productKey);

  return (
    <article className="canvas-prose py-12">
      <p className="text-xs uppercase tracking-kicker text-subtle">{cfg.apex}</p>
      <h1 className="mt-3 font-display-site text-4xl tracking-tight sm:text-5xl">
        {doc.title}
      </h1>
      <p className="mt-2 text-xs text-subtle">Updated {doc.updated}</p>
      <p className="mt-5 text-muted">{doc.intro}</p>
      {slug === "contact" ? (
        <ButtonLink href={`mailto:${email}`} size="md" className="mt-6">
          {email}
        </ButtonLink>
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
        <LegalLinks />
        <Link to="/" className="mt-4 inline-block text-sm text-muted hover:text-fg">
          Back to {cfg.name}
        </Link>
      </div>
    </article>
  );
}
