import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/**
 * Shared auth forms (Phase 01, FR-1): sign-in and sign-up over Better Auth's
 * email+password endpoints. No auth logic lives here — errors from the
 * server (rate limits, invalid credentials, banned accounts) are surfaced
 * verbatim in their friendly form. Password minimum is enforced server-side
 * (10 chars) and mirrored client-side only as a UX hint.
 */

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

        <Button
          type="submit"
          size="md"
          loading={status.state === "submitting"}
          className="mt-5 w-full"
        >
          {isSignup ? "Create account" : "Sign in"}
        </Button>
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
        "inline-flex h-9 items-center rounded-sm border border-fg/25 px-3 text-sm font-medium transition-colors duration-150 hover:border-fg/50",
        className,
      )}
    >
      {busy ? "…" : "Sign out"}
    </button>
  );
}

/** Identity fields (RC3 split): names/ids are the submit contract;
 *  the skin is the spine Field/Input pair (rounded-sm h-10, token focus). */
function AuthFields({ isSignup }: { isSignup: boolean }) {
  return (
        <>
        {isSignup ? (
          <div className="mb-4">
            <Field label="Name" id="au-name" required>
              <Input
                id="au-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Ada Lovelace"
              />
            </Field>
          </div>
        ) : null}

        <div className="mb-4">
          <Field label="Email" id="au-email" required>
            <Input
              id="au-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
        </div>

        <div>
          <Field label="Password" id="au-password" required>
            <Input
              id="au-password"
              name="password"
              type="password"
              required
              minLength={isSignup ? 10 : undefined}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 10 characters" : "Your password"}
            />
          </Field>
        </div>
        </>
  );
}

