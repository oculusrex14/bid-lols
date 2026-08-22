/**
 * Brand-domain routing for production (Nitro). Dev uses the Vite plugin in
 * `scripts/brand-host.mjs`. 302s, not rewrites — see that file for why.
 */
import { redirectForBrandHost } from "../../scripts/brand-host.mjs";

interface BrandHostEvent {
  url: URL;
  req: { method?: string; headers: Headers };
}

function requestHost(event: BrandHostEvent): string {
  return (
    event.req.headers.get("x-forwarded-host") ??
    event.req.headers.get("host") ??
    event.url.host
  );
}

export default function brandHostMiddleware(event: BrandHostEvent) {
  const redirect = redirectForBrandHost({
    host: requestHost(event),
    path: event.url.pathname,
    search: event.url.search,
  });
  if (!redirect) return;
  return new Response(null, {
    status: redirect.status,
    headers: { location: redirect.location },
  });
}
