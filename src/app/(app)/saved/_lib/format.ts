/**
 * Client-safe formatting helpers for saved-property addresses. Kept separate
 * from `queries.ts` (which has a top-level `import "server-only"`) because
 * both server pages and client view components need `savedPropertyAddressLine`.
 */

export type SavedPropertyAddress = {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
};

export function savedPropertyAddressLine(address: SavedPropertyAddress | null): string {
  if (!address) return "Address unavailable";
  return `${address.line1}, ${address.city}, ${address.state} ${address.postalCode}`;
}
