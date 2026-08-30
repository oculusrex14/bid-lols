/**
 * RC5 §21.3: deterministic LOCAL category artwork for CultureBid objects
 * (public/sample-media/culture). No remote stock media, no Unsplash, no
 * CSP expansion. This is content artwork that frames the object
 * morphology; it never carries data (all text on a card comes from the
 * real row).
 */
export const CATEGORY_ART: Record<string, string> = {
  ugc: "/sample-media/culture/ugc.svg",
  "social content": "/sample-media/culture/ugc.svg",
  photography: "/sample-media/culture/photography.svg",
  naming: "/sample-media/culture/naming.svg",
  music: "/sample-media/culture/music.svg",
  video: "/sample-media/culture/hero-skincare.svg",
};

export const DEFAULT_CULTURE_ART = "/sample-media/culture/hero-skincare.svg";

export function artForCategory(category: string): string {
  return CATEGORY_ART[category] ?? DEFAULT_CULTURE_ART;
}
