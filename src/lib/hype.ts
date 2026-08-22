/** Site-level view / visit display helpers. Counts are real — never multiplied. */

export function formatCount(n: number) {
  return Math.round(n).toLocaleString("en-US");
}
