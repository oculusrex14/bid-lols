export function formatUsd(cents: number) {
  const dollars = Math.round(cents) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  }).format(dollars);
}

export function formatUsdPlain(cents: number) {
  return formatUsd(cents).replace("$", "");
}

export function formatInr(rupees: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(rupees));
}

export function relativeTime(iso: string | Date) {
  const then = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  const delta = Math.max(0, Date.now() - then);
  const sec = Math.round(delta / 1000);
  if (sec < 20) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function rankLabel(rank: number | null | undefined) {
  if (!rank) return "—";
  return String(rank).padStart(2, "0");
}
