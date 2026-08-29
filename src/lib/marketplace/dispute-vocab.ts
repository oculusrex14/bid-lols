/**
 * RC4 §20: structured dispute-resolution vocabulary. CLIENT-SAFE (pure
 * constants): both the admin form and server-side validation consume these
 * lists, so a code can never drift between the UI and the engine.
 */

export const RESOLUTION_CODES = [
  "NO_FAULT",
  "PROVIDER_AT_FAULT",
  "SPONSOR_AT_FAULT",
  "CAPTAIN_AT_FAULT",
  "SHARED_FAULT",
  "PLATFORM_OR_PROVIDER_FAULT",
  "FRAUD_CONFIRMED",
  "COLLUSION_CONFIRMED",
  "ABUSIVE_CHARGEBACK_CONFIRMED",
  "OTHER_NO_SCORE_EFFECT",
] as const;

export type ResolutionCode = (typeof RESOLUTION_CODES)[number];

export const RESPONSIBILITIES = ["PROVIDER", "SPONSOR", "CAPTAIN", "SHARED", "NOBODY", "PLATFORM"] as const;
export type Responsibility = (typeof RESPONSIBILITIES)[number];

export const SEVERITY_CODES = [
  "NORMAL",
  "ATTRIBUTABLE_CANCELLATION",
  "ABANDONMENT_OR_NONPERFORMANCE",
  "PAYMENT_DEFAULT_OR_ABUSIVE_CHARGEBACK",
  "FRAUD_OR_COLLUSION_CONFIRMED",
] as const;

export type SeverityVocab = (typeof SEVERITY_CODES)[number];

const CODES = new Set<string>(RESOLUTION_CODES);
const RESP = new Set<string>(RESPONSIBILITIES);
const SEV = new Set<string>(SEVERITY_CODES);

export function isResolutionCode(v: unknown): v is ResolutionCode {
  return typeof v === "string" && CODES.has(v);
}

export function isResponsibility(v: string | null | undefined): boolean {
  return typeof v === "string" && RESP.has(v);
}

export function isSeverityCode(v: string | null | undefined): v is SeverityVocab {
  return typeof v === "string" && SEV.has(v);
}
