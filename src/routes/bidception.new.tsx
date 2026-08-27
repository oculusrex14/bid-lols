import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { createParentWorkFn } from "@/lib/marketplace/bidception";

/**
 * /bidception/new — sponsor creates a parent work and starts funding.
 * DRAFT is free; publishing requires funding (the funded-before-active rule).
 */
const loadNew = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (!session) throw redirect({ to: "/signin" });
  return { product: await currentProductKey(), me: (await shellContext()).me, emailVerified: session.user.emailVerified };
});

export const Route = createFileRoute("/bidception/new")({
  loader: () => loadNew(),
  component: NewParentPage,
});

const field =
  "w-full rounded-md border-2 border-fg/20 bg-surface px-3 py-2.5 text-sm outline-none focus:border-fg/60";

function NewParentPage() {
  const d = Route.useLoaderData();
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "working" }
    | { state: "error"; message: string }
    | { state: "draft"; id: string }
  >({ state: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.state === "working") return;
    const f = new FormData(e.currentTarget);
    setStatus({ state: "working" });
    try {
      const created = await createParentWorkFn({
        data: {
          title: String(f.get("title")),
          objective: String(f.get("objective")),
        },
      });
      if (!created.ok) {
        setStatus({ state: "error", message: created.message });
        return;
      }
      setStatus({ state: "draft", id: created.id });
      void navigate({ to: "/bidception/$id", params: { id: created.id } });
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Invalid data." });
    }
  }

  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Sponsor</p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">Post parent work</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          One funded problem. You set the total budget; a captain you select
          decomposes it into funded child units. Allocations, the captain's
          fee and any reserve always add up to the funded budget — never more.
        </p>
        <form onSubmit={onSubmit} noValidate className="mt-6 rounded-lg border-2 border-fg/20 bg-surface p-5" data-testid="create-parent-form">
          <div className="grid gap-4">
            <div>
              <label htmlFor="bce-title" className="mb-1.5 block text-sm font-medium">Title</label>
              <input id="bce-title" name="title" required minLength={8} maxLength={140} placeholder="Launch campaign: page, video, outreach" className={field} />
            </div>
            <div>
              <label htmlFor="bce-obj" className="mb-1.5 block text-sm font-medium">Objective</label>
              <textarea id="bce-obj" name="objective" rows={5} required minLength={20} maxLength={20000} placeholder="What does done look like? Scope, constraints, deadline." className={field} />
            </div>
          </div>
          {status.state === "error" ? (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">{status.message}</p>
          ) : null}
          <button type="submit" disabled={status.state === "working"} className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-semibold text-accent-fg disabled:opacity-60">
            {status.state === "working" ? "Creating…" : "Create parent work (draft)"}
          </button>
          <p className="mt-2 text-xs text-subtle">
            Drafts are free. Funding happens on the parent's page when payments
            are enabled; until then the draft stays a draft.
          </p>
        </form>
      </div>
    </ProductShell>
  );
}