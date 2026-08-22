import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { isSiteId } from "@/lib/sites";

export const Route = createFileRoute("/$site/refund")({
  component: () => {
    const { site } = Route.useParams();
    if (!isSiteId(site)) return null;
    return <LegalPage site={site} slug="refund" />;
  },
  head: () => ({ meta: [{ title: "Refund policy" }] }),
});
