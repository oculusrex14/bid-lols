export type Mode = "light" | "dark";

export const MODE_KEY = "bidlol.appearance";

export function readMode(): Mode {
  if (typeof window === "undefined") return "light";
  try {
    return localStorage.getItem(MODE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
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

export const MODE_BOOT_SCRIPT = `try{var m=localStorage.getItem("${MODE_KEY}");document.documentElement.setAttribute("data-mode",m==="dark"?"dark":"light")}catch(e){document.documentElement.setAttribute("data-mode","light")}`;
