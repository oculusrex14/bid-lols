/// <reference types="vite/client" />

/**
 * Build-time platform flag injected by vite.config.ts `define`
 * (Phase 00.5, AC-9.1): statically replaced with the build-time truthiness
 * of the platform's `VERCEL` env var, so cloud bundles can
 * dead-code-eliminate the local-only PGLite fallback from the server output.
 * Under plain Node/tsx the identifier is undeclared — always read it through
 * `typeof __VERCEL_BUILD__ !== "undefined" && __VERCEL_BUILD__`.
 */
declare const __VERCEL_BUILD__: boolean;
