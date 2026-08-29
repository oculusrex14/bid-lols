import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { product, type ProductKey } from "@/lib/host";
import { joinFoundingAccess } from "@/lib/waitlist";
import { WAITLIST_CONSENT_TEXT, type WaitlistRole } from "@/lib/waitlist-shared";
import { Button } from "@/components/ui/button";
import { CheckRow, Field, Input, Select } from "@/components/ui/field";

/**
 * Founding-access capture (Phase 00.5, WS3). The smallest truthful conversion
 * mechanism consistent with the current architecture: one validated server
 * function, one table, no accounts (AC-3.5).
 *
 * - The origin product is NEVER sent from this form: the server derives it
 *   from the request Host header (AC-3.2/3.6).
 * - `company` is a hidden honeypot: invisible to people, tempting to bots
 *   (AC-3.3).
 * - Success shows an explicit confirmation; no counts are displayed
 *   anywhere (AC-3.4 / no fabricated activity).
 */

type RoleOption = { value: WaitlistRole; label: string };

const ROLE_OPTIONS: Record<ProductKey, RoleOption[]> = {
  bidthrone: [
    { value: "sponsor", label: "Sponsor: I fund work" },
    { value: "builder", label: "Builder: I do work" },
  ],
  foundersbid: [
    { value: "sponsor", label: "I need work done (sponsor)" },
    { value: "builder", label: "I want to build" },
  ],
  culturebid: [
    { value: "brand", label: "Brand: I fund briefs" },
    { value: "creator", label: "Creator: I make the work" },
  ],
  bidception: [
    { value: "captain", label: "Interested in captaining" },
    { value: "sponsor", label: "I'd fund a team project" },
    { value: "builder", label: "I'd join a team" },
  ],
};

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; email: string }
  | { state: "error"; message: string };

function errorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "missing_consent":
      return "Please confirm you're okay with being contacted.";
    case "rate_limited":
      return "That's a lot of recent submissions from this device. Try again later.";
    case "db_error":
      return "Something went wrong on our side. Please try again in a moment.";
    default:
      return fallback;
  }
}

export function FoundingAccess({
  site,
  defaultRole,
  ctaLabel = "Get launch updates",
  heading,
  intro,
}: {
  site: ProductKey;
  defaultRole?: WaitlistRole;
  ctaLabel?: string;
  /** Heading override (RC1: founding access is a secondary launch-updates list, not the product). */
  heading?: string;
  /** Intro copy override. */
  intro?: string;
}) {
  const cfg = product(site);
  const options = ROLE_OPTIONS[site];
  const [role, setRole] = useState<WaitlistRole>(
    defaultRole && options.some((o) => o.value === defaultRole)
      ? defaultRole
      : options[0].value,
  );
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [consent, setConsent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // The CTAs above preset the role without a full page reload.
  useEffect(() => {
    if (defaultRole && options.some((o) => o.value === defaultRole)) {
      setRole(defaultRole);
    }
  }, [defaultRole]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (status.state === "submitting") return;
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setStatus({ state: "submitting" });
    try {
      const result = await joinFoundingAccess({
        data: {
          email: String(data.get("email") ?? ""),
          role,
          consent,
          company: data.get("company") ? String(data.get("company")) : undefined,
        },
      });
      if (result && result.ok) {
        setStatus({ state: "success", email: String(data.get("email") ?? "") });
      } else {
        setStatus({
          state: "error",
          message: errorMessage(
            result && "code" in result ? (result.code as string) : undefined,
            "Please check your email address and try again.",
          ),
        });
      }
    } catch (err) {
      setStatus({
        state: "error",
        message:
          err instanceof Error && /email|invalid|schema|validation/i.test(err.message)
            ? "Please enter a valid email address."
            : "We couldn't process that just now. Please try again.",
      });
    }
  }

  return (
    <div id="access" className="mt-12 scroll-mt-20">
      <div className="rounded-md border border-fg/20 bg-surface p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
          Launch updates
        </p>
        <h2 className="mt-2 font-display-site text-2xl tracking-tight sm:text-3xl">
          {heading ?? `Get updates from ${cfg.name}.`}
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          {intro ??
            `We email people on this list about ${cfg.name}: funding opening, ` +
              `new categories, launch updates. One email per change, no marketing list.`}
        </p>

        {status.state === "success" ? (
          <SentNotice name={cfg.name} email={status.email} />
        ) : (
          <CaptureForm
            formRef={formRef}
            onSubmit={onSubmit}
            busy={status.state === "submitting"}
            error={status.state === "error" ? status.message : null}
            role={role}
            setRole={setRole}
            consent={consent}
            setConsent={setConsent}
            options={options}
            ctaLabel={ctaLabel ?? "Notify me"}
          />
        )}
      </div>
    </div>
  );
}

/** The success notice (RC3 split; the ternary stays at the call site). */
function SentNotice({ name, email }: { name: string; email: string }) {
  return (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 flex items-start gap-3 rounded-md border border-up/40 bg-raised/50 p-4"
            >
              <Check className="mt-0.5 size-5 shrink-0 text-up" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">
                  You're on the list for {name}.
                </p>
                <p className="mt-1 text-sm text-muted">
                  We'll write to {email} when {name} opens. No counts,
                  no promises of timing. One email when it is real.
                </p>
              </div>
            </div>
  );
}

/** The capture form (RC3 split): names/ids are the submit contract; */
/** status display rides props (busy/error) instead of closure state. */
function CaptureForm({
  formRef,
  onSubmit,
  busy,
  error,
  role,
  setRole,
  consent,
  setConsent,
  options,
  ctaLabel,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void> | void;
  busy: boolean;
  error: string | null;
  role: WaitlistRole;
  setRole: (r: WaitlistRole) => void;
  consent: boolean;
  setConsent: (v: boolean) => void;
  options: Array<{ value: WaitlistRole; label: string }>;
  ctaLabel: string;
}) {
  return (

          <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" id="fa-email" required>
                <Input
                  id="fa-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="I'm here as…" id="fa-role" required>
                <Select
                  id="fa-role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as WaitlistRole)}
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {/* Honeypot: off-screen, unfocusable, invisible to people. */}
            <div
              aria-hidden="true"
              className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden"
            >
              <label htmlFor="fa-company">Company</label>
              <input
                id="fa-company"
                name="company"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="mt-4">
              <CheckRow
                type="checkbox"
                checked={consent}
                onChange={setConsent}
                label={WAITLIST_CONSENT_TEXT + "."}
              />
            </div>

            {error ? (
              <p role="alert" className="mt-3 text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="md" loading={busy} className="mt-5">
              {ctaLabel}
            </Button>
          </form>
  );
}
