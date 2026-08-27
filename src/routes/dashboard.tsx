import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";

/**
 * Dashboard (Phase 01, FR-3): the authenticated workspace. This phase starts
 * it with profile status + role-aware quick actions; the marketplace sections
 * (bounties, projects, applications, funding, notifications) are added by the
 * marketplace workstreams.
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
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  return {
    me,
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
    <ProductShell site={d.product} me={d.me}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
          Dashboard
        </p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">
          Welcome{d.displayName ? `, ${d.displayName}` : ""}
        </h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border-2 border-fg/20 bg-surface p-4" data-testid="card-profile">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Profile</p>
            <p className="mt-2 text-sm">
              {d.handle ? (
                <>
                  Live at{" "}
                  <Link to="/profile/$handle" params={{ handle: d.handle }} className="font-medium underline underline-offset-2">
                    /profile/{d.handle}
                  </Link>
                </>
              ) : (
                "Not set up yet — add a handle so sponsors and builders can find you."
              )}
            </p>
            <Link
              to="/settings/profile"
              className="mt-3 inline-flex h-9 items-center rounded-md border-2 border-fg/20 px-3 text-sm font-medium"
            >
              Edit profile
            </Link>
          </div>

          <div className="rounded-lg border-2 border-fg/20 bg-surface p-4" data-testid="card-email">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Email status</p>
            <p className="mt-2 text-sm">
              {d.emailVerified
                ? "Verified — you're clear for money-facing actions."
                : "Unverified. Verification email delivery is not configured yet; money-facing actions are held until it is (an admin can verify manually)."}
            </p>
          </div>

          <div className="rounded-lg border-2 border-fg/20 bg-surface p-4" data-testid="card-work">
            <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Marketplace</p>
            <p className="mt-2 text-sm">
              Bounties and projects arrive with the FoundersBid launch. Nothing
              here yet — and nothing fake will be.
            </p>
          </div>
        </div>

        <section className="mt-8" data-testid="notifications">
          <h2 className="text-xs font-medium uppercase tracking-kicker text-subtle">Notifications</h2>
          {d.notifications.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nothing yet. Marketplace events (applications, funding, judging,
              milestones, disputes, reviews) will appear here.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {d.notifications.map((n) => (
                <li
                  key={n.id}
                  className={
                    n.read
                      ? "rounded-md border-2 border-fg/10 bg-surface p-3 text-sm text-muted"
                      : "rounded-md border-2 border-accent/40 bg-raised/40 p-3 text-sm"
                  }
                >
                  <p className="font-medium">{n.title}</p>
                  {n.body ? <p className="mt-0.5">{n.body}</p> : null}
                  {n.link ? (
                    <a href={n.link} className="mt-1 inline-block text-xs underline underline-offset-2">Open</a>
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