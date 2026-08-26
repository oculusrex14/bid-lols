import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { product, type ProductKey } from "@/lib/host";
import { joinFoundingAccess } from "@/lib/waitlist";
import { WAITLIST_CONSENT_TEXT, type WaitlistRole } from "@/lib/waitlist-shared";
import { cn } from "@/lib/cn";

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
    { value: "sponsor", label: "Sponsor — I'd fund work" },
    { value: "builder", label: "Builder — I'd do work" },
  ],
  foundersbid: [
    { value: "sponsor", label: "I need work done (sponsor)" },
    { value: "builder", label: "I want to build" },
  ],
  culturebid: [
    { value: "brand", label: "I'm a brand (I fund briefs)" },
    { value: "creator", label: "I'm a creator (I compete)" },
  ],
  bidception: [
    { value: "captain", label: "Interested in captaining" },
    { value: "sponsor", label: "I'd fund a nested project" },
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
  ctaLabel = "Request founding access",
}: {
  site: ProductKey;
  defaultRole?: WaitlistRole;
  ctaLabel?: string;
}) {
  const cfg = product(site);
  const options = ROLE_OPTIONS[site];
  const [role, setRole] = useState<WaitlistRole>(
    defaultRole && options.some((o) => o.value === defaultRole)
      ? defaultRole
      : options[0].value,
  );
  const [status, setStatus] = useState<Status>({ state: "idle" });
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
          consent: data.get("consent") === "on",
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

  const inputClasses =
    "h-11 w-full rounded-md border-2 border-fg/20 bg-surface px-3 text-sm outline-none focus:border-fg/60";

  return (
    <div id="access" className="mt-12 scroll-mt-20">
      <div className="rounded-lg border-2 border-fg/20 bg-surface p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-kicker text-subtle">
          Founding access
        </p>
        <h2 className="mt-2 font-display-site text-2xl tracking-tight sm:text-3xl">
          {cfg.name} opens in stages. Get on the list.
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          We contact people on this list about early access to {cfg.name} —
          nothing else. One email, no payment, no spam.
        </p>

        {status.state === "success" ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-5 flex items-start gap-3 rounded-md border-2 border-up/40 bg-raised/50 p-4"
          >
            <Check className="mt-0.5 size-5 shrink-0 text-up" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">
                You're on the list for {cfg.name}.
              </p>
              <p className="mt-1 text-sm text-muted">
                We'll write to {status.email} when {cfg.name} opens. No counts,
                no promises of timing — just one email when it's real.
              </p>
            </div>
          </div>
        ) : (
          <form ref={formRef} onSubmit={onSubmit} noValidate className="mt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fa-email" className="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="fa-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="fa-role" className="mb-1.5 block text-sm font-medium">
                  I'm here as…
                </label>
                <select
                  id="fa-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as WaitlistRole)}
                  className={inputClasses}
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
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

            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-muted">
              <input
                type="checkbox"
                name="consent"
                required
                className="mt-0.5 size-4 shrink-0 accent-[var(--fg)]"
              />
              <span>{WAITLIST_CONSENT_TEXT}.</span>
            </label>

            {status.state === "error" ? (
              <p role="alert" className="mt-3 text-sm font-medium text-danger">
                {status.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={status.state === "submitting"}
              className={cn(
                "mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {status.state === "submitting" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                ctaLabel
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
