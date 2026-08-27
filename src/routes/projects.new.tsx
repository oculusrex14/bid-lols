import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { createProjectFn } from "@/lib/marketplace/projects";

/**
 * /projects/new — sponsor project creation (Mode B). Proposals come pre-work;
 * funding is required after one provider is selected.
 */
const loadCreate = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (!session) throw redirect({ to: "/signin" });
  return { product: await currentProductKey(), me: (await (await import("@/lib/shell-context")).getShellContext()).me };
});

export const Route = createFileRoute("/projects/new")({
  loader: () => loadCreate(),
  component: NewProjectPage,
});

const field =
  "w-full rounded-md border-2 border-fg/20 bg-surface px-3 py-2.5 text-sm outline-none focus:border-fg/60";

function NewProjectPage() {
  const d = Route.useLoaderData();
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "creating" }
    | { state: "error"; message: string }
  >({ state: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.state === "creating") return;
    const f = new FormData(e.currentTarget);
    setStatus({ state: "creating" });
    try {
      const result = await createProjectFn({
        data: {
          title: String(f.get("title")),
          description: String(f.get("description")),
          category: String(f.get("category")),
          skills: String(f.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
          budgetMinRupees: f.get("budgetMin") ? Number(f.get("budgetMin")) : undefined,
          budgetMaxRupees: f.get("budgetMax") ? Number(f.get("budgetMax")) : undefined,
          proposalDeadline: f.get("proposalDeadline")
            ? new Date(String(f.get("proposalDeadline"))).toISOString()
            : undefined,
          ipAndConfidentiality: String(f.get("ipAndConfidentiality") ?? ""),
        },
      });
      if (result.ok) {
        void navigate({ to: "/projects/$id", params: { id: result.id } });
      } else {
        setStatus({ state: "error", message: result.message });
      }
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Invalid data." });
    }
  }

  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Sponsor</p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">Post a project</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Describe the work and constraints. Providers respond with an approach,
          evidence and a milestone plan — not with finished deliverables.
        </p>
        <form onSubmit={onSubmit} noValidate className="mt-6 rounded-lg border-2 border-fg/20 bg-surface p-5" data-testid="create-project-form">
          <div className="grid gap-4">
            <div>
              <label htmlFor="pj-title" className="mb-1.5 block text-sm font-medium">Title</label>
              <input id="pr-title" name="title" required minLength={8} maxLength={140} placeholder="Build an MVP billing dashboard" className={field} />
            </div>
            <div>
              <label htmlFor="pr-desc" className="mb-1.5 block text-sm font-medium">The brief</label>
              <textarea id="pr-desc" name="description" rows={6} required minLength={20} maxLength={30000} className={field} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pr-cat" className="mb-1.5 block text-sm font-medium">Category</label>
                <input id="pr-cat" name="category" required maxLength={40} placeholder="development" className={field} />
              </div>
              <div>
                <label htmlFor="pr-skills" className="mb-1.5 block text-sm font-medium">Skills (comma-separated)</label>
                <input id="pr-skills" name="skills" className={field} />
              </div>
              <div>
                <label htmlFor="pr-bmin" className="mb-1.5 block text-sm font-medium">Budget from (₹, optional)</label>
                <input id="pr-bmin" name="budgetMinRupees" type="number" min={0} className={field} />
              </div>
              <div>
                <label htmlFor="pr-bmax" className="mb-1.5 block text-sm font-medium">Budget to (₹, optional)</label>
                <input id="pr-bmax" name="budgetMaxRupees" type="number" min={0} className={field} />
              </div>
              <div>
                <label htmlFor="pr-dl" className="mb-1.5 block text-sm font-medium">Proposal deadline (optional)</label>
                <input id="pr-dl" name="proposalDeadline" type="datetime-local" className={field} />
              </div>
            </div>
            <div>
              <label htmlFor="pr-ip" className="mb-1.5 block text-sm font-medium">IP & confidentiality</label>
              <textarea id="pr-ip" name="ipAndConfidentiality" rows={2} maxLength={4000} className={field} />
            </div>
          </div>
          {status.state === "error" ? (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">{status.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={status.state === "creating"}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {status.state === "creating" ? "Creating…" : "Create project (draft)"}
          </button>
        </form>
      </div>
    </ProductShell>
  );
}