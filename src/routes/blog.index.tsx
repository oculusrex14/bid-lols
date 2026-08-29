import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, product, seoOrigin } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { JsonLd } from "@/components/seo";
import { itemListSchema, websiteSchema } from "@/lib/schema";
import { articlesForProduct, type BlogArticle } from "@/content/blog/articles";

/**
 * /blog — host-scoped first-party blog index (RC2, C5). Each product domain
 * lists only its own articles. Wrong-domain article reads 301 in the
 * article loader; the index itself is a shared surface with shared meaning.
 */
const loadBlog = createServerFn({ method: "GET" }).handler(async () => {
  const product = await currentProductKey();
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  return { product, me, articles: articlesForProduct(product) };
});

export const Route = createFileRoute("/blog/")({
  loader: () => loadBlog(),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const d = Route.useLoaderData();
  const p = d.product as BlogArticle["product"];
  return (
    <ProductShell site={p} me={d.me}>
      <div className="canvas-prose py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
          {product(p).name}
        </p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">
          The {product(p).name} blog
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Notes from the people building {product(p).name}. How each piece of
          the network works, why it is shaped the way it is, and where it
          stands today.
        </p>

        <div className="mt-8 space-y-4">
          {d.articles.map((a) => (
            <Link
              key={a.slug}
              to="/blog/$slug"
              params={{ slug: a.slug }}
              className="block rounded-md border border-fg/15 bg-surface p-5 transition-colors duration-150 hover:border-fg/40"
            >
              <p className="text-xs text-subtle">
                {new Date(a.publishedAt).toDateString()}
              </p>
              <h2 className="mt-1 font-display-site text-xl leading-snug tracking-tight">
                {a.headline}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{a.description}</p>
            </Link>
          ))}
        </div>

        <JsonLd
          data={[
            websiteSchema(p),
            itemListSchema(
              p,
              d.articles.map((a) => ({
                name: a.headline,
                url: `${seoOrigin(p)}/blog/${a.slug}`,
              })),
            ),
          ]}
        />
      </div>
    </ProductShell>
  );
}
