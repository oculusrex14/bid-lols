import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import type { PublicProfile } from "@/lib/profiles.server";

/**
 * Public profile (Phase 01, FR-2): /profile/:handle. SSR-fetched; shows only
 * public fields (no email, no admin state). Missing/suspended profiles get a
 * honest not-found state. Head tags are owned by the SEO middleware (single
 * head authority across runtimes — profile pages are noindex,follow there).
 */
const loadProfile = createServerFn({ method: "GET" })
  .validator((input: { handle: string }) =>
    z.object({ handle: z.string().trim().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getPublicProfile } = await import("@/lib/profiles.server");
    const [profile, product] = await Promise.all([
      getPublicProfile(data.handle),
      currentProductKey(),
    ]);
    return { profile, product, handle: data.handle };
  });

export const Route = createFileRoute("/profile/$handle")({
  loader: (ctx) => loadProfile({ data: { handle: ctx.params.handle } }),
  component: ProfilePage,
});

function ProfilePage() {
  const d = Route.useLoaderData();
  if (!d.profile) {
    return (
      <ProductShell site={d.product}>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="font-display-site text-2xl tracking-tight">Profile not found</h1>
          <p className="mt-2 text-sm text-muted">
            No public profile lives at @{d.handle}. It may not exist yet, or the
            member has left the network.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm font-medium underline underline-offset-2">
            Back to home
          </Link>
        </div>
      </ProductShell>
    );
  }
  const p: PublicProfile = d.profile;
  return (
    <ProductShell site={d.product}>
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
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-up/40 px-2 py-0.5 text-up">
                email verified
              </span>
            ) : null}
            <p className="mt-1">Joined {new Date(p.joinedAt).toISOString().slice(0, 10)}</p>
          </div>
        </div>

        {p.bio ? <p className="mt-4 max-w-xl text-sm leading-relaxed">{p.bio}</p> : null}

        {p.companyName ? (
          <div className="mt-6 rounded-lg border-2 border-fg/15 bg-raised/40 p-4">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Company</p>
            <p className="mt-1 text-sm font-medium">{p.companyName}</p>
            {p.companyAbout ? <p className="mt-1 text-sm text-muted">{p.companyAbout}</p> : null}
            {p.companyWebsite ? (
              <a href={p.companyWebsite} rel="nofollow ugc" className="mt-1 inline-block text-sm underline underline-offset-2">
                {safeHost(p.companyWebsite)}
              </a>
            ) : null}
          </div>
        ) : null}

        {(p.skills.length > 0 || p.categories.length > 0) ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {p.skills.map((s) => (
              <span key={`s-${s}`} className="rounded-full border-2 border-fg/20 px-3 py-1 text-xs">{s}</span>
            ))}
            {p.categories.map((c) => (
              <span key={`c-${c}`} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                {c}
              </span>
            ))}
          </div>
        ) : null}

        {(p.portfolioLinks.length > 0 || p.githubUrl || p.linkedinUrl || p.websiteUrl) ? (
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
        ) : null}

        <p className="mt-8 text-xs text-subtle">
          Marketplace history (completed bounties, projects, reviews) appears
          here as verified outcomes happen — never padded.
        </p>
      </div>
    </ProductShell>
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