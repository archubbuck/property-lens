import { z } from "zod";

/**
 * Plan catalog configuration. Per SPECIFICATION.md section 1.2/2.1/18, no
 * price is hardcoded in UI components — everything here is seed/config data
 * read from the `Plan` table at runtime via `/api/v1/plans`. The dollar
 * amounts below are editable defaults (matching the provided mockups) and
 * are NOT confirmed, approved production prices; update via migration/seed
 * once business/billing-provider decisions are finalized.
 */
export const planCatalogSchema = z.object({
  tier: z.enum(["free", "explorer", "investor", "professional"]),
  name: z.string(),
  description: z.string(),
  priceCents: z.number().int().min(0),
  billingInterval: z.enum(["lifetime", "monthly"]),
  lookupAllowance: z.number().int().positive().nullable(),
  isMostPopular: z.boolean().default(false),
  sortOrder: z.number().int(),
  features: z.array(z.string()),
});
export type PlanCatalogEntry = z.infer<typeof planCatalogSchema>;

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    tier: "free",
    name: "Free",
    description: "Get started and try it out.",
    priceCents: 0,
    billingInterval: "lifetime",
    lookupAllowance: 5,
    isMostPopular: false,
    sortOrder: 0,
    features: [
      "Full property research report",
      "Public records and government data",
      "Evidence with source links",
    ],
  },
  {
    tier: "explorer",
    name: "Explorer",
    description: "For occasional research.",
    priceCents: 1900,
    billingInterval: "monthly",
    lookupAllowance: 50,
    isMostPopular: false,
    sortOrder: 1,
    features: [
      "Everything in Free",
      "Prior report history (6 months)",
      "Export reports (PDF)",
    ],
  },
  {
    tier: "investor",
    name: "Investor",
    description: "For active property investors.",
    priceCents: 3900,
    billingInterval: "monthly",
    lookupAllowance: 150,
    isMostPopular: true,
    sortOrder: 2,
    features: [
      "Everything in Explorer",
      "Priority research processing",
      "Extended report history (12 months)",
    ],
  },
  {
    tier: "professional",
    name: "Professional",
    description: "For high-volume research.",
    priceCents: 9900,
    billingInterval: "monthly",
    lookupAllowance: null,
    isMostPopular: false,
    sortOrder: 3,
    features: [
      "Everything in Investor",
      "Highest processing priority",
      "Full report history",
      "Early access to new features",
    ],
  },
];
