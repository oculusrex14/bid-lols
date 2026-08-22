import { useState } from "react";
import { cn } from "@/lib/cn";
import { hostOf } from "@/lib/format";

export function SiteFavicon({
  url,
  title,
  size = "md",
}: {
  url: string;
  title: string;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const host = hostOf(url);
  const letter = (title.trim()[0] || host[0] || "?").toUpperCase();
  const box =
    size === "lg" ? "size-10 text-base" : size === "sm" ? "size-7 text-xs" : "size-8 text-sm";
  const src = host
    ? `/api/favicon?host=${encodeURIComponent(host)}&letter=${encodeURIComponent(letter)}`
    : "";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm bg-raised font-display-site text-fg shadow-[var(--shadow-border)]",
        box,
      )}
    >
      {letter}
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width={40}
          height={40}
          className="absolute inset-0 size-full bg-raised object-contain"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}
