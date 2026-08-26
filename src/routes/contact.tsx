import { createFileRoute } from "@tanstack/react-router";
import { currentProductKey } from "@/lib/host";
import { ProductShell } from "@/components/product-shell";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/contact")({
  loader: async () => ({ productKey: await currentProductKey() }),
  component: ContactPage,
});

function ContactPage() {
  const { productKey } = Route.useLoaderData();
  return (
    <ProductShell site={productKey}>
      <LegalPage productKey={productKey} slug="contact" />
    </ProductShell>
  );
}
