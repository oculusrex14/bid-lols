import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

/**
 * Shared auth forms (Phase 01, FR-1): sign-in and sign-up over Better Auth's
 * email+password endpoints. No auth logic lives here — errors from the
 * server (rate limits, invalid credentials, banned accounts) are surfaced
 * verbatim in their friendly form. Password minimum is enforced server-side
 * (10 chars) and mirrored client-side only as a UX hint.
 */

const inputClasses =
  "h-11 w-full rounded-md border border-fg/20 bg-surface px-3 text-sm outline-none focus:border-fg/60";

function toFriendly(message: string | undefined): string {
  if (!message) return "Something went wrong. Please try again.";
  if (/invalid email or password/i.test(message))
    return "Email or password is incorrect.";
  if (/user already exists/i.test(message))
    return "An account with this email already exists. Try signing in instead.";
  if (/password/i.test(message) && /least|short|length/i.test(message))
    return "Passwords need at least 10 characters.";
  if (/rate/i.test(message)) return "Too many attempts. Wait a minute and try again.";
  if (/banned/i.test(message)) return "This account is suspended. Contact support.";
  return message;
}

export function AuthCard({
  mode,
  redirectTo = "/dashboard",
}: {
  mode: "signin" | "signup";
  redirectTo?: string;
}) {
  const [status, setStatus] = useState<
    { state: "idle" } | { state: "submitting" } | { state: "error"; message: string }
  >({ state: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.state === "submitting") return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setStatus({ state: "submitting" });
    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({
              email,
              password,
              name: String(data.get("name") ?? "").trim() || email.split("@")[0],
            })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        setStatus({ state: "error", message: toFriendly(result.error.message) });
        return;
      }
      window.location.assign(redirectTo);
    } catch {
      setStatus({ state: "error", message: "Network error. Please try again." });
    }
  }

  const isSignup = mode === "signup";

  return (
    <div className="rounded-md border border-fg/20 bg-surface p-5 sm:p-6">
      <h1 className="font-display-site text-2xl tracking-tight sm:text-3xl">
        {isSignup ? "Create your account" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {isSignup
          ? "Your Bid Network account works across all four marketplaces. You may be asked to sign in again when moving between domains. No payment is required to create it."
          : "Welcome back. Your session is a secure, httpOnly cookie. Moving between domains may ask you to sign in again."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-5" data-testid={isSignup ? "signup-form" : "signin-form"}>
        <AuthFields isSignup={isSignup} />
        {status.state === "error" ? (
          <p role="alert" className="mt-3 text-sm font-medium text-danger">
            {status.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status.state === "submitting"}
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status.state === "submitting" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {isSignup ? "Creating account…" : "Signing in…"}
            </>
          ) : isSignup ? (
            "Create account"
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <a href="/signin" className="font-medium underline underline-offset-2">
              Sign in
            </a>
          </>
        ) : (
          <>
            New here?{" "}
            <a href="/signup" className="font-medium underline underline-offset-2">
              Create an account
            </a>
          </>
        )}
      </p>
    </div>
  );
}

/** Small sign-out button used in the shell/dashboard. */
export function SignOutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        window.location.assign("/");
      }}
      className={cn(
        "inline-flex h-9 items-center rounded-md border border-fg/20 px-3 text-sm font-medium",
        className,
      )}
    >
      {busy ? "…" : "Sign out"}
    </button>
  );
}

/** Identity fields (RC3 split): names/ids are the submit contract. */
function AuthFields({ isSignup }: { isSignup: boolean }) {
  return (
        <>
        {isSignup ? (
          <div className="mb-4">
            <label htmlFor="au-name" className="mb-1.5 block text-sm font-medium">
              Name
            </label>
            <input
              id="au-name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Ada Lovelace"
              className={inputClasses}
            />
          </div>
        ) : null}

        <div className="mb-4">
          <label htmlFor="au-email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="au-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClasses}
          />
        </div>

        <div>
          <label htmlFor="au-password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="au-password"
            name="password"
            type="password"
            required
            minLength={isSignup ? 10 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={isSignup ? "At least 10 characters" : "Your password"}
            className={inputClasses}
          />
        </div>
        </>
  );
}

