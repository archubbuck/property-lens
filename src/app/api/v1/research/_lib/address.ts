/**
 * Address matching helpers for the research lookup flow. There is no real
 * geocoding/address-resolution integration configured in this environment
 * (see docs/operations/external-setup.md) so the only address we can
 * actually research end-to-end is the seeded demo property. Everything else
 * runs the full simulated stage sequence and lands on an honest "not yet
 * available" outcome rather than fabricating a report.
 */

export const SAMPLE_ADDRESS = "12814 Willow Creek Dr, Fulshear, TX 77441";

const DEMO_MATCH_TOKENS = ["willow creek", "fulshear"];

export function normalizeAddressInput(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Case-insensitive partial match against the seeded demo property's address. */
export function isDemoAddress(value: string): boolean {
  const normalized = normalizeAddressInput(value);
  return DEMO_MATCH_TOKENS.every((token) => normalized.includes(token));
}

/** Builds a stable, unique-ish key for deduping PropertyAddress rows for arbitrary input. */
export function slugifyAddress(value: string): string {
  return normalizeAddressInput(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ParsedAddress = {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
};

/**
 * Best-effort parse of a free-text "line1, city, ST zip" address. This is
 * only used to populate placeholder Property/PropertyAddress rows for
 * arbitrary (non-demo) lookups that never produce a real report, so a loose
 * parse is acceptable — the user never sees a fabricated report built from
 * it.
 */
export function parseFreeTextAddress(value: string): ParsedAddress {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  const line1 = parts[0] || value.trim();
  const city = parts[1] || "Unknown";
  const stateZip = parts[2] || "";
  const match = stateZip.match(/([A-Za-z]{2})\s*(\d{5})?/);
  const state = match?.[1]?.toUpperCase() || "NA";
  const postalCode = match?.[2] || "00000";
  return { line1, city, state, postalCode };
}
