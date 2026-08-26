import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, product, PRODUCT_KEYS } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { TrackProductView } from "@/components/track-product-view";

/**
 * Host-aware "coming next" foundation page (Phase 00, FR-1). The product is
 * chosen by the request Host header — resolved server-side in the loader via
 * a server function (the app's proven loader shape) — so each of the four
 * apex domains gets its own name, honest single sentence, and contact link.
 * No fake activity, no pay-to-rank UI, no fake counters.
 */
const getProductKey = createServerFn({ method: "GET" }).handler(async () => {
  return currentProductKey();
});

export const Route = createFileRoute("/")({
  loader: () => getProductKey(),
  component: ComingNext,
});

function ComingNext() {
  const productKey = Route.useLoaderData();
  const cfg = product(productKey);
  const others = PRODUCT_KEYS.filter((key) => key !== productKey);

  return (
    <ProductShell site={productKey}>
      <TrackProductView site={productKey} />
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-5 sm:py-24">
        <p className="text-xs uppercase tracking-kicker text-subtle">{cfg.apex}</p>
        <h1 className="mt-4 font-display-site text-5xl leading-none tracking-tight sm:text-6xl">
          {cfg.name}
        </h1>
        <p className="mt-4 text-lg text-muted">{cfg.kicker}</p>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed">{cfg.oneLine}</p>

        <div className="mt-10 rounded-md border-2 border-fg/20 bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Status</p>
          <p className="mt-2 text-muted">
            {cfg.name} is in its foundation phase: the domain is live and the
            payment, trust, and analytics plumbing is in place, but no bounties are
            open yet. Nothing has been listed, nothing has been paid out, and no
            rankings exist.
          </p>
        </div>

        <div className="mt-10">
          <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
            The Bid Network
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {others.map((key) => {
              const p = product(key);
              return (
                <a
                  key={key}
                  href={`https://${p.apex}/`}
                  className="rounded-md border-2 border-fg/20 bg-surface p-4 hover:border-fg/50"
                >
                  <span className="font-display-site text-lg tracking-tight">
                    {p.name}
                  </span>
                  <span className="mt-1 block text-sm text-muted">{p.kicker}</span>
                </a>
              );
            })}
          </div>
        </div>

        <p className="mt-10 text-sm text-muted">
          Questions about {cfg.name}?{" "}
          <a
            href={`mailto:${cfg.contactEmail}`}
            className="underline-offset-4 hover:underline"
          >
            {cfg.contactEmail}
          </a>
        </p>
      </section>
    </ProductShell>
  );
}
