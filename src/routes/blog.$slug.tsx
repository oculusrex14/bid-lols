import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey, product, seoOrigin, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { ArticleView } from "@/components/blog/article-view";
import { JsonLd } from "@/components/seo";
import { blogPostingSchema, breadcrumbSchema } from "@/lib/schema";
import { articleBySlug, type BlogArticle } from "@/content/blog/articles";

/**
 * /blog/:slug — first-party article (RC2, C5).
 *  - unknown slug: a real 404 (branded, noindex, no canonical);
 *  - wrong-domain read: 301 to the article on its product's canonical origin
 *    (host-scoped blogs: foundersbid articles never serve on culturebid).
 */
const loadArticle = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) =>
    z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,96}$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    const hostProduct = await currentProductKey();
    const article = articleBySlug(data.slug);
    if (!article) throw notFound();
    if (article.product !== hostProduct) {
      throw redirect({
        href: `${seoOrigin(article.product)}/blog/${article.slug}`,
        statusCode: 301,
      });
    }
    const { me } = await (await import("@/lib/shell-context")).getShellContext();
    return { article, product: hostProduct, me };
  });

export const Route = createFileRoute("/blog/$slug")({
  loader: (ctx) => loadArticle({ data: { slug: ctx.params.slug } }),
  component: BlogArticlePage,
});

function BlogArticlePage() {
  const d = Route.useLoaderData();
  const p = d.product as ProductKey;
  const article = d.article as BlogArticle;
  const origin = seoOrigin(p);
  return (
    <ProductShell site={p} me={d.me}>
      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-5">
        <nav aria-label="Breadcrumb" className="text-sm text-subtle">
          <a href="/" className="underline-offset-4 hover:underline">
            {product(p).name}
          </a>
          <span aria-hidden="true"> / </span>
          <a href="/blog" className="underline-offset-4 hover:underline">
            Blog
          </a>
        </nav>
      </div>
      <ArticleView article={article} />
      <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-5">
        <JsonLd
          data={[
            blogPostingSchema(p, article),
            breadcrumbSchema(p, [
              { name: product(p).name, url: origin },
              { name: "Blog", url: `${origin}/blog` },
              { name: article.headline, url: `${origin}/blog/${article.slug}` },
            ]),
          ]}
        />
      </div>
    </ProductShell>
  );
}
