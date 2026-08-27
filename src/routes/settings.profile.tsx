import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { ProfileFormLoader } from "@/components/profile-form";

/**
 * Profile settings (Phase 01, FR-2). Server-side loader enforces the session:
 * an unauthenticated visitor never sees the form.
 */
const loadSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (!session) throw redirect({ to: "/signin" });
  const { me } = await shellContext();
  return { product: await currentProductKey(), me };
});

export const Route = createFileRoute("/settings/profile")({
  loader: () => loadSettings(),
  component: SettingsProfilePage,
});

function SettingsProfilePage() {
  const { product: site, me } = Route.useLoaderData();
  return (
    <ProductShell site={site} me={me}>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
          Your account
        </p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">
          Profile
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Your public identity across the Bid Network marketplaces. Money-facing
          actions additionally require a verified email — shown on your profile
          once verified.
        </p>
        <div className="mt-6">
          <ProfileFormLoader />
        </div>
      </div>
    </ProductShell>
  );
}