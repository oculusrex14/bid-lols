import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { JsonLd } from "@/components/seo";
import { profileSchema } from "@/lib/schema";
import type { PublicProfile } from "@/lib/profiles.server";
import { Avatar } from "@/components/ui/identity";

/**
 * Public profile (RC5 §24): Bidthrone's case-file layout. Identity, the
 * Bid Index state, factual counters, role breakdown, and the revealed
 * reviews — one record, in reading order. No cover photo, no follower
 * count, no vanity badges: this is a work record, not a social profile.
 *
 * Authoritative trust facts are server-fetched only; the browser renders
 * data it was given (never queries trust itself).
 */
const loadProfile = createServerFn({ method: "GET" })
  .validator((input: { handle: string }) =>
    z.object({ handle: z.string().trim().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getPublicProfile } = await import("@/lib/profiles.server");
    const { reputationFor } = await import("@/lib/marketplace/reputation.server");
    const { reviewsForUser } = await import("@/lib/marketplace/reviews.server");
    const [profile, product, shell] = await Promise.all([
      getPublicProfile(data.handle),
      currentProductKey(),
      (async () => {
        const { getShellContext } = await import("@/lib/shell-context");
        return getShellContext();
      })(),
    ]);
    if (!profile) throw notFound();
    const [reputation, trust, reviews] = await Promise.all([
      reputationFor(profile.userId).catch(() => null),
      (async () => {
        try {
          const { publicTrustFor } = await import("@/lib/trust/score.server");
          return await publicTrustFor(profile.userId);
        } catch {
          return null;
        }
      })(),
      reviewsForUser(profile.userId).catch(() => []),
    ]);
    return {
      profile,
      product,
      handle: data.handle,
      reputation,
      trust,
      reviews,
      me: shell.me,
      funding: shell.funding,
    };
  });

export const Route = createFileRoute("/profile/$handle")({
  loader: (ctx) => loadProfile({ data: { handle: ctx.params.handle } }),
  component: ProfilePage,
});

type ReviewRow = NonNullable<Awaited<ReturnType<typeof loadProfile>>["reviews"]>[number];

function ProfilePage() {
  const d = Route.useLoaderData();
  const p: PublicProfile = d.profile;
  const hasContent =
    p.bio.length > 0 ||
    p.skills.length > 0 ||
    p.portfolioLinks.length > 0 ||
    Boolean(p.githubUrl || p.linkedinUrl || p.websiteUrl);
  return (
    <ProductShell site={d.product} me={d.me} funding={d.funding}>
      <div className="canvas-app py-10">
        <CaseFileHeader p={p} />
        {p.bio ? <p className="mt-4 max-w-xl text-sm leading-relaxed">{p.bio}</p> : null}

        {d.trust ? <TrustBlock trust={d.trust} /> : null}
        {d.reputation ? <FactsBlock reputation={d.reputation} /> : null}
        {d.reviews.length > 0 ? <ReviewsBlock reviews={d.reviews} /> : null}
        {p.companyName ? <CompanyBlock p={p} /> : null}
        {p.skills.length > 0 || p.categories.length > 0 ? <TagsBlock p={p} /> : null}
        {p.portfolioLinks.length > 0 || p.githubUrl || p.linkedinUrl || p.websiteUrl ? (
          <LinksBlock p={p} />
        ) : null}

        {hasContent ? (
          <JsonLd
            data={profileSchema(d.product as import("@/lib/host").ProductKey, {
              displayName: p.displayName,
              handle: p.handle,
              bio: p.bio,
              skills: p.skills,
              websiteUrl: p.websiteUrl,
              githubUrl: p.githubUrl,
              linkedinUrl: p.linkedinUrl,
            })}
          />
        ) : null}
      </div>
    </ProductShell>
  );
}

/** Identity: the record's masthead. */
function CaseFileHeader({ p }: { p: PublicProfile }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar name={p.displayName} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
          {p.isSponsor ? "Sponsor profile" : "Member profile"} · public record
        </p>
        <h1 className="mt-0.5 font-display-site text-2xl tracking-tight sm:text-3xl">
          {p.displayName}
        </h1>
        <p className="mt-0.5 text-sm text-muted">
          @{p.handle}
          {p.location ? ` · ${p.location}` : ""}
          {p.timezone ? ` · ${p.timezone}` : ""}
        </p>
      </div>
      <div className="text-right text-xs text-subtle">
        {p.emailVerified ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-up/40 px-2 py-0.5 text-up">
            email verified
          </span>
        ) : null}
        <p className="mt-1">Joined {new Date(p.joinedAt).toISOString().slice(0, 10)}</p>
        <p>
          {p.availability === "available"
            ? "Available"
            : p.availability === "limited"
              ? "Limited availability"
              : "Booked"}
        </p>
      </div>
    </div>
  );
}

/** Factual counters: the work history in one verifiable block. */
function FactsBlock({
  reputation,
}: {
  reputation: NonNullable<Awaited<ReturnType<typeof loadProfile>>["reputation"]>;
}) {
  return (
    <section className="mt-8" data-testid="reputation">
      <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">
        Verified outcomes
      </h2>
      {reputation.experience === 0 ? (
        <p className="mt-2 text-sm text-muted">
          No verified marketplace outcomes yet. This record will fill in
          with real wins, completions, and reviews.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Bounties won" value={reputation.bountyWins} />
            <Fact label="Projects completed" value={reputation.projectCompletions} />
            <Fact label="Teams captained" value={reputation.captainedCompletions} />
            <Fact label="Reviews received" value={reputation.reviewsReceived} />
          </div>
          <p className="mt-3 text-xs text-muted">
            {reputation.disputesAsClaimant} dispute
            {reputation.disputesAsClaimant === 1 ? "" : "s"} raised ·{" "}
            {reputation.disputesAsRespondent} dispute
            {reputation.disputesAsRespondent === 1 ? "" : "s"} responded
          </p>
        </>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-surface px-3 py-2.5">
      <p className="text-xs uppercase tracking-kicker text-subtle">{label}</p>
      <p className="tabular mt-1 font-display-site text-lg tracking-tight">{value}</p>
    </div>
  );
}

/** The revealed reviews of this member (public, reveal-gated). */
function ReviewsBlock({ reviews }: { reviews: ReviewRow[] }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">
        Reviews from the people involved
      </h2>
      <div className="mt-3 space-y-3">
        {reviews.map((r, i) => (
          <ReviewRowCard key={i} r={r} />
        ))}
      </div>
    </section>
  );
}

function ReviewRowCard({ r }: { r: ReviewRow }) {
  const dims: string[] = [];
  const push = (label: string, value: number | null) => {
    if (value != null) dims.push(`${label} ${value}/5`);
  };
  push("Quality", r.quality);
  push("Communication", r.communication);
  push("Timeliness", r.timeliness);
  push("Clarity", r.clarity);
  push("Value", r.value);
  push("Fairness", r.fairness);
  return (
    <article className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-muted">
          {r.reviewerHandle ? `@${r.reviewerHandle}` : "A member of the network"}
        </p>
        <p className="text-xs text-subtle">{new Date(r.createdAt).toISOString().slice(0, 10)}</p>
      </div>
      {dims.length > 0 ? (
        <p className="tabular mt-1.5 text-xs text-subtle">{dims.join(" · ")}</p>
      ) : null}
      {r.body ? <p className="mt-2 text-sm leading-relaxed">{r.body}</p> : null}
    </article>
  );
}

function CompanyBlock({ p }: { p: PublicProfile }) {
  return (
    <div className="mt-8 rounded-md border border-line bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Company</p>
      <p className="mt-1 text-sm font-medium">{p.companyName}</p>
      {p.companyAbout ? <p className="mt-1 text-sm text-muted">{p.companyAbout}</p> : null}
      {p.companyWebsite ? (
        <a href={p.companyWebsite} rel="nofollow ugc" className="mt-1 inline-block text-sm underline underline-offset-2">
          {safeHost(p.companyWebsite)}
        </a>
      ) : null}
    </div>
  );
}

function TagsBlock({ p }: { p: PublicProfile }) {
  return (
    <div className="mt-8">
      <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Skills</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {p.skills.map((s) => (
          <span key={`s-${s}`} className="rounded-full border border-line bg-chip px-3 py-1 text-xs">
            {s}
          </span>
        ))}
        {p.categories.map((c) => (
          <span key={`c-${c}`} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function LinksBlock({ p }: { p: PublicProfile }) {
  return (
    <div className="mt-8">
      <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Links</p>
      <ul className="mt-2 space-y-1 text-sm">
        {p.portfolioLinks.map((l) => (
          <li key={l}>
            <a href={l} rel="nofollow ugc" className="underline underline-offset-2">{safeHost(l)}</a>
          </li>
        ))}
        {p.githubUrl ? <li><a href={p.githubUrl} rel="nofollow ugc" className="underline underline-offset-2">{safeHost(p.githubUrl)}</a></li> : null}
        {p.linkedinUrl ? <li><a href={p.linkedinUrl} rel="nofollow ugc" className="underline underline-offset-2">{safeHost(p.linkedinUrl)}</a></li> : null}
        {p.websiteUrl ? <li><a href={p.websiteUrl} rel="nofollow ugc" className="underline underline-offset-2">{safeHost(p.websiteUrl)}</a></li> : null}
      </ul>
    </div>
  );
}

/**
 * Bid Index block (RC4 §50/§51; RC5 §23.14): the personal trust state,
 * first-class when it is NR. No category n/10 bars (that is Market Rates);
 * no fabricated numbers; pillars shown as normalized values, explicitly
 * not star reviews.
 */
function TrustBlock({
  trust,
}: {
  trust: NonNullable<Awaited<ReturnType<typeof loadProfile>>["trust"]>;
}) {
  const restricted = trust.roles.some((r) => r.status === "RESTRICTED");
  return (
    <section className="mt-8 rounded-md border border-line bg-surface p-5" data-testid="bid-index">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">
          Bid Index · {trust.modelVersion}
        </h2>
        {restricted ? (
          <p className="text-xs font-medium text-warn">Restricted · under trust review</p>
        ) : null}
      </div>
      {trust.overall && trust.overall.score != null ? (
        <>
          <p className="mt-2 font-display-site text-4xl tracking-tight">{trust.overall.score}</p>
          <p className="text-sm text-muted">
            {trust.overall.band} · {trust.overall.confidenceLabel.toLowerCase()} confidence
          </p>
          <div
            className="mt-3 h-1.5 w-full max-w-md rounded-full bg-fg/10"
            role="img"
            aria-label={`Bid Index ${trust.overall.score} on the 300 to 900 scale`}
          >
            <div
              className="h-1.5 rounded-full bg-accent"
              style={{ width: `${Math.max(1, ((trust.overall.score - 300) / 600) * 100)}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 font-display-site text-4xl tracking-tight text-subtle">NR</p>
          <p className="text-sm text-muted">
            Not enough history. A Bid Index first appears after two completed
            outcomes with two independent counterparties.
          </p>
        </>
      )}
      <p className="mt-1 text-xs text-subtle">
        Based on verified marketplace outcomes, not followers or spending.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {trust.roles.map((r) => (
          <div key={r.role} className="rounded-md border border-line bg-raised/40 p-3">
            <p className="text-xs uppercase tracking-kicker text-subtle">{roleTitle(r.role)}</p>
            <p className="tabular mt-1 font-display-site text-2xl tracking-tight">
              {r.status === "SCORED" ? r.score : r.status === "RESTRICTED" ? "Restricted" : "NR"}
            </p>
            <p className="text-xs text-muted">
              {r.status === "SCORED"
                ? `${r.band} · ${r.confidenceLabel} · ${r.primaryOutcomes} verified outcome${r.primaryOutcomes === 1 ? "" : "s"}`
                : `${r.primaryOutcomes} verified outcome${r.primaryOutcomes === 1 ? "" : "s"} · ${r.uniqueCounterparties} counterparty${r.uniqueCounterparties === 1 ? "" : "ies"}`}
            </p>
            {r.status === "SCORED" ? <PillarList pillars={r.pillars} /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function roleTitle(role: string): string {
  switch (role) {
    case "PROVIDER":
      return "Provider Index";
    case "SPONSOR":
      return "Sponsor Index";
    case "CAPTAIN":
      return "Captain Index";
    default:
      return role;
  }
}

/** Model dimensions: normalized values, explicitly not star reviews. */
function PillarList({ pillars }: { pillars: Record<string, number> }) {
  const entries = Object.entries(pillars).slice(0, 5);
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 space-y-0.5 text-xs">
      {entries.map(([pillar, value]) => (
        <div key={pillar} className="flex items-center justify-between gap-2">
          <dt className="text-subtle">{pillarName(pillar)}</dt>
          <dd className="tabular font-medium">{Math.round(value * 100)}</dd>
        </div>
      ))}
    </dl>
  );
}

function pillarName(pillar: string): string {
  const p = pillar.toLowerCase().replace(/_/g, " ");
  return p.charAt(0).toUpperCase() + p.slice(1);
}

/** Display only the host of a stored link (never echo full URLs into anchor text). */
function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}
