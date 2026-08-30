import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { PageHeader } from "@/components/ui/layout";
import { ButtonLink } from "@/components/ui/button";
import { Metric } from "@/components/ui/data";

/**
 * Dashboard (Phase 01, FR-3; RC3 spine): the authenticated workspace —
 * profile status, email verification state, the marketplace card, and the
 * notification feed.
 */
const loadDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (!session) throw redirect({ to: "/signin" });
  const { getOrCreateProfile, getUserEmail } = await import("@/lib/profiles.server");
  const [profile, user] = await Promise.all([
    getOrCreateProfile(session.user.id),
    getUserEmail(session.user.id),
  ]);
  const { listNotifications } = await import("@/lib/marketplace/notifications.server");
  const notifications = await listNotifications(session.user.id, 20);
  const { me, funding } = await (await import("@/lib/shell-context")).getShellContext();
  return {
    me,
    funding,
    product: await currentProductKey(),
    emailVerified: user?.email_verified ?? false,
    handle: profile.handle,
    displayName: user?.display_name ?? session.user.name,
    isSponsor: profile.is_sponsor,
    notifications,
  };
});

export const Route = createFileRoute("/dashboard")({
  loader: () => loadDashboard(),
  component: DashboardPage,
});

function DashboardPage() {
  const d = Route.useLoaderData();
  return (
    <ProductShell site={d.product as ProductKey} me={d.me} funding={d.funding}>
      <div className="canvas-app pb-16">
        <PageHeader
          kicker="Dashboard"
          title={`Welcome${d.displayName ? `, ${d.displayName}` : ""}`}
        />
        <div className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-3">
          <div data-testid="card-profile">
            <Metric
              label="Profile"
              value={d.handle ? `@${d.handle}` : "Not set up"}
              sub={
                d.handle
                  ? "Public on this domain of the network."
                  : "Add a handle so sponsors and builders can find you."
              }
            />
            <ButtonLink href="/settings/profile" variant="secondary" size="sm" className="mt-2">
              Edit profile
            </ButtonLink>
          </div>
          <div data-testid="card-email">
            <Metric
              label="Email status"
              value={d.emailVerified ? "Verified" : "Unverified"}
              sub={
                d.emailVerified
                  ? "You are clear for money-facing actions."
                  : "Verification email delivery is not configured yet; money-facing actions are held until it is (an admin can verify manually)."
              }
            />
          </div>
          <div data-testid="card-work">
            <Metric label="Marketplace" value={d.notifications.filter((n) => !n.read).length} sub="unread notifications" />
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Your drafts, applications, proposals, and funding actions live
              here on this account, on every domain of the network. Funding is
              not enabled yet, so money-facing actions are held until it is.
            </p>
          </div>
        </div>

        <section className="mt-12" data-testid="notifications">
          <h2 className="text-sm font-semibold uppercase tracking-kicker text-subtle">Notifications</h2>
          {d.notifications.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Nothing yet. Marketplace events (applications, funding, judging,
              milestones, disputes, reviews) will appear here.
            </p>
          ) : (
            <ul className="mt-3">
              {d.notifications.map((n) => (
                <li key={n.id} className={`row-line px-1 py-3 text-sm ${n.read ? "text-muted" : ""}`}>
                  <p className="font-medium">
                    {!n.read ? <span className="mr-1.5 inline-block size-1.5 rounded-full bg-accent align-middle" aria-label="unread" /> : null}
                    {n.title}
                  </p>
                  {n.body ? <p className="mt-0.5 text-muted">{n.body}</p> : null}
                  {n.link ? (
                    <a href={n.link} className="mt-1 inline-block text-xs text-accent underline underline-offset-2">
                      Open
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ProductShell>
  );
}