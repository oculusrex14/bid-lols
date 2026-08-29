import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProductShell } from "@/components/product-shell";
import { currentProductKey } from "@/lib/host";
import { marketplaceShell } from "@/lib/shell-context";

/**
 * /post — FoundersBid quick choice (RC3, S-7.3). "Post work" must not dump
 * users straight into Bounty creation when Project is a first-class mode:
 * two materially different offers, one honest description each, and the
 * user picks.
 *
 * Host behaviour:
 *  - foundersbid: serves this page.
 *  - culturebid:  has bounties but no projects — the chooser is meaningless,
 *    so it redirects to its own creation form (same host).
 *  - bidthrone / bidception: the capability read-redirect middleware sends
 *    the GET to https://foundersbid.lol/post before this loader runs.
 * The page is a thin chooser, not search content: noindex (PRIVATE_PATHS).
 */
export const Route = createFileRoute("/post")({
  loader: async () => {
    const productKey = await currentProductKey();
    if (productKey === "culturebid") throw redirect({ to: "/bounties/new" });
    return marketplaceShell();
  },
  component: PostChooser,
});

function PostChooser() {
  const { product, me } = Route.useLoaderData();
  return (
    <ProductShell site={product} me={me}>
      <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-5">
        <h1 className="font-display-site text-3xl tracking-tight sm:text-4xl">Post work</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
          FoundersBid runs two kinds of listing. They look similar, but the
          rules for participants and for money are different, so pick the one
          that matches the job.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="flex flex-col rounded-md border border-fg/15 bg-surface p-5">
            <h2 className="font-display-site text-xl tracking-tight">Bounty</h2>
            <p className="mt-1 text-sm font-medium text-accent">
              Several qualified people can compete on a bounded task.
            </p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
              You describe one bounded piece of work, set the reward, the
              deadline, and how many people take part. Each participant
              submits their best attempt. You review the submissions and pick
              the winner.
            </p>
            <a
              href="/bounties/new"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-fg"
            >
              Post a bounty
            </a>
          </section>

          <section className="flex flex-col rounded-md border border-fg/15 bg-surface p-5">
            <h2 className="font-display-site text-xl tracking-tight">Project</h2>
            <p className="mt-1 text-sm font-medium text-accent">
              Choose one provider from proposals before work begins.
            </p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
              Providers send you a proposal: their approach, their evidence,
              their price, their milestones. You pick one person. The work is
              funded after selection and runs through the milestones, each
              paid when you approve it.
            </p>
            <a
              href="/projects/new"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-md border border-fg/30 px-4 text-sm font-semibold hover:border-fg/60"
            >
              Post a project
            </a>
          </section>
        </div>

        <p className="mt-6 text-sm text-muted">
          Not sure which one fits?{" "}
          <a href="/blog/bounty-or-project" className="underline underline-offset-4">
            Read the full comparison
          </a>{" "}
          before you start.
        </p>
      </div>
    </ProductShell>
  );
}
