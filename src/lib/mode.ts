export type Mode = "light" | "dark";

export const MODE_KEY = "bidlol.appearance";

/**
 * RC5 §9: the default appearance is PRODUCT-AWARE. Bidthrone ships dark
 * (its marketed identity is the dark archival ledger); the other three
 * products ship light. The stored preference always wins over the
 * fallback; the fallback is what a first-time visitor gets on first paint.
 */
export function readMode(fallback: Mode = "light"): Mode {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(MODE_KEY);
    return stored === "dark" ? "dark" : stored === "light" ? "light" : fallback;
  } catch {
    return fallback;
  }
}

export function applyMode(mode: Mode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.mode = mode;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/**
 * The inline head script that runs before first paint. It ONLY overrides
 * the SSR default when a stored preference exists, so:
 *   - new Bidthrone visitor: SSR dark, boot leaves dark (no light-to-dark
 *     flash, no hydration mismatch);
 *   - stored-light Bidthrone visitor: SSR dark, boot flips to light before
 *     paint;
 *   - new Founders/Culture/Bidception visitor: SSR light, boot leaves light.
 */
export function modeBootScript(fallback: Mode = "light"): string {
  const f: Mode = fallback === "dark" ? "dark" : "light";
  return (
    `try{var m=localStorage.getItem("${MODE_KEY}");` +
    `document.documentElement.setAttribute("data-mode",(m==="dark"||m==="light")?m:"${f}");` +
    `}catch(e){document.documentElement.setAttribute("data-mode","${f}")}`
  );
}

/** Legacy boot script (default-light) kept for tests that reference it. */
export const MODE_BOOT_SCRIPT = modeBootScript("light");
