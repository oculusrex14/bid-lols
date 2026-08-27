import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { shellContext } from "@/lib/shell-context";
import { ProductShell } from "@/components/product-shell";
import { createListingFn, publishListingFn } from "@/lib/marketplace/graveyard";

/** /graveyard/new — seller listing form (Phase 01B, FR-1). */
const loadNew = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("@/lib/authz");
  const session = await getSession();
  if (!session) throw redirect({ to: "/signin" });
  return { product: await currentProductKey(), me: (await (await import("@/lib/shell-context")).getShellContext()).me };
});

export const Route = createFileRoute("/graveyard/new")({
  loader: () => loadNew(),
  component: NewListingPage,
});

const field =
  "w-full rounded-md border-2 border-fg/20 bg-surface px-3 py-2.5 text-sm outline-none focus:border-fg/60";

const INCLUDES = [
  "Code repository",
  "Domain name",
  "Design files",
  "Brand assets",
  "Documentation",
  "Social handles (where transferable)",
  "Existing user base (where legally transferable)",
  "Other product assets",
];

function NewListingPage() {
  const d = Route.useLoaderData();
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "creating" }
    | { state: "error"; message: string }
    | { state: "created"; id: string; published: boolean }
  >({ state: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.state === "creating") return;
    const f = new FormData(e.currentTarget);
    setStatus({ state: "creating" });
    try {
      const checklist = String(f.get("transferChecklist") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12);
      const result = await createListingFn({
        data: {
          title: String(f.get("title")),
          description: String(f.get("description")),
          reasonOfDeath: String(f.get("reasonOfDeath") ?? ""),
          includes: INCLUDES.filter((k) => f.get(`inc-${k}`) === "on"),
          technology: String(f.get("technology") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
          screenshots: String(f.get("screenshots") ?? "").split(/[\s,]+/).map((s) => s.trim()).filter(Boolean).slice(0, 6),
          liabilities: String(f.get("liabilities") ?? ""),
          historySelfReported: String(f.get("historySelfReported") ?? ""),
          transferChecklist: checklist.length > 0
            ? checklist
            : ["Confirm registrar/admin access handover", "Share repository access", "Transfer brand assets"],
          askingPriceRupees: f.get("askingPrice") ? Number(f.get("askingPrice")) : undefined,
          reserveRupees: f.get("reservePrice") ? Number(f.get("reservePrice")) : undefined,
        },
      });
      if (result.ok) {
        if (f.get("publishNow") === "on") {
          const p = await publishListingFn({ data: { listingId: result.id } });
          setStatus({ state: "created", id: result.id, published: p.ok });
        } else {
          setStatus({ state: "created", id: result.id, published: false });
        }
        void navigate({ to: "/graveyard/$id", params: { id: result.id } });
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
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Graveyard</p>
        <h1 className="mt-1 font-display-site text-2xl tracking-tight sm:text-3xl">List an abandoned startup</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Be honest about what died and what is included. Never paste API keys,
          tokens, or customer data into the listing — credentials are
          transferred directly through their providers, never through this
          platform.
        </p>
        <form onSubmit={onSubmit} noValidate className="mt-6 rounded-lg border-2 border-fg/20 bg-surface p-5" data-testid="create-listing-form">
          <div className="grid gap-4">
            <div>
              <label htmlFor="gy-title" className="mb-1.5 block text-sm font-medium">Project name</label>
              <input id="gy-title" name="title" required minLength={8} maxLength={140} placeholder="Pointhatch — invoicing for freelancers" className={field} />
            </div>
            <div>
              <label htmlFor="gy-desc" className="mb-1.5 block text-sm font-medium">What is it?</label>
              <textarea id="gy-desc" name="description" rows={5} required minLength={20} maxLength={20000} className={field} />
            </div>
            <div>
              <label htmlFor="gy-death" className="mb-1.5 block text-sm font-medium">Why did it die?</label>
              <textarea id="gy-death" name="reasonOfDeath" rows={3} maxLength={2000} placeholder="Be honest — buyers expect it." className={field} />
            </div>
            <div>
              <p className="mb-1.5 block text-sm font-medium">What is included?</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {INCLUDES.map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" name={k} className="size-4 accent-[var(--fg)]" />
                    {k}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="gy-tech" className="mb-1.5 block text-sm font-medium">Technology (comma-separated)</label>
                <input id="gy-tech" name="technology" placeholder="next.js, postgres, tailwind" className={field} />
              </div>
              <div>
                <label htmlFor="gy-price" className="mb-1.5 block text-sm font-medium">Asking price (₹, optional)</label>
                <input id="gy-price" name="askingPrice" type="number" min={0} className={field} />
              </div>
              <div>
                <label htmlFor="gy-res" className="mb-1.5 block text-sm font-medium">Reserve / minimum (₹, optional)</label>
                <input id="gy-res" name="reservePrice" type="number" min={0} className={field} />
              </div>
            </div>
            <div>
              <label htmlFor="gy-shots" className="mb-1.5 block text-sm font-medium">Screenshots (https URLs, optional)</label>
              <input id="gy-shots" name="screenshots" placeholder="https://…" className={field} />
            </div>
            <div>
              <label htmlFor="gy-liab" className="mb-1.5 block text-sm font-medium">Known liabilities</label>
              <textarea id="gy-liab" name="liabilities" rows={2} maxLength={4000} placeholder="e.g. one expired domain payment, no known trademark conflicts…" className={field} />
            </div>
            <div>
              <label htmlFor="gy-hist" className="mb-1.5 block text-sm font-medium">Revenue / user history (self-reported)</label>
              <textarea id="gy-hist" name="historySelfReported" rows={2} maxLength={4000} placeholder="Self-declared history — buyers should verify anything material." className={field} />
            </div>
            <div>
              <label htmlFor="gy-check" className="mb-1.5 block text-sm font-medium">Transfer checklist (one item per line)</label>
              <textarea id="gy-check" name="transferChecklist" rows={3} placeholder={"Transfer domain at registrar\nGrant repo access\nHand over design files"} className={field} />
            </div>
          </div>
          {status.state === "error" ? (
            <p role="alert" className="mt-3 text-sm font-medium text-danger">{status.message}</p>
          ) : null}
          <label className="mt-4 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="publishNow" defaultChecked className="size-4 accent-[var(--fg)]" />
            Publish immediately (otherwise stays a draft)
          </label>
          <button
            type="submit"
            disabled={status.state === "creating"}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-accent px-6 text-sm font-semibold text-accent-fg disabled:opacity-60"
          >
            {status.state === "creating" ? "Creating…" : "Create listing"}
          </button>
        </form>
      </div>
    </ProductShell>
  );
}