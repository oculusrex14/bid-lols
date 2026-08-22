import { normalizeUrl } from "@/lib/url";

export const MAX_SOCIALS = 5;

export type SocialKind = "x" | "linkedin" | "web";

export type SocialLink = {
  url: string;
  host: string;
  kind: SocialKind;
  label: string;
};

export function clampSocials(raw: unknown): string[] {
  let source: unknown = raw;
  if (typeof source === "string") {
    const asText = source;
    try {
      source = JSON.parse(asText);
    } catch {
      source = asText.trim() ? [asText] : [];
    }
  }
  const list = Array.isArray(source) ? source : [];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    try {
      const url = normalizeUrl(trimmed);
      if (!out.includes(url)) out.push(url);
    } catch {
      continue;
    }
    if (out.length >= MAX_SOCIALS) break;
  }
  return out;
}

export function socialKind(url: string): SocialKind {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host === "x.com" || host === "twitter.com" || host.endsWith(".x.com")) return "x";
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
  } catch {
    /* fall through */
  }
  return "web";
}

export function parseSocials(raw: unknown): SocialLink[] {
  return clampSocials(raw).map((url) => {
    const kind = socialKind(url);
    let host = url;
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      /* keep */
    }
    const label =
      kind === "x" ? "X" : kind === "linkedin" ? "LinkedIn" : host;
    return { url, host, kind, label };
  });
}

export function takeFirstDollars(leaderBidCents: number | null | undefined) {
  const dollars = Math.round((leaderBidCents ?? 0) / 100);
  if (dollars < 1) return 5;
  return dollars + 1;
}
