import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { createParentWorkFn } from "@/lib/marketplace/bidception";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

/**
 * /bidception/new — sponsor creates a parent work and starts funding.
 * DRAFT is free; publishing requires funding (the funded-before-active rule).
 */
const loadNew = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (!session) throw redirect({ to: "/signin" });
  return { product: await currentProductKey(), me: (await (await import("@/lib/shell-context")).getShellContext()).me, emailVerified: session.user.emailVerified };
});

export const Route = createFileRoute("/bidception/new")({
  loader: () => loadNew(),
  component: NewParentPage,
});

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
      <div className="canvas-prose py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Sponsor</p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">Start a team project</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          One funded problem. You set the total budget; a captain you select
          decomposes it into funded child units. Allocations, the captain's
          fee and any reserve always add up to the funded budget. Never more.
        </p>
        <form onSubmit={onSubmit} noValidate className="mt-6 rounded-md border border-fg/20 bg-surface p-5" data-testid="create-parent-form">
          <div className="grid gap-4">
            <Field label="Title" id="bce-title" required>
              <Input id="bce-title" name="title" required minLength={8} maxLength={140} placeholder="Launch campaign: page, video, outreach" />
            </Field>
            <Field label="Objective" id="bce-obj" required>
              <Textarea id="bce-obj" name="objective" rows={5} required minLength={20} maxLength={20000} placeholder="What does done look like? Scope, constraints, deadline." />
            </Field>
          </div>
          {status.state === "error" ? (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">{status.message}</p>
          ) : null}
          <Button type="submit" size="md" loading={status.state === "working"} className="mt-5">
            Create parent work (draft)
          </Button>
          <p className="mt-2 text-xs text-subtle">
            Drafts are free. Funding happens on the parent's page when payments
            are enabled; until then the draft stays a draft.
          </p>
        </form>
      </div>
    </ProductShell>
  );
}