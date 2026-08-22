import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { SITES, isSiteId } from "@/lib/sites";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/$site")({
  beforeLoad: ({ params }) => {
    if (!isSiteId(params.site)) throw redirect({ to: "/" });
  },
  head: ({ params }) => {
    const cfg = isSiteId(params.site) ? SITES[params.site] : null;
    return {
      meta: [
        { title: cfg ? `${cfg.wordmark}.lol` : "BID.LOL" },
        { name: "description", content: cfg?.tagline ?? "" },
      ],
    };
  },
  component: SiteLayout,
});

function SiteLayout() {
  const { site } = Route.useParams();
  if (!isSiteId(site)) return null;
  return (
    <SiteShell site={site}>
      <Outlet />
    </SiteShell>
  );
}
