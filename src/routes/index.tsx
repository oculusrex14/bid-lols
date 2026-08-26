import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { currentProductKey, type ProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { TrackProductView } from "@/components/track-product-view";
import { BidthroneHome } from "@/components/home/bidthrone-home";
import { FoundersbidHome } from "@/components/home/foundersbid-home";
import { CulturebidHome } from "@/components/home/culturebid-home";
import { BidceptionHome } from "@/components/home/bidception-home";

/**
 * Pre-launch product homes (Phase 00.5, WS2). The product is chosen by the
 * request Host header (server-side in the loader), so each apex domain serves
 * its own deliberate pre-launch page: a positioning hero, honest
 * pre-marketplace content, labelled examples where useful, and the
 * founding-access capture. No internal engineering status copy, no fake
 * activity (AC-2.5/2.6).
 */
const getProductKey = createServerFn({ method: "GET" }).handler(async () => {
  return currentProductKey();
});

export const Route = createFileRoute("/")({
  loader: () => getProductKey(),
  component: ProductHome,
});

function ProductHome() {
  const productKey = Route.useLoaderData();

  return (
    <ProductShell site={productKey}>
      <TrackProductView site={productKey} />
      <HomeByProduct productKey={productKey} />
    </ProductShell>
  );
}

function HomeByProduct({ productKey }: { productKey: ProductKey }) {
  switch (productKey) {
    case "foundersbid":
      return <FoundersbidHome />;
    case "culturebid":
      return <CulturebidHome />;
    case "bidception":
      return <BidceptionHome />;
    case "bidthrone":
    default:
      return <BidthroneHome />;
  }
}
