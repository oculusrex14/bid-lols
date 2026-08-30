import type { ProductKey } from "@/lib/host";

/**
 * The product mark family (RC5 §14). One component, four silhouettes:
 *  - Bidthrone:   a geometric seal suggesting a throne (a keystone over a
 *                 record line). The symbol may suggest; the word "crown"
 *                 never appears in rendered copy.
 *  - FoundersBid: a circular seal, outer ring + inner dashed ring + three
 *                 builder dots.
 *  - CultureBid:  a framed editorial card (brief frame + clapper wedge).
 *  - Bidception:  a 2x2 node grid, opposing nodes filled, opposing outlined.
 *  - NetworkMark: the shared Bid Network identity (four nodes, one filled).
 *
 * Presentation only: SVG, currentColor (inherits the header text color),
 * no hardcoded product hex, decorative (aria-hidden) by default.
 */

export function ProductMark({
  site,
  size = 34,
  label,
}: {
  site: ProductKey;
  size?: number;
  /** Optional accessible label; default decorative. */
  label?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 34 34",
    "aria-hidden": label ? undefined : true,
    role: label ? "img" : undefined,
    "aria-label": label,
    className: "shrink-0",
  } as const;
  switch (site) {
    case "bidthrone":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          {/* keystone */}
          <path d="M17 4 L22 10 H12 Z" fill="currentColor" stroke="none" />
          {/* seal ring, open at the top for the keystone */}
          <path d="M8 12 a 12 12 0 1 0 18 0" />
          {/* the record line */}
          <path d="M11 22 h12" strokeLinecap="round" />
          <path d="M14 26 h6" strokeLinecap="round" opacity="0.55" />
        </svg>
      );
    case "foundersbid":
      return (
        <svg {...common} fill="none" stroke="currentColor">
          <circle cx="17" cy="17" r="13" strokeWidth="2" />
          <circle cx="17" cy="17" r="9.5" strokeWidth="1.4" strokeDasharray="2.6 3.2" />
          <circle cx="17" cy="12.5" r="2.1" fill="currentColor" stroke="none" />
          <circle cx="12.6" cy="20" r="2.1" fill="currentColor" stroke="none" />
          <circle cx="21.4" cy="20" r="2.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "culturebid":
      return (
        <svg {...common} fill="none" stroke="currentColor">
          <rect x="6" y="6" width="22" height="22" rx="3" strokeWidth="2" />
          <path d="M6 12 h22" strokeWidth="1.6" />
          <path d="M11 12 L16 22 H11 Z" fill="currentColor" stroke="none" />
          <path d="M20 16 h4 M20 20 h4" strokeLinecap="round" strokeWidth="1.6" opacity="0.7" />
        </svg>
      );
    case "bidception":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="5.5" y="5.5" width="10.5" height="10.5" rx="2" fill="currentColor" stroke="none" />
          <rect x="18" y="18" width="10.5" height="10.5" rx="2" fill="currentColor" stroke="none" />
          <rect x="18" y="5.5" width="10.5" height="10.5" rx="2" />
          <rect x="5.5" y="18" width="10.5" height="10.5" rx="2" />
        </svg>
      );
  }
}

/** The shared network identity: four nodes, one filled. */
export function NetworkMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      className="shrink-0"
    >
      <rect x="3" y="3" width="6.5" height="6.5" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="12.5" y="3" width="6.5" height="6.5" rx="1.5" strokeWidth="1.5" />
      <rect x="3" y="12.5" width="6.5" height="6.5" rx="1.5" strokeWidth="1.5" />
      <rect x="12.5" y="12.5" width="6.5" height="6.5" rx="1.5" strokeWidth="1.5" />
    </svg>
  );
}
