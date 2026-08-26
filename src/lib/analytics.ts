import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PRODUCT_KEYS } from "@/lib/host";

/**
 * Client-safe wrappers around the server-only analytics primitives
 * (analytics.server.ts). The `.server` module is imported dynamically inside
 * an SSR guard so the DB module (and PGLite) never enters the client bundle.
 */

const siteSchema = z.enum([...PRODUCT_KEYS]);

async function runServer<T>(
  run: (mod: typeof import("@/lib/analytics.server")) => Promise<T>,
): Promise<T> {
  if (!import.meta.env.SSR) {
    throw new Error("analytics server functions must run server-side");
  }
  return run(await import("@/lib/analytics.server"));
}

export const trackPageView = createServerFn({ method: "POST" })
  .validator(z.object({ site: siteSchema }).parse)
  .handler(async ({ data }) => {
    await runServer((m) => m.recordPageView(data.site));
  });

export const trackVisit = createServerFn({ method: "POST" })
  .validator(z.object({ site: siteSchema }).parse)
  .handler(async ({ data }) => {
    await runServer((m) => m.recordVisit(data.site));
  });

/** No Phase 00 UI calls this yet — the server-side primitive exists and is
 *  covered by the W2 tests, so outbound clicks are represented independently
 *  the moment Phase 01 ships outbound links. */
export const trackOutboundClick = createServerFn({ method: "POST" })
  .validator(z.object({ site: siteSchema }).parse)
  .handler(async ({ data }) => {
    await runServer((m) => m.recordOutboundClick(data.site));
  });
