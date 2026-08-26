import { createFileRoute } from "@tanstack/react-router";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/refund")({
  loader: async () => ({ productKey: await currentProductKey() }),
  component: RefundPage,
});

function RefundPage() {
  const { productKey } = Route.useLoaderData();
  return (
    <ProductShell site={productKey}>
      <LegalPage productKey={productKey} slug="refund" />
    </ProductShell>
  );
}
