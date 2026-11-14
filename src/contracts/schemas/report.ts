import { z } from "zod";
import { coverageStatusSchema, severitySchema, verificationSchema } from "./common";

/**
 * UI-ready projection shapes stored on `ResearchReport` JSON columns
 * (`overview`, `ownership`, `assessment`, `zoning`, `market`, `history`,
 * `coverage`). These are read directly by the report tab API routes/pages,
 * so the shapes are intentionally flat and render-friendly. Money values are
 * stored as integer cents alongside a human-readable `formatted` string so
 * the UI never has to reformat currency. `prisma/seed.ts` parses its seed
 * data against these schemas so the seed and these contracts never drift.
 */

const moneySchema = z.object({
  cents: z.number().int(),
  formatted: z.string(),
});
export type Money = z.infer<typeof moneySchema>;

const trendDirectionSchema = z.enum(["up", "down", "flat"]);
export type TrendDirection = z.infer<typeof trendDirectionSchema>;

const percentChangeSchema = z.object({
  value: z.number(),
  formatted: z.string(),
  direction: trendDirectionSchema,
});
export type PercentChange = z.infer<typeof percentChangeSchema>;

const evidenceRefSchema = z.object({
  factId: z.string(),
  sourceName: z.string(),
  sourceUrl: z.string().nullable(),
  retrievedAt: z.string(),
});
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export const overviewReportSchema = z.object({
  headline: z.object({
    addressLine1: z.string(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    propertyType: z.string(),
    lotSizeAcres: z.number(),
    lotSizeSqFt: z.number(),
    livingAreaSqFt: z.number(),
    bedrooms: z.number(),
    bathrooms: z.number(),
    garageSpaces: z.number(),
    yearBuilt: z.number().int(),
  }),
  riskSummary: z.object({
    level: severitySchema,
    headline: z.string(),
    narrative: z.string(),
  }),
  atAGlance: z.array(
    z.object({
      icon: z.string(),
      label: z.string(),
      value: z.string(),
    }),
  ),
  parcelFacts: z.object({
    parcelNumber: z.string(),
    legalDescription: z.string(),
    jurisdiction: z.string(),
    acreage: z.number(),
  }),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    mapNote: z.string(),
  }),
  sourceCoverage: z.object({
    verifiedDomainCount: z.number().int(),
    partialDomainCount: z.number().int(),
    totalDomainCount: z.number().int(),
  }),
  nextSteps: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      href: z.string().nullable(),
    }),
  ),
});
export type OverviewReport = z.infer<typeof overviewReportSchema>;

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

export const ownershipReportSchema = z.object({
  currentOwner: z.object({
    name: z.string(),
    ownerType: z.string(),
    ownedSince: z.string(),
    ownedSinceLabel: z.string(),
  }),
  quickFacts: z.object({
    ownerOccupied: z.boolean(),
    numberOfOwners: z.number().int(),
    relatedEntities: z.number().int(),
    activeMortgage: z.boolean(),
  }),
  ownershipHistory: z.array(
    z.object({
      ownerName: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      durationLabel: z.string(),
      isCurrent: z.boolean(),
    }),
  ),
  deedRecords: z.array(
    z.object({
      documentName: z.string(),
      documentType: z.string(),
      recordedDate: z.string(),
      pages: z.number().int(),
      url: z.string().nullable(),
    }),
  ),
  relatedParties: z.object({
    found: z.boolean(),
    note: z.string(),
  }),
  mortgage: z
    .object({
      lender: z.string(),
      loanType: z.string(),
      originalAmount: moneySchema,
      recordedDate: z.string(),
      status: z.string(),
    })
    .nullable(),
});
export type OwnershipReport = z.infer<typeof ownershipReportSchema>;

// ---------------------------------------------------------------------------
// Assessment & taxes
// ---------------------------------------------------------------------------

export const assessmentReportSchema = z.object({
  currentAssessment: z.object({
    assessedValue: moneySchema,
    appraisedValue: moneySchema,
    assessmentYear: z.number().int(),
  }),
  annualTaxes: z.object({
    total: moneySchema,
    effectiveTaxRatePct: z.number(),
    effectiveTaxRateFormatted: z.string(),
  }),
  assessmentHistory: z.array(
    z.object({
      year: z.number().int(),
      assessedValue: moneySchema,
      appraisedValue: moneySchema,
    }),
  ),
  taxBreakdown: z.array(
    z.object({
      entityName: z.string(),
      ratePct: z.number(),
      rateFormatted: z.string(),
      annualTax: moneySchema,
    }),
  ),
  keyDetails: z.object({
    assessmentYear: z.number().int(),
    appraisalDistrict: z.string(),
    accountNumber: z.string(),
    legalDescription: z.string(),
    appraisalDistrictUrl: z.string().nullable(),
  }),
});
export type AssessmentReport = z.infer<typeof assessmentReportSchema>;

// ---------------------------------------------------------------------------
// Zoning & use
// ---------------------------------------------------------------------------

const zoningUseSchema = z.object({
  use: z.string(),
  status: z.enum(["permitted", "conditional", "prohibited"]),
});

export const zoningReportSchema = z.object({
  zoningAtAGlance: z.object({
    code: z.string(),
    label: z.string(),
    category: z.string(),
    jurisdiction: z.string(),
    ordinanceUrl: z.string().nullable(),
    lastUpdated: z.string(),
  }),
  summary: z.string(),
  permittedUses: z.array(zoningUseSchema),
  conditionalUses: z.array(zoningUseSchema),
  notesAndConditions: z.array(z.string()),
  nextSteps: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      href: z.string().nullable(),
    }),
  ),
});
export type ZoningReport = z.infer<typeof zoningReportSchema>;

// ---------------------------------------------------------------------------
// Market insights
// ---------------------------------------------------------------------------

export const marketReportSchema = z.object({
  summaryMetrics: z.object({
    estimatedValue: moneySchema,
    estimatedValueChange: percentChangeSchema,
    medianPricePerSqFt: moneySchema,
    medianPricePerSqFtChange: percentChangeSchema,
    medianDaysOnMarket: z.number().int(),
    medianDaysOnMarketChangeDays: z.number().int(),
    saleToListPct: z.number(),
    saleToListChangePp: z.number(),
  }),
  homeValueTrend: z.array(
    z.object({
      label: z.string(),
      value: moneySchema,
    }),
  ),
  marketSummary: z.object({
    areaLabel: z.string(),
    periodLabel: z.string(),
    medianSalePrice: moneySchema,
    medianSalePriceChange: percentChangeSchema,
    medianPricePerSqFt: moneySchema,
    medianPricePerSqFtChange: percentChangeSchema,
    medianDaysOnMarket: z.number().int(),
    medianDaysOnMarketChangeDays: z.number().int(),
    homesSold: z.number().int(),
    homesSoldChange: percentChangeSchema,
    activeInventory: z.number().int(),
    activeInventoryChange: percentChangeSchema,
    monthsOfSupply: z.number(),
    marketBalanceLabel: z.string(),
  }),
  comparableProperties: z.array(
    z.object({
      address: z.string(),
      livingAreaSqFt: z.number(),
      bedrooms: z.number(),
      bathrooms: z.number(),
      status: z.string(),
      price: moneySchema,
      eventDate: z.string(),
    }),
  ),
  keyTakeaways: z.array(z.string()),
  disclaimer: z.string(),
});
export type MarketReport = z.infer<typeof marketReportSchema>;

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export const historyReportSchema = z.object({
  atAGlance: z.object({
    totalEvents: z.number().int(),
    owners: z.number().int(),
    sales: z.number().int(),
    permits: z.number().int(),
  }),
  events: z.array(
    z.object({
      date: z.string(),
      category: z.enum(["ownership", "sale", "assessment", "tax", "permit", "zoning"]),
      title: z.string(),
      description: z.string(),
    }),
  ),
  ownershipTimeline: z.array(
    z.object({
      ownerName: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      startLabel: z.string(),
      endLabel: z.string(),
    }),
  ),
  valueHistory: z.array(
    z.object({
      year: z.number().int(),
      assessedValue: moneySchema,
      appraisedValue: moneySchema,
    }),
  ),
});
export type HistoryReport = z.infer<typeof historyReportSchema>;

// ---------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------

export const coverageReportSchema = z.object({
  domains: z.array(
    z.object({
      domain: z.string(),
      status: coverageStatusSchema,
      note: z.string().nullable(),
    }),
  ),
  methodologyNote: z.string(),
});
export type CoverageReport = z.infer<typeof coverageReportSchema>;

// ---------------------------------------------------------------------------
// Findings (ResearchFinding rows share this shape with evidenceIds referenced
// on the model, not embedded in JSON)
// ---------------------------------------------------------------------------

export const findingSchema = z.object({
  domain: z.string(),
  title: z.string(),
  explanation: z.string(),
  severity: severitySchema,
  verification: verificationSchema,
  investmentImplication: z.string().nullable(),
  recommendedAction: z.string().nullable(),
});
export type Finding = z.infer<typeof findingSchema>;

export { evidenceRefSchema, moneySchema, percentChangeSchema };
