import { Kicker } from "@/components/home/shared";
import { JsonLd } from "@/components/seo";
import { websiteSchema } from "@/lib/schema";
import { FoundingAccess } from "@/components/founding-access";
import type { ShellMe } from "@/components/product-shell";
import type { HomePreview } from "@/lib/marketplace/home-preview.server";
import { linkOrigin } from "@/lib/host";
import { MoneyValue } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status";
import { SectionHeader } from "@/components/ui/layout";
import { BudgetTree } from "@/components/product-objects/budget-tree";
import { bidceptionSampleTree } from "@/lib/sample-content";
import { Users, HeartHandshake, Compass } from "lucide-react";
import type { SupportedCurrency } from "@/lib/money";

/**
 * Bidception home (RC5 §22): the systems console. The allocation tree is
 * the dominant hero object (sample tree when no real parent exists; a real
 * parent summary when it does — the full visual tree lives in the
 * workspace). The role rail offers three HONEST doors: start a project,
 * captain interest (no public captain marketplace yet), and take a part
 * (parts open when a captain splits a funded project; open work lives on
 * FoundersBid until then). No "Fund a project" while moneyMode is off.
 */

type HomeParents = Extract<HomePreview, { kind: "parents" }>["items"];

const TAKE_PART_HREF = `${linkOrigin("foundersbid")}/bounties`;

export function BidceptionHome({
  me,
  preview,
  viewerCurrency,
}: {
  me?: ShellMe | null;
  preview: HomePreview;
  viewerCurrency: SupportedCurrency;
}) {
  const parents = preview.kind === "parents" ? preview.items : [];
  const top = parents[0];
  void me;
  return (
    <>
      <section className="canvas-brand pt-14 sm:pt-20">
        <Kicker>Bidception</Kicker>
        <h1 className="obj-hero-type mt-5 max-w-[18ch]">
          Big project. One budget.{" "}
          <span className="block text-subtle">The right people for each part.</span>
        </h1>
        <p className="obj-hero-lead mt-5 text-muted">
          A launch needs design, development, video, copy, and outreach. No
          one freelancer does all of it well. Bidception funds the whole
          project in a single budget, puts a captain in charge of the split,
          and gives each part to the person suited to it. The engine refuses
          to allocate more than exists.
        </p>
      </section>

      <RoleRailAndTree top={top} viewerCurrency={viewerCurrency} />
      <BidHowItWorks />
      <BidLiveProjects parents={parents} />
      <WriteUpSection />
      <JsonLd data={[websiteSchema("bidception")]} />
      <section className="canvas-brand pb-16">
        <div id="captain-interest">
          <FoundingAccess
            site="bidception"
            defaultRole="captain"
            heading="Interested in captaining?"
            intro="Captains lead teams on funded projects and are paid for the coordination. Leave your email and we will write when funding opens."
            ctaLabel="Notify me"
          />
        </div>
      </section>
    </>
  );
}

/** The three doors + the tree, as one composition (RC5 §22.3/§22.9). */
function RoleRailAndTree({
  top,
  viewerCurrency,
}: {
  top: HomeParents[number] | undefined;
  viewerCurrency: SupportedCurrency;
}) {
  const sampleTree = bidceptionSampleTree(viewerCurrency);
  return (
    <section className="canvas-brand mt-10 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Choose your role" className="role-rail">
        <RoleDoor
          icon={<Compass className="size-4" aria-hidden="true" />}
          title="Start a project"
          body="Set the total budget and choose a captain. Drafts open today; funding is not live yet."
          cta="Start a project"
          href="/bidception/new"
        />
        <RoleDoor
          icon={<HeartHandshake className="size-4" aria-hidden="true" />}
          title="Captain a team"
          body="There is no public captain marketplace yet. Leave your interest and we will reach out first."
          cta="Join the interest list"
          href="#captain-interest"
        />
        <RoleDoor
          icon={<Users className="size-4" aria-hidden="true" />}
          title="Take a part"
          body="Parts open when a captain splits a funded project. Open work lives on FoundersBid in the meantime."
          cta="Browse open work on FoundersBid"
          href={TAKE_PART_HREF}
        />
      </nav>

      {top ? (
        <div className="min-w-0">
          <RealParentSummary top={top} />
          <p className="mt-2 text-xs text-subtle">
            The full allocation tree (captain, child work packages, reserve,
            and how the funded budget reconciles) lives in the project
            workspace.
          </p>
        </div>
      ) : (
        <BudgetTree
          sample
          values={sampleTree}
          note={sampleTree.note}
          className="min-w-0"
        />
      )}
    </section>
  );
}

function RoleDoor({
  icon,
  title,
  body,
  cta,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <a href={href} className="role-door block transition-colors duration-150 hover:border-line-strong">
      <span className="role-door-icon">{icon}</span>
      <p className="mt-2.5 text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
      <p className="mt-2.5 text-xs font-medium text-accent">{cta} →</p>
    </a>
  );
}

/** RC5 §22.9: a real parent, summarized truthfully (no invented tree). */
function RealParentSummary({ top }: { top: HomeParents[number] }) {
  return (
    <a
      href={`/bidception/${top.id}`}
      className="budget-tree-shell group block transition-colors duration-150 hover:border-line-strong"
    >
      <p className="obj-microlabel text-subtle">Live team project</p>
      <p className="mt-2 font-display-site text-2xl font-semibold tracking-tight group-hover:underline">
        {top.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
        <StatusBadge status={top.status} />
        <span>{top.child_count} work package{top.child_count === 1 ? "" : "s"}</span>
        {top.funded_budget_minor != null ? (
          <MoneyValue
            minor={top.funded_budget_minor}
            currency={top.currency}
            size="md"
            className="text-accent"
            trimZeroDecimals
          />
        ) : (
          <span>Not funded yet</span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium text-accent">Open the workspace →</p>
    </a>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-xs font-semibold tabular">
        {n}
      </span>
      <div className="min-w-0 pt-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{children}</p>
      </div>
    </li>
  );
}

function BidHowItWorks() {
  return (
    <section className="canvas-brand mt-14 sm:mt-16">
      <ol className="mt-5 space-y-5">
        <Step n={1} title="Set the project budget">
          The sponsor sets the total budget for everything the project
          needs. The total is public on the project page. Funding is not
          live yet, so today this is the draft step.
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
  );
}

function BidLiveProjects({ parents }: { parents: HomeParents }) {
  return (
    <section className="canvas-brand py-10">
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
                <MoneyValue minor={p.funded_budget_minor} currency={p.currency} size="sm" className="text-accent" trimZeroDecimals />
              ) : null}
              <StatusBadge status={p.status} />
            </a>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-line-strong bg-surface/40 p-6 text-sm leading-relaxed text-muted">
          No funded team projects yet. A team project appears here once its
          full budget is funded: a sponsor sets the total, a captain splits
          it into work packages, and specialists take the parts they are
          good at. Drafts stay private until funding happens.
        </div>
      )}
    </section>
  );
}

function WriteUpSection() {
  return (
    <section className="canvas-brand py-6">
      <SectionHeader title="The write up" />
      <a
        href="/blog/building-a-project-with-multiple-freelancers"
        className="mt-2 inline-block text-sm font-medium text-accent underline underline-offset-4"
      >
        Big freelance projects break when one person is expected to do everything
      </a>
    </section>
  );
}
