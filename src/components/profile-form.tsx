import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Check } from "lucide-react";
import { getMyProfile, saveMyProfile, type MyProfileView } from "@/lib/profiles";
import { cn } from "@/lib/cn";

/**
 * Profile editor (Phase 01, FR-2). All writes go through saveMyProfile,
 * which authorizes against the server-side session and re-validates with
 * zod — the client form is convenience, never authority.
 */

const inputClasses =
  "h-11 w-full rounded-md border-2 border-fg/20 bg-surface px-3 text-sm outline-none focus:border-fg/60";

const RESERVED_NOTE =
  "Handles are lowercase (a–z, 0–9, underscore) and public: /profile/<handle>.";

function csv(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProfileForm({ initial }: { initial: MyProfileView }) {
  const p = initial.profile;
  const [status, setStatus] = useState<
    { state: "idle" } | { state: "saving" } | { state: "saved"; handle: string } | { state: "error"; message: string }
  >({ state: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.state === "saving") return;
    const f = new FormData(event.currentTarget);
    setStatus({ state: "saving" });
    try {
      const result = await saveMyProfile({
        data: {
          displayName: String(f.get("displayName") ?? "").trim(),
          handle: String(f.get("handle") ?? "").trim().toLowerCase(),
          bio: String(f.get("bio") ?? ""),
          location: String(f.get("location") ?? ""),
          timezone: String(f.get("timezone") ?? ""),
          skills: csv(String(f.get("skills") ?? "")).slice(0, 20),
          categories: csv(String(f.get("categories") ?? "")).slice(0, 20),
          portfolioLinks: csv(String(f.get("portfolioLinks") ?? "")).slice(0, 10),
          githubUrl: String(f.get("githubUrl") ?? "").trim(),
          linkedinUrl: String(f.get("linkedinUrl") ?? "").trim(),
          websiteUrl: String(f.get("websiteUrl") ?? "").trim(),
          availability: (String(f.get("availability") ?? "available") || "available") as
            | "available"
            | "limited"
            | "booked",
          companyName: String(f.get("companyName") ?? "").trim(),
          companyWebsite: String(f.get("companyWebsite") ?? "").trim(),
          companyAbout: String(f.get("companyAbout") ?? "").trim(),
          isSponsor: f.get("isSponsor") === "on",
        },
      });
      if (result.ok) {
        setStatus({ state: "saved", handle: result.handle });
        // The handle may have been auto-adjusted; refresh to the canonical view.
        setTimeout(() => window.location.assign("/settings/profile"), 900);
      } else {
        setStatus({ state: "error", message: result.message });
      }
    } catch (err) {
      setStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Invalid data.",
      });
    }
  }

  const label = "mb-1.5 block text-sm font-medium";
  const field = inputClasses;

  return (
    <form onSubmit={onSubmit} noValidate data-testid="profile-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-name" className={label}>Display name</label>
          <input id="pf-name" name="displayName" defaultValue={initial.displayName} required maxLength={120} className={field} />
        </div>
        <div>
          <label htmlFor="pf-handle" className={label}>Handle</label>
          <input
            id="pf-handle"
            name="handle"
            defaultValue={p.handle ?? ""}
            required
            pattern="[a-z0-9_]{2,32}"
            className={field}
            aria-describedby="pf-handle-note"
          />
          <p id="pf-handle-note" className="mt-1 text-xs text-subtle">{RESERVED_NOTE}</p>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="pf-bio" className={label}>Short bio</label>
        <textarea id="pf-bio" name="bio" rows={3} maxLength={1000} defaultValue={p.bio} className="w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-location" className={label}>Location</label>
          <input id="pf-location" name="location" maxLength={120} defaultValue={p.location ?? ""} className={field} />
        </div>
        <div>
          <label htmlFor="pf-tz" className={label}>Timezone</label>
          <input id="pf-tz" name="timezone" maxLength={64} defaultValue={p.timezone ?? ""} placeholder="Asia/Kolkata" className={field} />
        </div>
        <div>
          <label htmlFor="pf-skills" className={label}>Skills (comma-separated)</label>
          <input id="pf-skills" name="skills" defaultValue={(p.skills ?? []).join(", ")} className={field} />
        </div>
        <div>
          <label htmlFor="pf-categories" className={label}>Categories (comma-separated)</label>
          <input id="pf-categories" name="categories" defaultValue={(p.categories ?? []).join(", ")} className={field} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-gh" className={label}>GitHub URL</label>
          <input id="pf-gh" name="githubUrl" type="url" placeholder="https://github.com/…" defaultValue={p.github_url ?? ""} className={field} />
        </div>
        <div>
          <label htmlFor="pf-li" className={label}>LinkedIn URL</label>
          <input id="pf-li" name="linkedinUrl" type="url" placeholder="https://www.linkedin.com/in/…" defaultValue={p.linkedin_url ?? ""} className={field} />
        </div>
        <div>
          <label htmlFor="pf-web" className={label}>Website</label>
          <input id="pf-web" name="websiteUrl" type="url" placeholder="https://…" defaultValue={p.website_url ?? ""} className={field} />
        </div>
        <div>
          <label htmlFor="pf-avail" className={label}>Availability</label>
          <select id="pf-avail" name="availability" defaultValue={p.availability ?? "available"} className={field}>
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="booked">Booked</option>
          </select>
        </div>
      </div>

      <div className="mt-6 rounded-md border-2 border-fg/10 bg-raised/40 p-4">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Sponsor / company (optional)</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pf-co" className={label}>Company name</label>
            <input id="pf-co" name="companyName" maxLength={160} defaultValue={p.company_name ?? ""} className={field} />
          </div>
          <div>
            <label htmlFor="pf-cow" className={label}>Company website</label>
            <input id="pf-cow" name="companyWebsite" type="url" defaultValue={p.company_website ?? ""} className={field} />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="pf-coa" className={label}>What does the company do?</label>
          <textarea id="pf-coa" name="companyAbout" rows={2} maxLength={500} defaultValue={p.company_about ?? ""} className="w-full rounded-md border-2 border-fg/20 bg-surface p-3 text-sm outline-none focus:border-fg/60" />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" name="isSponsor" defaultChecked={p.is_sponsor} className="size-4 accent-[var(--fg)]" />
          I fund work (show sponsor tools)
        </label>
      </div>

      {status.state === "error" ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">{status.message}</p>
      ) : null}
      {status.state === "saved" ? (
        <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-sm font-medium text-up">
          <Check className="size-4" aria-hidden="true" /> Saved — your profile lives at /profile/{status.handle}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status.state === "saving"}
        className={cn(
          "mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        {status.state === "saving" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Saving…
          </>
        ) : (
          "Save profile"
        )}
      </button>
    </form>
  );
}

/** Convenience wrapper that loads the profile client-side for settings pages. */
export function ProfileFormLoader() {
  const [state, setState] = useState<
    { state: "loading" } | { state: "ready"; profile: MyProfileView } | { state: "error"; message: string }
  >({ state: "loading" });
  useEffect(() => {
    getMyProfile().then((r) => {
      if (r.ok) setState({ state: "ready", profile: r.profile });
      else setState({ state: "error", message: r.message });
    });
  }, []);
  if (state.state === "loading") {
    return <p className="text-sm text-muted">Loading your profile…</p>;
  }
  if (state.state === "error") {
    return <p role="alert" className="text-sm text-danger">{state.message}</p>;
  }
  return <ProfileForm initial={state.profile} />;
}