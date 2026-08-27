import { z } from "zod";
import { getSql, type Sql } from "@/lib/db.server";
import { makeId } from "@/lib/ids";

/**
 * Profiles (Phase 01, FR-2). One row per user (Phase 00 `profiles`), extended
 * in 0012 with the marketplace fields. The handle is the public URL identity
 * (/profile/:handle): lowercase, unique, immutable-ish (editable but must
 * stay unique + reserved-safe).
 *
 * Authorization is NOT this module's job: serverFns in profiles.ts enforce
 * the session; these functions take the authenticated user id as a fact.
 */

export const HANDLE_RE = /^[a-z0-9_]{2,32}$/;

/** Paths a handle must never squat (routes own them). */
export const RESERVED_HANDLES = new Set([
  "api",
  "admin",
  "bounties",
  "projects",
  "settings",
  "signin",
  "signup",
  "signout",
  "dashboard",
  "profile",
  "graveyard",
  "terms",
  "privacy",
  "refund",
  "contact",
  "static",
  "public",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "serverfn",
  "_serverfn",
]);

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    if (!v) return true; // empty = unset
    try {
      const u = new URL(v);
      // https only, no credentials-in-URL, no single-label hosts.
      return (
        (u.protocol === "https:" || u.protocol === "http:") &&
        !u.username &&
        !u.password &&
        u.hostname.includes(".")
      );
    } catch {
      return false;
    }
  }, "Must be a valid https:// URL");

export const profileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{2,32}$/, "Handles are 2–32 characters: a–z, 0–9, underscore"),
  bio: z.string().trim().max(1000).default(""),
  location: z.string().trim().max(120).default(""),
  timezone: z.string().trim().max(64).default(""),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  categories: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  portfolioLinks: z.array(httpUrl).max(10).default([]),
  githubUrl: httpUrl.optional().default(""),
  linkedinUrl: httpUrl.optional().default(""),
  websiteUrl: httpUrl.optional().default(""),
  availability: z.enum(["available", "limited", "booked"]).default("available"),
  companyName: z.string().trim().max(160).default(""),
  companyWebsite: httpUrl.optional().default(""),
  companyAbout: z.string().trim().max(500).default(""),
  isSponsor: z.boolean().default(false),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;

export type ProfileRow = {
  user_id: string;
  handle: string | null;
  bio: string;
  location: string | null;
  timezone: string | null;
  skills: string[];
  categories: string[];
  portfolio_links: string[];
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  availability: string;
  company_name: string | null;
  company_website: string | null;
  company_about: string | null;
  is_sponsor: boolean;
  avatar_url: string | null;
};

/** Deterministic handle suggestion from an email: local-part, sanitized. */
export function suggestHandle(email: string): string {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28);
  if (base.length >= 2 && !RESERVED_HANDLES.has(base) && !/^[0-9_]+$/.test(base)) {
    return base;
  }
  return `member_${base.slice(0, 12) || makeId("").slice(1, 6)}`.slice(0, 32);
}

/** Find a free handle near a suggestion (suffix -2, -3, … then random tail). */
export async function allocateHandle(
  sql: Sql,
  desired: string,
  opts: { excludeUserId?: string } = {},
): Promise<string> {
  const base = desired.slice(0, 32);
  for (let i = 1; i <= 50; i += 1) {
    const candidate = i === 1 ? base : `${base.slice(0, 32 - String(i).length - 1)}_${i}`;
    const taken = await sql.query<{ user_id: string }>(
      "select user_id from profiles where handle = $1",
      [candidate],
    );
    const takenByOther =
      taken.length > 0 && taken[0].user_id !== (opts.excludeUserId ?? "");
    if (!takenByOther && !RESERVED_HANDLES.has(candidate)) return candidate;
  }
  return `${base.slice(0, 24)}${makeId("x").slice(1, 9)}`;
}

export type MyProfile = {
  userId: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  role: string;
  handle: string | null;
  profile: Omit<ProfileRow, "user_id" | "handle"> & { handle: string | null };
};

/** Read the profile for a user, creating the row lazily on first access. */
export async function getOrCreateProfile(userId: string): Promise<ProfileRow> {
  const sql = await getSql();
  const existing = await sql.query<ProfileRow>(
    "select * from profiles where user_id = $1",
    [userId],
  );
  if (existing.length > 0) return existing[0];
  const created = await sql.query<ProfileRow>(
    `insert into profiles (user_id) values ($1)
     on conflict (user_id) do update set updated_at = now()
     returning *`,
    [userId],
  );
  return created[0];
}

export async function getUserEmail(userId: string): Promise<{
  email: string;
  display_name: string | null;
  email_verified: boolean;
  role: string;
} | null> {
  const sql = await getSql();
  const rows = await sql.query<{
    email: string;
    display_name: string | null;
    email_verified: boolean;
    role: string;
  }>("select email, display_name, email_verified, role from users where id = $1", [
    userId,
  ]);
  return rows[0] ?? null;
}

/** Save (create-or-update) the caller's profile; returns the final handle. */
export async function saveProfile(
  userId: string,
  input: ProfileInput,
): Promise<{ handle: string }> {
  const sql = await getSql();
  return sql.transaction(async (tx) => {
    const current = await tx.query<{ handle: string | null }>(
      "select handle from profiles where user_id = $1 for update",
      [userId],
    );
    const previous = current[0]?.handle ?? null;
    let handle = previous;
    // A new or CHANGED handle must pass the reserved list and uniqueness.
    if (!previous || previous !== input.handle) {
      handle = await allocateHandle(tx, input.handle, { excludeUserId: userId });
    }
    await tx.query(
      `insert into profiles
        (user_id, handle, bio, location, timezone, skills, categories, portfolio_links,
         github_url, linkedin_url, website_url, availability,
         company_name, company_website, company_about, is_sponsor, updated_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,$14,$15,$16, now())
       on conflict (user_id) do update set
         handle = excluded.handle,
         bio = excluded.bio,
         location = excluded.location,
         timezone = excluded.timezone,
         skills = excluded.skills,
         categories = excluded.categories,
         portfolio_links = excluded.portfolio_links,
         github_url = excluded.github_url,
         linkedin_url = excluded.linkedin_url,
         website_url = excluded.website_url,
         availability = excluded.availability,
         company_name = excluded.company_name,
         company_website = excluded.company_website,
         company_about = excluded.company_about,
         is_sponsor = excluded.is_sponsor,
         updated_at = now()
       returning handle`,
      [
        userId,
        handle,
        input.bio,
        input.location || null,
        input.timezone || null,
        JSON.stringify(input.skills),
        JSON.stringify(input.categories),
        JSON.stringify(input.portfolioLinks),
        input.githubUrl || null,
        input.linkedinUrl || null,
        input.websiteUrl || null,
        input.availability,
        input.companyName || null,
        input.companyWebsite || null,
        input.companyAbout || null,
        input.isSponsor,
      ],
    );
    // Keep users.display_name in sync (the Better Auth `name`).
    await tx.query(
      "update users set display_name = $2, updated_at = now() where id = $1",
      [userId, input.displayName],
    );
    return { handle: handle as string };
  });
}

export type PublicProfile = {
  userId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  location: string | null;
  timezone: string | null;
  skills: string[];
  categories: string[];
  portfolioLinks: string[];
  githubUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  availability: string;
  companyName: string | null;
  companyWebsite: string | null;
  companyAbout: string | null;
  isSponsor: boolean;
  joinedAt: string;
  emailVerified: boolean;
};

/** Public profile by handle (no email, no admin state). */
export async function getPublicProfile(
  handle: string,
): Promise<PublicProfile | null> {
  const sql = await getSql();
  const rows = await sql.query<{
    user_id: string;
    handle: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string;
    location: string | null;
    timezone: string | null;
    skills: string[];
    categories: string[];
    portfolio_links: string[];
    github_url: string | null;
    linkedin_url: string | null;
    website_url: string | null;
    availability: string;
    company_name: string | null;
    company_website: string | null;
    company_about: string | null;
    is_sponsor: boolean;
    joined_at: string;
    email_verified: boolean;
  }>(
    `select p.user_id, p.handle, u.display_name, p.avatar_url, p.bio, p.location, p.timezone,
            p.skills, p.categories, p.portfolio_links, p.github_url, p.linkedin_url,
            p.website_url, p.availability, p.company_name, p.company_website,
            p.company_about, p.is_sponsor, u.created_at as joined_at, u.email_verified
     from profiles p join users u on u.id = p.user_id
     where lower(p.handle) = lower($1) and u.status = 'active' and u.banned = false`,
    [handle],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    userId: r.user_id,
    handle: r.handle ?? handle,
    displayName: r.display_name ?? "Member",
    avatarUrl: r.avatar_url,
    bio: r.bio ?? "",
    location: r.location,
    timezone: r.timezone,
    skills: Array.isArray(r.skills) ? r.skills : [],
    categories: Array.isArray(r.categories) ? r.categories : [],
    portfolioLinks: Array.isArray(r.portfolio_links) ? r.portfolio_links : [],
    githubUrl: r.github_url,
    linkedinUrl: r.linkedin_url,
    websiteUrl: r.website_url,
    availability: r.availability ?? "available",
    companyName: r.company_name,
    companyWebsite: r.company_website,
    companyAbout: r.company_about,
    isSponsor: r.is_sponsor,
    joinedAt: r.joined_at,
    emailVerified: r.email_verified,
  };
}