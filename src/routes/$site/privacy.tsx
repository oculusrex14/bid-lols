import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { isSiteId } from "@/lib/sites";

export const Route = createFileRoute("/$site/privacy")({
  component: () => {
    const { site } = Route.useParams();
    if (!isSiteId(site)) return null;
    return <LegalPage site={site} slug="privacy" />;
  },
  head: () => ({ meta: [{ title: "Privacy policy" }] }),
});
