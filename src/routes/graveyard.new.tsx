import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { createListingFn, publishListingFn } from "@/lib/marketplace/graveyard";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, CheckRow } from "@/components/ui/field";
import { FormSection } from "@/components/ui/layout";
import { InlineNotice } from "@/components/ui/states";

/**
 * /graveyard/new — seller listing form (Phase 01B, FR-1; RC3, S-32).
 * RC3 fix: the "included" checkboxes used to be read back under a different
 * name (`inc-${k}` vs `name={k}`) so they were silently dropped — the
 * submit now reads what it renders.
 */
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
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includes, setIncludes] = useState<string[]>([]);
  const [publishNow, setPublishNow] = useState(true);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (creating) return;
    const f = new FormData(e.currentTarget);
    setCreating(true);
    setError(null);
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
          includes,
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
        if (publishNow) {
          await publishListingFn({ data: { listingId: result.id } });
        }
        void navigate({ to: "/graveyard/$id", params: { id: result.id } });
      } else {
        setError(result.message);
        setCreating(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid data.");
      setCreating(false);
    }
  }

  return (
    <ProductShell site={d.product} me={d.me}>
      <div className="canvas-wide pb-16">
        <header className="border-b border-fg/10 py-6">
          <p className="text-xs font-semibold uppercase tracking-kicker text-subtle">Graveyard</p>
          <h1 className="mt-1 font-display-site text-3xl tracking-tight">List an abandoned startup</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Describe the project, why it was paused, and what is included.
            Never paste API keys, tokens, or customer data into the listing.
            Credentials are transferred directly through their providers,
            never through this platform.
          </p>
        </header>

        {error ? (
          <div data-testid="create-error" className="mt-6">
            <InlineNotice tone="down">{error}</InlineNotice>
          </div>
        ) : null}

        <form onSubmit={onSubmit} noValidate className="mt-8" data-testid="create-listing-form">
          <FormSection title="The project" description="What it is, and why it stopped.">
            <Field label="Project name" required id="gy-title">
              <Input id="gy-title" name="title" required minLength={8} maxLength={140} placeholder="Pointhatch, invoicing for freelancers" />
            </Field>
            <Field label="What is it?" required id="gy-desc">
              <Textarea id="gy-desc" name="description" rows={5} required minLength={20} maxLength={20000} />
            </Field>
            <Field label="Why was it paused?" id="gy-death" hint="Be honest. Buyers expect it.">
              <Textarea id="gy-death" name="reasonOfDeath" rows={3} maxLength={2000} />
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium">What is included?</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {INCLUDES.map((k) => (
                  <CheckRow
                    key={k}
                    label={k}
                    checked={includes.includes(k)}
                    onChange={(v) => setIncludes((p) => (v ? [...p, k] : p.filter((x) => x !== k)))}
                  />
                ))}
              </div>
            </div>
            <Field label="Technology (comma-separated)" id="gy-tech">
              <Input id="gy-tech" name="technology" placeholder="next.js, postgres, tailwind" />
            </Field>
          </FormSection>

          <FormSection title="The transfer" description="What a buyer has to check, and what you are asking.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Asking price (₹, optional)" id="gy-price" hint="Leave empty to stay open to offers.">
                <Input id="gy-price" name="askingPrice" type="number" min={0} className="tabular" />
              </Field>
              <Field label="Reserve / minimum (₹, optional)" id="gy-res">
                <Input id="gy-res" name="reservePrice" type="number" min={0} className="tabular" />
              </Field>
            </div>
            <Field label="Known liabilities" id="gy-liab" hint="e.g. one expired domain payment, no known trademark conflicts…">
              <Textarea id="gy-liab" name="liabilities" rows={2} maxLength={4000} />
            </Field>
            <Field label="Revenue / user history (self-reported)" id="gy-hist" hint="Self-declared history. Buyers should verify anything material.">
              <Textarea id="gy-hist" name="historySelfReported" rows={2} maxLength={4000} />
            </Field>
            <Field label="Transfer checklist" hint="One item per line. The handover is not done until each of these has happened." id="gy-check">
              <Textarea id="gy-check" name="transferChecklist" rows={3} placeholder={"Transfer domain at registrar\nGrant repo access\nHand over design files"} />
            </Field>
            <Field label="Screenshots" id="gy-shots" hint="https URLs, comma-separated, up to six. Screenshots are stored today but not publicly displayed yet (no image proxy is configured); they will render once one is.">
              <Input id="gy-shots" name="screenshots" placeholder="https://…" />
            </Field>
          </FormSection>

          <div className="mt-8 border-t border-fg/10 pt-5">
            <CheckRow
              label="Publish immediately"
              description="Otherwise the listing stays a draft you can publish later."
              checked={publishNow}
              onChange={setPublishNow}
            />
            <Button type="submit" loading={creating} size="lg" className="mt-4">
              {creating ? "Creating…" : "Create listing"}
            </Button>
          </div>
        </form>
      </div>
    </ProductShell>
  );
}
