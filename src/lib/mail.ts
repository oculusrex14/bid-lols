/**
 * Mail adapter (Phase 01, FR-1) — the ONLY place email sending happens.
 *
 * Two transports, chosen by configuration:
 *  - `resend` when RESEND_API_KEY is set (HTTP API via fetch; no SDK dep).
 *  - `disabled` otherwise: an HONEST no-op that logs clearly and reports
 *    sent=false. It never fakes a "sent" state, and callers must surface the
 *    degraded behavior (e.g. "email delivery is not configured") instead of
 *    pretending a message went out.
 *
 * From-address: MAIL_FROM env (required for the live transport; the disabled
 * transport never sends so it never needs one).
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailTransport {
  readonly name: "resend" | "disabled";
  readonly configured: boolean;
  send(message: MailMessage): Promise<{ sent: boolean; reason?: string }>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function disabledTransport(): MailTransport {
  return {
    name: "disabled",
    configured: false,
    async send(message) {
      console.info(
        `[mail] DISABLED: no mail provider configured — message to ${message.to} ` +
          `("${message.subject}") was NOT sent. Configure RESEND_API_KEY to enable delivery.`,
      );
      return { sent: false, reason: "mail_provider_not_configured" };
    },
  };
}

function resendTransport(apiKey: string, from: string): MailTransport {
  return {
    name: "resend",
    configured: true,
    async send(message) {
      if (!EMAIL_RE.test(message.to)) {
        return { sent: false, reason: "invalid_recipient" };
      }
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
            ...(message.html ? { html: message.html } : {}),
          }),
        });
        if (!res.ok) {
          // Never log the API key or full body (could contain tokens); log status only.
          console.error(`[mail] resend delivery failed: HTTP ${res.status}`);
          return { sent: false, reason: `resend_http_${res.status}` };
        }
        return { sent: true };
      } catch (err) {
        console.error(`[mail] resend delivery error: ${err instanceof Error ? err.message : "unknown"}`);
        return { sent: false, reason: "resend_error" };
      }
    },
  };
}

export function getMailTransport(env: NodeJS.ProcessEnv = process.env): MailTransport {
  const apiKey = (env.RESEND_API_KEY ?? "").trim();
  const from = (env.MAIL_FROM ?? "").trim();
  if (apiKey && from) return resendTransport(apiKey, from);
  return disabledTransport();
}

/**
 * Production-loudness rule (AGENTS §5): when the app expects to send mail
 * (a flag-driven flow) but no provider is configured, callers must check
 * `sent` and degrade honestly — this helper is the shared guard for that.
 */
export function isMailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getMailTransport(env).configured;
}