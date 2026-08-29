import type { BlogArticle, BlogBlock } from "@/content/blog/articles";

/**
 * Renders a blog article body as semantic HTML (RC2, C5). Server-rendered:
 * every word is in the initial HTML, no client JavaScript is required to
 * read the article. Blocks are first-party authored content, so raw text
 * goes through React escaping (never dangerouslySetInnerHTML).
 */
export function ArticleView({ article }: { article: BlogArticle }) {
  return (
    <article className="canvas-prose py-10">
      <h1 className="font-display-site text-3xl leading-tight tracking-tight sm:text-4xl">
        {article.headline}
      </h1>
      <p className="mt-3 text-sm text-subtle">
        {new Date(article.publishedAt).toDateString()}
        {article.modifiedAt !== article.publishedAt
          ? ` · updated ${new Date(article.modifiedAt).toDateString()}`
          : ""}
      </p>
      <div className="mt-8 space-y-5">{article.blocks.map((b, i) => <Block key={i} block={b} />)}</div>
    </article>
  );
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.kind) {
    case "h2":
      return (
        <h2 className="pt-4 font-display-site text-2xl tracking-tight">{block.text}</h2>
      );
    case "h3":
      return <h3 className="pt-2 font-display-site text-xl tracking-tight">{block.text}</h3>;
    case "p":
      return <p className="text-base leading-relaxed text-muted">{block.text}</p>;
    case "ul":
      return (
        <ul className="list-disc space-y-2 pl-5 text-base leading-relaxed text-muted marker:text-subtle">
          {block.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-md border border-fg/15">
          <table className="w-full text-sm">
            <thead className="bg-raised/50 text-left text-xs uppercase tracking-kicker text-subtle">
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className="p-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-t border-fg/10 align-top">
                  {row.map((cell, c) => (
                    <td key={c} className={c === 0 ? "p-3 font-medium" : "p-3 text-muted"}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <div className="rounded-md border border-accent/30 bg-raised/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
            {block.label}
          </p>
          <p className="mt-2 text-sm leading-relaxed">{block.text}</p>
        </div>
      );
    case "links":
      return (
        <nav aria-label="Related links" className="rounded-md border border-fg/15 bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
            Keep reading
          </p>
          <ul className="mt-2 space-y-1.5">
            {block.items.map((l) => (
              <li key={l.to + l.label}>
                <a
                  href={l.external ? l.to : l.to}
                  rel={l.external ? "nofollow" : undefined}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      );
    default:
      return null;
  }
}
