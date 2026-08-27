/**
 * Marketplace categories per product (Phase 02, FR-2). Categories are free-form
 * text on bounties (validated, length-capped); these lists drive the creation
 * UI suggestions and filter chips. Custom categories remain allowed — the list
 * is a convenience, never a gate.
 */
import type { ProductKey } from "@/lib/host";

export const CATEGORIES: Record<ProductKey, string[]> = {
  foundersbid: [
    "development",
    "design",
    "research",
    "copy",
    "automation",
    "data",
    "marketing",
    "debugging",
    "audit",
  ],
  culturebid: [
    "ugc",
    "memes",
    "video",
    "photography",
    "illustration",
    "design",
    "naming",
    "writing",
    "social content",
    "music",
    "brand challenge",
  ],
  bidception: ["development", "design", "marketing", "research", "content", "operations"],
  bidthrone: [],
};

export function categoriesFor(productKey: ProductKey): string[] {
  return CATEGORIES[productKey] ?? [];
}