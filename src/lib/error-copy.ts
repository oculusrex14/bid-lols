/**
 * Pure copy decisions for route-level errors (P0 #2). Kept out of
 * error-component.tsx so the component module only exports components
 * (react-refresh) and the production/dev decision is unit-testable.
 */

/**
 * Production never echoes the raw `error.message` - that line is exactly how
 * "column b.creative does not exist" reached users. Dev surfaces it.
 */
export function errorDetail(isProduction: boolean, message?: string): string {
  if (isProduction) return "Try again or contact support.";
  return message ?? "An unexpected error occurred. Try reloading the page.";
}
