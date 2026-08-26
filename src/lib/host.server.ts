import { getRequestHost } from "@tanstack/react-start/server";
import { DEFAULT_PRODUCT, resolveProductKey, type ProductKey } from "@/lib/host";

/**
 * Server-only host reader (`.server` convention: never enters the client
 * bundle). Reads the request Host header through Start's per-request async
 * context — x-forwarded-host first, which is what Vercel sets on all four
 * domains.
 */
export function serverProductKey(): ProductKey {
  try {
    return resolveProductKey(getRequestHost({ xForwardedHost: true }));
  } catch {
    return DEFAULT_PRODUCT as ProductKey;
  }
}
