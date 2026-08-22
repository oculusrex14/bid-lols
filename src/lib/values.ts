/** Culturebid “why join us” points. Short phrases, not URLs. Max 5. */
export const MAX_VALUES = 5;

export function clampValues(raw: unknown): string[] {
  let source: unknown = raw;
  if (typeof source === "string") {
    const asText = source;
    try {
      source = JSON.parse(asText);
    } catch {
      source = asText.split(/[,\n]/);
    }
  }
  const list = Array.isArray(source) ? source : [];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim().slice(0, 48);
    if (!trimmed) continue;
    if (!out.includes(trimmed)) out.push(trimmed);
    if (out.length >= MAX_VALUES) break;
  }
  return out;
}
