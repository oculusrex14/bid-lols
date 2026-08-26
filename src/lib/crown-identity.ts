/**
 * Crown device identity — accountless by design (auth is OFF, SPEC §6).
 * A random token per browser plus an optional display handle live in
 * localStorage and are treated as unowned, non-sensitive data: no PII,
 * no email, no account.
 */

const TOKEN_KEY = "crown.token.v1";
const HANDLE_KEY = "crown.handle.v1";

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `crn_${hex}`;
}

export function getCrownToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing && existing.length >= 10) return existing;
    const token = randomToken();
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return "";
  }
}

export function getCrownHandle(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(HANDLE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setCrownHandle(handle: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HANDLE_KEY, handle);
  } catch {
    /* ignore quota */
  }
}
