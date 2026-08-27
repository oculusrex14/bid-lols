import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { type ProductKey } from "@/lib/host";
import { ProductShell, type ShellMe } from "@/components/product-shell";
import { TrackProductView } from "@/components/track-product-view";
import { BidthroneHome } from "@/components/home/bidthrone-home";
import { FoundersbidHome } from "@/components/home/foundersbid-home";
import { CulturebidHome } from "@/components/home/culturebid-home";
import { BidceptionHome } from "@/components/home/bidception-home";

/**
 * Product homes (RC1, R5). Operational marketplace homes — the product is
 * chosen by the request Host header (server-side in the loader), so each apex
 * domain serves its own live product page: hero + primary actions + honest
 * funding-disabled notes + honest empty states. Founding access is now a
 * SECONDARY newsletter/launch-updates section, not the primary action.
 */
const getShell = createServerFn({ method: "GET" }).handler(async () => {
  const { currentProductKey } = await import("@/lib/host");
  const { shellContext } = await import("@/lib/shell-context");
  const { me } = await (await import("@/lib/shell-context")).getShellContext();
  return { product: await currentProductKey(), me };
});

export const Route = createFileRoute("/")({
  loader: () => getShell(),
  component: ProductHome,
});

function ProductHome() {
  const { product: productKey, me } = Route.useLoaderData();

  return (
    <ProductShell site={productKey} me={me}>
      <TrackProductView site={productKey} />
      <HomeByProduct productKey={productKey} me={me} />
    </ProductShell>
  );
}

function HomeByProduct({
  productKey,
  me,
}: {
  productKey: ProductKey;
  me: ShellMe | null;
}) {
  switch (productKey) {
    case "foundersbid":
      return <FoundersbidHome me={me} />;
    case "culturebid":
      return <CulturebidHome me={me} />;
    case "bidception":
      return <BidceptionHome me={me} />;
    case "bidthrone":
    default:
      return <BidthroneHome me={me} />;
  }
}