import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { AuthCard } from "@/components/auth-card";

/**
 * Sign in (Phase 01, FR-1). The auth check runs server-side in the loader:
 * a signed-in visitor is sent to the dashboard instead of the form.
 */
const redirectIfAuthed = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (session) throw redirect({ to: "/dashboard" });
  return currentProductKey();
});

export const Route = createFileRoute("/signin")({
  loader: () => redirectIfAuthed(),
  component: SigninPage,
});

function SigninPage() {
  const site = Route.useLoaderData();
  return (
    <ProductShell site={site}>
      <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
        <AuthCard mode="signin" />
      </div>
    </ProductShell>
  );
}