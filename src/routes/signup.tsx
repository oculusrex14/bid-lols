import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { AuthCard } from "@/components/auth-card";

/**
 * Sign up (Phase 01, FR-1). Server-side loader redirects already-authenticated
 * visitors to the dashboard.
 */
const redirectIfAuthed = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (session) throw redirect({ to: "/dashboard" });
  return currentProductKey();
});

export const Route = createFileRoute("/signup")({
  loader: () => redirectIfAuthed(),
  component: SignupPage,
});

function SignupPage() {
  const site = Route.useLoaderData();
  return (
    <ProductShell site={site}>
      <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
        <AuthCard mode="signup" />
      </div>
    </ProductShell>
  );
}