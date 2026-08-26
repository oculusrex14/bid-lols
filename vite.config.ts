import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { hostSeoDevPlugin } from "./scripts/host-seo-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";

/** The files `src/lib/db.server.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db.server` fails loudly instead
 * of bootstrapping (resolveDbConfig); preview (no DATABASE_URL) self-migrates
 * like dev.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "bid-network:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.server.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[bid-network] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

// `0.0.0.0:8080` is the local-dev contract — don't change host/port.
// `allowedHosts` keeps the four product domains (apex + www) reachable through
// the Vite dev server so Host-header based product selection is testable locally.
export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    allowedHosts: [
      "bidthrone.lol",
      "www.bidthrone.lol",
      "foundersbid.lol",
      "www.foundersbid.lol",
      "culturebid.lol",
      "www.culturebid.lol",
      "bidception.lol",
      "www.bidception.lol",
    ],
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    pgliteBootstrapPlugin(),
    // Host-aware robots/sitemap/legacy-308s + per-domain head injection
    // (dev twin of server/middleware/seo-host.ts).
    hostSeoDevPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            // Auto-registers server/middleware/* (request-id + host-seo).
            // Nitro v3 defaults serverDir to false, so removing this silently
            // unwires the SEO middleware on deploys.
            serverDir: "./server",
          }),
        ]
      : []),
    viteReact(),
  ],
}));
