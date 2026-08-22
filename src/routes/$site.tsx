import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { SITES, isSiteId } from "@/lib/sites";
import { SiteShell } from "@/components/site-shell";

/** One file-route tree serves founders | culture | bidception. Board key is `site`, not a board_type column. */
export const Route = createFileRoute("/$site")({
  beforeLoad: ({ params }) => {
    if (!isSiteId(params.site)) throw redirect({ to: "/" });
  },
  head: ({ params }) => {
    const cfg = isSiteId(params.site) ? SITES[params.site] : null;
    return {
      meta: [
        { title: cfg ? `${cfg.wordmark}.lol` : "bidthrone.lol" },
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
