import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { kyselyAdapter } from "@better-auth/kysely-adapter";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { resolveDbConfig, dbSource, getPglite } from "@/lib/db.server";
import { createPgliteDialect } from "@/lib/auth-pglite-dialect.server";
import { makeId } from "@/lib/ids";
import { getMailTransport } from "@/lib/mail";
import { PRODUCT_KEYS, PRODUCTS } from "@/lib/host";

/**
 * Better Auth 1.7 (Phase 01, FR-1) — the ONLY auth implementation. No
 * hand-rolled session or password cryptography anywhere in this codebase.
 *
 * Mapping decisions (recorded in PHASE_01_FOUNDERSBID.md §FR-1):
 *  - Better Auth owns `sessions`, `account`, `verification` and the session
 *    cookie; its `user` model maps onto the Phase 00 `users` table
 *    (`display_name` IS the Better Auth `name` — one source of truth).
 *  - Production uses node-postgres (Kysely PostgresDialect over a real pool);
 *    local/test uses the same embedded PGLite instance as the app
 *    (auth-pglite-dialect.server.ts) so tests exercise one real schema.
 *  - Password hashing, session tokens, CSRF/origin checks are internal to
 *    Better Auth. `trustedOrigins` allows the four product domains (derived
 *    from the host registry) + local dev ports + operator-curated extras.
 *  - Email verification is enabled in model but NOT required until a mail
 *    provider is configured (degradable external blocker): verification
 *    sending goes through the mail adapter, which honestly reports
 *    "disabled" — nothing is faked. Money-facing flows additionally require
 *    `email_verified` (authz.ts); without a mail provider that state is
 *    only reachable via audited admin verification.
 *  - The admin plugin provides role/ban state stored on `users` in Better
 *    Auth's default columns (plugin fields are not name-mappable) —
 *    server-set only, never client input.
 */

function authDatabase(): Kysely<Record<string, unknown>> {
  if (dbSource === "neon") {
    const url = resolveDbConfig(process.env).databaseUrl;
    if (!url) throw new Error("auth: neon backend without DATABASE_URL");
    const pool = new pg.Pool({ connectionString: url, max: 5 });
    return new Kysely<Record<string, unknown>>({
      dialect: new PostgresDialect({ pool }),
    });
  }
  // PGLite (dev/preview/test) — share the app's instance and its migrations.
  return new Kysely<Record<string, unknown>>({
    dialect: createPgliteDialect(getPglite()),
  });
}

/** Local dev/preview hosts that may exercise auth. */
function localTrustedOrigins(): string[] {
  return [
    "http://localhost:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
  ];
}

function productTrustedOrigins(): string[] {
  const origins: string[] = [];
  for (const key of PRODUCT_KEYS) {
    const apex = PRODUCTS[key]?.apex;
    if (!apex) continue;
    // www + apex are trusted for every product (www 301s to apex, but the
    // origin check must accept both during the redirect).
    origins.push(`https://${apex}`, `https://www.${apex}`);
  }
  return origins;
}

function extraTrustedOrigins(): string[] {
  // Explicit env extension (e.g. preview URLs) — operator-curated, never wildcard.
  return (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const PRODUCTION =
  process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production";

function authSecret(): string {
  const secret = (process.env.BETTER_AUTH_SECRET ?? "").trim();
  if (secret) return secret;
  if (PRODUCTION) {
    throw new Error(
      "BETTER_AUTH_SECRET is required in production but is missing. " +
        "Set it on the Vercel project before deploying Phase 01 auth.",
    );
  }
  // Non-production only: deterministic dev secret (sessions reset on restart).
  return `dev-only-${process.env.DATABASE_URL ?? "pglite"}-${process.env.VERCEL_ENV ?? "local"}`;
}

export const auth = betterAuth({
  appName: "Bid Network",
  secret: authSecret(),
  database: kyselyAdapter(authDatabase(), { type: "postgres" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: false, // degraded mode until a mail provider exists (FR-1)
    autoSignIn: true,
  },
  emailVerification: {
    sendOnSignUp: getMailTransport().configured,
    async sendVerificationEmail(data) {
      // Degraded behavior (FR-1): the mail adapter honestly reports when
      // delivery is not configured; nothing is faked.
      await getMailTransport().send({
        to: data.user.email,
        subject: "Verify your Bid Network email",
        text: `Verify your email address by opening this link: ${data.url}\n\nThe link expires in 1 hour. If you didn't create a Bid Network account, you can ignore this email.`,
      });
    },
  },
  advanced: {
    database: {
      generateId: ({ model }: { model: string }) => {
        switch (model) {
          case "user":
            return makeId("usr_");
          case "session":
            return makeId("ses_");
          case "account":
            return makeId("acc_");
          case "verification":
            return makeId("ver_");
          default:
            return makeId("ba_");
        }
      },
    },
    useSecureCookies: PRODUCTION,
    defaultCookieAttributes: {
      sameSite: "lax",
      path: "/",
      // Host-only cookies: each product domain has its own session until an
      // SSO flow exists (Phase 04 concern). Secure is forced in production.
      secure: PRODUCTION,
      httpOnly: true,
    },
  },
  user: {
    modelName: "users",
    fields: {
      name: "display_name",
      emailVerified: "email_verified",
      image: "image",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  session: {
    modelName: "sessions",
    fields: {
      userId: "user_id",
      token: "token",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    modelName: "account",
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      scope: "scope",
      password: "password",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    modelName: "verification",
    fields: {
      identifier: "identifier",
      value: "value",
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  plugins: [admin(), tanstackStartCookies()],
  trustedOrigins: [
    ...localTrustedOrigins(),
    ...productTrustedOrigins(),
    ...extraTrustedOrigins(),
  ],
  rateLimit: {
    enabled: PRODUCTION || process.env.NODE_ENV === "development",
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 10 },
    },
  },
});

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;