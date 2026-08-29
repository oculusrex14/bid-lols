import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { JsonLd } from "@/components/seo";
import { profileSchema } from "@/lib/schema";
import type { PublicProfile } from "@/lib/profiles.server";

/**
 * Public profile (Phase 01, FR-2): /profile/:handle. SSR-fetched; shows only
 * public fields (no email, no admin state). Missing or suspended profiles are
 * real 404s (RC2, C3.5). Head tags are owned by the SEO middleware (single
 * head authority across runtimes; thin profiles get noindex,follow there).
 */
const loadProfile = createServerFn({ method: "GET" })
  .validator((input: { handle: string }) =>
    z.object({ handle: z.string().trim().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getPublicProfile } = await import("@/lib/profiles.server");
    const { reputationFor } = await import("@/lib/marketplace/reputation.server");
    const [profile, product, shell] = await Promise.all([
      getPublicProfile(data.handle),
      currentProductKey(),
      (async () => {
        const { getShellContext } = await import("@/lib/shell-context");
        return getShellContext();
      })(),
    ]);
    if (!profile) throw notFound();
    const reputation = await reputationFor(profile.userId).catch(() => null);
    return { profile, product, handle: data.handle, reputation, me: shell.me };
  });

export const Route = createFileRoute("/profile/$handle")({
  loader: (ctx) => loadProfile({ data: { handle: ctx.params.handle } }),
  component: ProfilePage,
});

function ProfilePage() {
  const d = Route.useLoaderData();
  const p: PublicProfile = d.profile;
  const hasContent =
    p.bio.length > 0 ||
    p.skills.length > 0 ||
    p.portfolioLinks.length > 0 ||
    Boolean(p.githubUrl || p.linkedinUrl || p.websiteUrl);
  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
              {p.isSponsor ? "Sponsor profile" : "Member profile"}
            </p>
            <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">
              {p.displayName}
            </h1>
            <p className="mt-1 text-sm text-muted">
              @{p.handle}
              {p.location ? ` · ${p.location}` : ""}
              {p.timezone ? ` · ${p.timezone}` : ""}
              {" · "}
              {p.availability === "available"
                ? "Available"
                : p.availability === "limited"
                  ? "Limited availability"
                  : "Booked"}
            </p>
          </div>
          <div className="text-right text-xs text-subtle">
            {p.emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-up/40 px-2 py-0.5 text-up">
                email verified
              </span>
            ) : null}
            <p className="mt-1">Joined {new Date(p.joinedAt).toISOString().slice(0, 10)}</p>
          </div>
        </div>

        {p.bio ? <p className="mt-4 max-w-xl text-sm leading-relaxed">{p.bio}</p> : null}

        {p.companyName ? <CompanyBlock p={p} /> : null}
        {p.skills.length > 0 || p.categories.length > 0 ? <TagsBlock p={p} /> : null}
        {p.portfolioLinks.length > 0 || p.githubUrl || p.linkedinUrl || p.websiteUrl ? <LinksBlock p={p} /> : null}

        {d.reputation ? <ReputationBlock reputation={d.reputation} /> : null}

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

function CompanyBlock({ p }: { p: PublicProfile }) {
  return (
    <div className="mt-6 rounded-md border border-fg/15 bg-raised/40 p-4">
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
    <div className="mt-6 flex flex-wrap gap-2">
      {p.skills.map((s) => (
        <span key={`s-${s}`} className="rounded-full border border-fg/20 px-3 py-1 text-xs">{s}</span>
      ))}
      {p.categories.map((c) => (
        <span key={`c-${c}`} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          {c}
        </span>
      ))}
    </div>
  );
}

function LinksBlock({ p }: { p: PublicProfile }) {
  return (
    <div className="mt-6">
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

function ReputationBlock({ reputation }: { reputation: NonNullable<Awaited<ReturnType<typeof loadProfile>>["reputation"]> }) {
  return (
    <div className="mt-8 rounded-md border border-fg/15 bg-surface p-5" data-testid="reputation">
      <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Verified outcomes</h2>
      {reputation.experience === 0 ? (
        <p className="mt-2 text-sm text-muted">
          No verified marketplace outcomes yet. This profile will fill in
          with real wins, completions, and reviews.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Experience", reputation.experience],
              ["Reliability", `${Math.round(reputation.reliability * 100)}%`],
              ["Quality", reputation.quality ? reputation.quality.toFixed(1) : "n/a"],
              ["Reviews", reputation.reviewsReceived],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <p className="text-xs uppercase tracking-kicker text-subtle">{String(label)}</p>
                <p className="mt-1 font-display-site text-lg tracking-tight">{String(value)}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            {reputation.bountyWins} bounty win{reputation.bountyWins === 1 ? "" : "s"} ·{" "}
            {reputation.projectCompletions} project completion{reputation.projectCompletions === 1 ? "" : "s"} ·{" "}
            {reputation.captainedCompletions} captained unit{reputation.captainedCompletions === 1 ? "" : "s"}
          </p>
        </>
      )}
    </div>
  );
}

/** Display only the host of a stored link (never echo full URLs into anchor text). */
function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 40);
  }
}