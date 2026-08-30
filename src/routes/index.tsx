import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { type ProductKey } from "@/lib/host";
import { ProductShell, type ShellMe } from "@/components/product-shell";
import { TrackProductView } from "@/components/track-product-view";
import { BidthroneHome } from "@/components/home/bidthrone-home";
import { FoundersbidHome } from "@/components/home/foundersbid-home";
import { CulturebidHome } from "@/components/home/culturebid-home";
import { BidceptionHome } from "@/components/home/bidception-home";
import type { HomePreview } from "@/lib/marketplace/home-preview.server";

/**
 * Product homes (RC1, R5; RC3 S-24..28): operational marketplace homes.
 * The product is chosen by the request Host header (server-side in the
 * loader), and each home carries a LIVE preview of its own marketplace
 * (homePreview) so the hero and the "open now" section never invent
 * inventory — empty stays empty and says so.
 */
const getShell = createServerFn({ method: "GET" }).handler(async () => {
  const { currentProductKey } = await import("@/lib/host");
  const { getShellContext } = await import("@/lib/shell-context");
  const productKey = await currentProductKey();
  const { me, funding } = await getShellContext();
  // The preview must never break the home: a blip degrades to an empty
  // preview (the hero falls back to its labelled example / honest state).
  let preview: HomePreview;
  try {
    preview = await (await import("@/lib/marketplace/home-preview.server")).homePreview(productKey);
  } catch {
    preview =
      productKey === "bidception"
        ? { kind: "parents", items: [] }
        : productKey === "bidthrone"
          ? { kind: "boards", boards: [], marketRates: [] }
          : { kind: "bounties", items: [] };
  }
  return { product: productKey, me, funding, preview };
});

export const Route = createFileRoute("/")({
  loader: () => getShell(),
  component: ProductHome,
});

function ProductHome() {
  const { product: productKey, me, funding, preview } = Route.useLoaderData();

  return (
    <ProductShell site={productKey} me={me} funding={funding}>
      <TrackProductView site={productKey} />
      <HomeByProduct productKey={productKey} me={me} preview={preview} />
    </ProductShell>
  );
}

function HomeByProduct({
  productKey,
  me,
  preview,
}: {
  productKey: ProductKey;
  me: ShellMe | null;
  preview: HomePreview;
}) {
  switch (productKey) {
    case "foundersbid":
      return <FoundersbidHome me={me} preview={preview} />;
    case "culturebid":
      return <CulturebidHome me={me} preview={preview} />;
    case "bidception":
      return <BidceptionHome me={me} preview={preview} />;
    case "bidthrone":
    default:
      return <BidthroneHome me={me} preview={preview} />;
  }
}
