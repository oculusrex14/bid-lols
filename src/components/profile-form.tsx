import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { getMyProfile, saveMyProfile, type MyProfileView } from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import { CheckRow, Field, Input, Select, Textarea } from "@/components/ui/field";

/**
 * Profile editor (Phase 01, FR-2). All writes go through saveMyProfile,
 * which authorizes against the server-side session and re-validates with
 * zod — the client form is convenience, never authority.
 */

const RESERVED_NOTE =
  "Handles are lowercase (a–z, 0–9, underscore) and public: /profile/<handle>.";

function csv(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** RC3: hoisted for the extracted field-group components (same contract).
 *  Skin = spine Field/Input (rounded-sm h-10, token focus ring). */

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
          isSponsor,
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


  const [isSponsor, setIsSponsor] = useState<boolean>(p.is_sponsor);

  return (
    <form onSubmit={onSubmit} noValidate data-testid="profile-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" id="pf-name" required>
          <Input id="pf-name" name="displayName" defaultValue={initial.displayName} required maxLength={120} />
        </Field>
        <Field label="Handle" id="pf-handle" required hint={RESERVED_NOTE}>
          <Input id="pf-handle" name="handle" defaultValue={p.handle ?? ""} required pattern="[a-z0-9_]{2,32}" />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Short bio" id="pf-bio">
          <Textarea id="pf-bio" name="bio" rows={3} maxLength={1000} defaultValue={p.bio} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Location" id="pf-location">
          <Input id="pf-location" name="location" maxLength={120} defaultValue={p.location ?? ""} />
        </Field>
        <Field label="Timezone" id="pf-tz">
          <Input id="pf-tz" name="timezone" maxLength={64} defaultValue={p.timezone ?? ""} placeholder="Asia/Kolkata" />
        </Field>
        <Field label="Skills (comma-separated)" id="pf-skills">
          <Input id="pf-skills" name="skills" defaultValue={(p.skills ?? []).join(", ")} />
        </Field>
        <Field label="Categories (comma-separated)" id="pf-categories">
          <Input id="pf-categories" name="categories" defaultValue={(p.categories ?? []).join(", ")} />
        </Field>
      </div>

      <PresenceFields p={p} isSponsor={isSponsor} onIsSponsor={setIsSponsor} />

      {status.state === "error" ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">{status.message}</p>
      ) : null}
      {status.state === "saved" ? (
        <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-sm font-medium text-up">
          <Check className="size-4" aria-hidden="true" /> Saved. Your profile lives at /profile/{status.handle}
        </p>
      ) : null}

      <Button type="submit" size="md" loading={status.state === "saving"} className="mt-5">
        Save profile
      </Button>
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

/** RC3: profile form is one <form>; field groups are components for reading,
 * the submit still reads FormData by name, so ids/names are contract. */
function PresenceFields({
  p,
  isSponsor,
  onIsSponsor,
}: {
  p: MyProfileView["profile"];
  isSponsor: boolean;
  onIsSponsor: (v: boolean) => void;
}) {
  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="GitHub URL" id="pf-gh">
          <Input id="pf-gh" name="githubUrl" type="url" placeholder="https://github.com/…" defaultValue={p.github_url ?? ""} />
        </Field>
        <Field label="LinkedIn URL" id="pf-li">
          <Input id="pf-li" name="linkedinUrl" type="url" placeholder="https://www.linkedin.com/in/…" defaultValue={p.linkedin_url ?? ""} />
        </Field>
        <Field label="Website" id="pf-web">
          <Input id="pf-web" name="websiteUrl" type="url" placeholder="https://…" defaultValue={p.website_url ?? ""} />
        </Field>
        <Field label="Availability" id="pf-avail">
          <Select id="pf-avail" name="availability" defaultValue={p.availability ?? "available"}>
            <option value="available">Available</option>
            <option value="limited">Limited</option>
            <option value="booked">Booked</option>
          </Select>
        </Field>
      </div>

      <div className="mt-6 rounded-md border border-fg/10 bg-raised/40 p-4">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">Sponsor / company (optional)</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Company name" id="pf-co">
            <Input id="pf-co" name="companyName" maxLength={160} defaultValue={p.company_name ?? ""} />
          </Field>
          <Field label="Company website" id="pf-cow">
            <Input id="pf-cow" name="companyWebsite" type="url" defaultValue={p.company_website ?? ""} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="What does the company do?" id="pf-coa">
            <Textarea id="pf-coa" name="companyAbout" rows={2} maxLength={500} defaultValue={p.company_about ?? ""} />
          </Field>
        </div>
        <div className="mt-3">
          <CheckRow
            type="checkbox"
            checked={isSponsor}
            onChange={onIsSponsor}
            label="I fund work (show sponsor tools)"
          />
        </div>
      </div>
    </>
  );
}
