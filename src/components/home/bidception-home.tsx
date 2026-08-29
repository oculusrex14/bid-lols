import { FoundingAccess } from "@/components/founding-access";
import { JsonLd } from "@/components/seo";
import { websiteSchema } from "@/lib/schema";
import type { ShellMe } from "@/components/product-shell";
import type { HomePreview } from "@/lib/marketplace/home-preview.server";
import { Kicker } from "@/components/home/shared";
import { BudgetBar } from "@/components/ui/data";
import { MoneyValue } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { SectionHeader } from "@/components/ui/layout";

/**
 * Bidception home (RC3, S-27): the most structurally different surface —
 * the hero shows the PROJECT TREE shape (parent -> work packages) with the
 * BUDGET BAR, because that IS the product. The live preview renders real
 * funded/active parents when they exist; otherwise a clearly-labelled
 * example tree. No card stacks, no brochure paragraphs before the shape.
 */

const EXAMPLE_CHILDREN: Array<{ label: string; minor: number; fill: string }> = [
  { label: "Landing page", minor: 30_000_00, fill: "bg-accent" },
  { label: "Demo video", minor: 20_000_00, fill: "bg-accent/70" },
  { label: "Launch outreach", minor: 25_000_00, fill: "bg-accent/45" },
  { label: "Post-launch analytics", minor: 15_000_00, fill: "bg-accent/25" },
];

export function BidceptionHome({ me, preview }: { me?: ShellMe | null; preview: HomePreview }) {
  const parents = preview.kind === "parents" ? preview.items : [];
  const top = parents[0];

  return (
    <>
      <section className="canvas-wide grid grid-cols-1 gap-8 pt-14 sm:pt-20 lg:grid-cols-12">
        {/* Left: the one-sentence model + actions. */}
        <div className="lg:col-span-7">
          <Kicker>Bidception</Kicker>
          <h1 className="mt-4 font-display-site text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl">
            Big project. One budget.
            <span className="block text-subtle">The right people for each part.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            A launch needs design, development, video, copy, and outreach. No
            one freelancer does all of it well. Bidception funds the whole
            project in a single budget, puts a captain in charge of the split,
            and gives each part to the person suited to it. The engine refuses
            to allocate more than exists.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/bidception/new"
              className="inline-flex h-12 items-center rounded-sm bg-accent px-5 text-sm font-semibold text-accent-fg transition-colors duration-150 hover:bg-accent/90"
            >
              Start a project
            </a>
            <a
              href="/bidception"
              className="inline-flex h-12 items-center rounded-sm border border-fg/25 px-5 text-sm font-semibold transition-colors duration-150 hover:border-fg/50"
            >
              See team projects
            </a>
            {me ? (
              <a href="/dashboard" className="text-sm font-medium text-accent underline underline-offset-4">
                Your dashboard
              </a>
            ) : (
              <a href="/signup" className="text-sm font-medium text-accent underline underline-offset-4">
                Create an account
              </a>
            )}
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-subtle" data-testid="funding-note">
            Parent projects can be created today. Funding is not enabled yet,
            so funded team projects do not appear on the site at the moment,
            and nothing on this site takes payment now.
          </p>
        </div>

        {/* Right: the shape of the product — a tree + a reconciled budget. */}
        <div className="lg:col-span-5">
          <div className="rounded-md border border-fg/10 bg-surface/60 p-4">
            {top ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Live team project</p>
                <a href={`/bidception/${top.id}`} className="mt-2 block font-display-site text-xl tracking-tight hover:underline hover:underline-offset-4">
                  {top.title}
                </a>
                <div className="mt-1.5 flex items-center justify-between">
                  <StatusBadge status={top.status} />
                  <span className="text-xs text-subtle">{top.child_count} work packages</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Open the project to see the work packages and how every
                  allocation reconciles to the parent budget.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">
                  Example tree, not a live project
                </p>
                <p className="mt-2 font-display-site text-xl tracking-tight">Launch a new product site · ₹1,00,000</p>
                <ul className="mt-3 space-y-1.5">
                  {EXAMPLE_CHILDREN.map((c, i) => (
                    <li key={c.label} className="flex items-center gap-2 pl-4 text-sm text-muted" style={{ borderLeft: "none" }}>
                      <span className="text-xs text-subtle" aria-hidden="true">{i + 1}.</span>
                      {c.label}
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <BudgetBar
                    totalMinor={100_000_00}
                    segments={[
                      ...EXAMPLE_CHILDREN.map((c) => ({ key: c.label, label: c.label, minor: c.minor, fill: c.fill })),
                      { key: "captain", label: "Captain fee", minor: 10_000_00, fill: "bg-fg/30" },
                    ]}
                  />
                  <p className="mt-2 text-xs text-subtle">
                    ₹30,000 + ₹20,000 + ₹25,000 + ₹15,000 + ₹10,000 captain
                    fee = ₹1,00,000. This is an example. It is not a live
                    project.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* How it works: numbered steps, quiet, no card wall. */}
      <section className="canvas-wide mt-14 sm:mt-16">
        <SectionHeader title="How it works" />
        <ol className="mt-5 space-y-5">
          <Step n={1} title="Fund the project">
            The sponsor sets the total budget for everything the project
            needs. The total is public on the project page.
          </Step>
          <Step n={2} title="Choose a captain">
            The sponsor picks a member for the coordination, and the captain
            is paid for it from the budget (example: ₹10,000 of a ₹1,00,000
            project).
          </Step>
          <Step n={3} title="Each part gets its own budget">
            The captain splits the remaining budget into work packages. Each
            package is either a competitive bounty (several people, one
            winner) or a proposal-first project (one chosen provider).
          </Step>
          <Step n={4} title="The project settles">
            When every part is done, the project settles and any unused
            reserve goes back to the sponsor. Internally the model is a
            nested bounty: a funded parent with funded children.
          </Step>
        </ol>
      </section>

      {/* The live projects, or the honest empty state. */}
      <section className="canvas-wide py-10">
        <SectionHeader
          title="Team projects"
          aside={
            <a href="/bidception" className="text-xs font-medium text-accent underline underline-offset-4">
              Browse all
            </a>
          }
        />
        {parents.length > 0 ? (
          <div className="mt-4">
            {parents.map((p) => (
              <a
                key={p.id}
                href={`/bidception/${p.id}`}
                className="row-line flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-3 transition-colors duration-150 hover:bg-surface/70"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium hover:underline hover:underline-offset-4">{p.title}</span>
                <span className="hidden text-xs text-subtle sm:block">{p.child_count} work packages</span>
                {p.funded_budget_minor != null ? (
                  <MoneyValue minor={p.funded_budget_minor} currency={p.currency} size="sm" className="text-accent" />
                ) : null}
                <StatusBadge status={p.status} />
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-fg/15 bg-surface/40 p-6 text-sm leading-relaxed text-muted">
            No funded team projects yet. A team project appears here once its
            full budget is funded: a sponsor sets the total, a captain splits
            it into work packages, and specialists take the parts they are
            good at. Drafts stay private until funding happens.
          </div>
        )}
      </section>

      <section className="canvas-wide py-6">
        <SectionHeader title="The write up" />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Why big freelance projects break under one person, what a paid
          captain does, and the budget rule that keeps nesting honest.
        </p>
        <a
          href="/blog/building-a-project-with-multiple-freelancers"
          className="mt-2 inline-block text-sm font-medium text-accent underline underline-offset-4"
        >
          Big freelance projects break when one person is expected to do everything
        </a>
      </section>

      <JsonLd data={[websiteSchema("bidception")]} />

      <section className="canvas-wide pb-16">
        <FoundingAccess
          site="bidception"
          defaultRole="captain"
          heading="Interested in captaining?"
          intro="Captains lead teams on funded projects and are paid for the coordination. Leave your email and we will write when funding opens."
          ctaLabel="Notify me"
        />
      </section>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-fg/20 text-xs font-semibold tabular">
        {n}
      </span>
      <div className="min-w-0 pt-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}

