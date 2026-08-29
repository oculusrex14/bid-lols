import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/favicon")({
  component: () => null,
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const url = new URL(request.url);
        const hostRaw = url.searchParams.get("host") ?? "";
        const letterRaw = url.searchParams.get("letter") ?? "";
        const host = safeHost(hostRaw);
        const letter = (letterRaw.trim()[0] || host?.[0] || "?").toUpperCase();

        if (host) {
          try {
            const remote = await fetch(
              `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
              { signal: AbortSignal.timeout(1200), redirect: "follow" },
            );
            if (remote.ok) {
              const buf = await remote.arrayBuffer();
              if (buf.byteLength > 32) {
                const type = remote.headers.get("content-type") || "image/x-icon";
                if (type.startsWith("image/")) {
                  return new Response(buf, {
                    headers: {
                      "content-type": type,
                      "cache-control": "public, max-age=86400",
                    },
                  });
                }
              }
            }
          } catch {
            /* fall through to monogram */
          }
        }

        return new Response(monogramSvg(letter), {
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            "cache-control": "public, max-age=86400",
          },
        });
      },
    },
  },
});

function safeHost(raw: string) {
  const host = raw.trim().toLowerCase().replace(/^www\./, "");
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host)) {
    return null;
  }
  if (host.length > 253) return null;
  return host;
}

function monogramSvg(letter: string) {
  const safe = /[A-Z0-9]/.test(letter) ? letter : "?";
  // Neutral porcelain tile (bidthrone default skin) so the monogram does not
  // leak one product's warm paper onto another product's page.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" fill="#dfe0e5"/><text x="32" y="42" text-anchor="middle" font-size="32" font-family="Georgia, 'Iowan Old Style', serif" fill="#15171c">${safe}</text></svg>`;
}
