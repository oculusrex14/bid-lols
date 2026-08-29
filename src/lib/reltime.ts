/**
 * Human relative time (RC3 spine). Pure + client-safe. Deadlines render as
 * "closes in 8 days" for scanning, with the absolute date available (the
 * caller sets it in title/aria where accessibility requires it).
 */
export function relativeTime(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const ms = d.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const suffix = ms >= 0 ? "from now" : "ago";
  if (abs < 60_000) return "moments " + suffix;
  if (abs < 3_600_000) return Math.round(abs / 60_000) + " min " + suffix;
  if (abs < 86_400_000) return Math.round(abs / 3_600_000) + " hours " + suffix;
  if (abs < 30 * 86_400_000) return Math.round(abs / 86_400_000) + " days " + suffix;
  return d.toISOString().slice(0, 10);
}

/** "closes in 8 days" style phrase for deadlines (future-oriented). */
export function deadlinePhrase(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) return "no deadline";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "no deadline";
  if (d.getTime() <= now.getTime()) return "deadline passed";
  return "closes in " + relativeTime(d, now).replace(" from now", "");
}

export function absoluteDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
