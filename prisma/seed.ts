/**
 * Idempotent database seed for PropertyLens local/dev Postgres.
 *
 * Run with `npx tsx prisma/seed.ts` or `npm run db:seed`. Prisma's own
 * `prisma db seed` hook (configured in package.json) also points here.
 *
 * Seeds (see SPECIFICATION.md sections 6, 7, and 12):
 *  1. Plan catalog (from src/server/domains/billing/plans.ts)
 *  2. PublicDataSource registry entries used by the curated demo property
 *  3. Fort Bend County, TX and City of Fulshear, TX jurisdictions
 *  4. The curated demo property — 12814 Willow Creek Dr, Fulshear, TX 77441
 *     (Property, PropertyAddress, Parcel, ParcelPropertyLink, isDemoSample)
 *  5. EvidenceDocument + EvidenceFact rows backing every figure in the six
 *     report mockups (ownership, assessment, zoning, market, history)
 *  6. A completed, sample ResearchRun + ResearchStage + ResearchReport +
 *     ResearchFinding + CoverageAssessment rows whose JSON projections are
 *     validated against src/contracts/schemas/report.ts at seed time
 *  7. Help & Support content (topics + articles) for the four Help topics
 *
 * Everything below uses `upsert` on natural keys so re-running this script
 * is safe and does not create duplicate rows.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { PLAN_CATALOG } from "../src/server/domains/billing/plans";
import {
  assessmentReportSchema,
  coverageReportSchema,
  historyReportSchema,
  marketReportSchema,
  overviewReportSchema,
  ownershipReportSchema,
  zoningReportSchema,
  type AssessmentReport,
  type CoverageReport,
  type Finding,
  type HistoryReport,
  type MarketReport,
  type OverviewReport,
  type OwnershipReport,
  type ZoningReport,
} from "../src/contracts/schemas/report";

const prisma = new PrismaClient();

function usd(cents: number): string {
  return cents.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

function pct(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function direction(value: number): "up" | "down" | "flat" {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

// ---------------------------------------------------------------------------
// 1. Plan catalog
// ---------------------------------------------------------------------------

async function seedPlans() {
  for (const plan of PLAN_CATALOG) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: {
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        billingInterval: plan.billingInterval,
        lookupAllowance: plan.lookupAllowance,
        isMostPopular: plan.isMostPopular,
        sortOrder: plan.sortOrder,
        features: plan.features,
        active: true,
      },
      create: {
        tier: plan.tier,
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        billingInterval: plan.billingInterval,
        lookupAllowance: plan.lookupAllowance,
        isMostPopular: plan.isMostPopular,
        sortOrder: plan.sortOrder,
        features: plan.features,
      },
    });
  }
  return PLAN_CATALOG.length;
}

// ---------------------------------------------------------------------------
// 2. Public data source registry
// ---------------------------------------------------------------------------

type SourceSeed = {
  key: string;
  name: string;
  domain: string;
  jurisdictionScope: string | null;
  licenseNote: string;
  rateLimitPerMinute?: number;
};

const PUBLIC_DATA_SOURCES: SourceSeed[] = [
  {
    key: "census-geocoder",
    name: "U.S. Census Bureau Geocoding Services",
    domain: "address",
    jurisdictionScope: null,
    licenseNote:
      "U.S. federal government work product, public domain under 17 U.S.C. §105. Free for commercial use; attribute as 'U.S. Census Bureau' and respect published rate limits.",
    rateLimitPerMinute: 60,
  },
  {
    key: "fort-bend-assessor-gis",
    name: "Fort Bend County Assessor/GIS Parcel Services",
    domain: "parcel",
    jurisdictionScope: "Fort Bend County, TX",
    licenseNote:
      "Public county GIS parcel data published for public reference. Free to view and reuse with attribution to Fort Bend County GIS; commercial redistribution of bulk exports requires reviewing the county's open-data terms.",
  },
  {
    key: "fort-bend-recorder-clerk",
    name: "Fort Bend County Clerk — Official Public Records",
    domain: "ownership",
    jurisdictionScope: "Fort Bend County, TX",
    licenseNote:
      "Recorded instruments (deeds, liens, releases) are public records under Texas Government Code Chapter 552. Copies may carry per-page fees at the source; cached facts here are summaries, not certified copies.",
  },
  {
    key: "fema-nfhl",
    name: "FEMA National Flood Hazard Layer (NFHL)",
    domain: "flood",
    jurisdictionScope: null,
    licenseNote:
      "U.S. federal government work product, public domain. Attribute as 'FEMA National Flood Hazard Layer'; map panels have defined effective dates and known coverage gaps.",
    rateLimitPerMinute: 30,
  },
  {
    key: "usfws-nwi",
    name: "U.S. Fish & Wildlife Service National Wetlands Inventory (NWI)",
    domain: "wetlands",
    jurisdictionScope: null,
    licenseNote:
      "U.S. federal government work product, public domain. Attribute as 'USFWS National Wetlands Inventory'; inventory status is not a legal jurisdictional determination.",
  },
  {
    key: "usgs-3dep",
    name: "USGS 3D Elevation Program (3DEP)",
    domain: "elevation",
    jurisdictionScope: null,
    licenseNote:
      "U.S. federal government work product, public domain. Attribute as 'USGS 3DEP'; resolution and coverage vary by region and acquisition date.",
  },
  {
    key: "usda-nrcs-ssurgo",
    name: "USDA NRCS Soil Survey Geographic Database (SSURGO)",
    domain: "soil",
    jurisdictionScope: null,
    licenseNote:
      "U.S. federal government work product, public domain. Attribute as 'USDA NRCS Web Soil Survey'; survey gaps exist and results are not a substitute for a site-specific geotechnical study.",
  },
  {
    key: "epa-echo-envirofacts",
    name: "EPA ECHO & Envirofacts",
    domain: "environmental",
    jurisdictionScope: null,
    licenseNote:
      "U.S. federal government work product, public domain. Attribute as 'EPA ECHO / Envirofacts'; absence of a compliance or cleanup record is not proof of absence of contamination.",
    rateLimitPerMinute: 30,
  },
  {
    key: "fbcad",
    name: "Fort Bend Central Appraisal District (FBCAD)",
    domain: "taxes",
    jurisdictionScope: "Fort Bend County, TX",
    licenseNote:
      "Public appraisal roll data published by FBCAD under Texas Property Tax Code Chapter 25. Free for public and research use with attribution; assessed value is not a market appraisal.",
  },
  {
    key: "city-fulshear-planning",
    name: "City of Fulshear Planning & Development Services",
    domain: "zoning",
    jurisdictionScope: "City of Fulshear, TX",
    licenseNote:
      "Public zoning maps and ordinances published by the City of Fulshear. Free to view and cite with attribution; ordinance text controls over any summarized interpretation here.",
  },
  {
    key: "lamar-cisd",
    name: "Lamar Consolidated Independent School District (Tax Office)",
    domain: "taxes",
    jurisdictionScope: "Lamar CISD, TX",
    licenseNote:
      "Public school district tax rate adopted under Texas Tax Code Chapter 26. Free to cite with attribution to Lamar CISD; rates are adopted annually and subject to change.",
  },
  {
    key: "fort-bend-tax-office",
    name: "Fort Bend County Tax Assessor-Collector",
    domain: "taxes",
    jurisdictionScope: "Fort Bend County, TX",
    licenseNote:
      "Public consolidated tax statement data published by the county tax office. Free for public and research use with attribution; the office is the authoritative source for amounts due/paid.",
  },
  {
    key: "fort-bend-mud-218",
    name: "Fort Bend County Municipal Utility District #218",
    domain: "taxes",
    jurisdictionScope: "Fort Bend MUD #218, TX",
    licenseNote:
      "Public special-district tax rate adopted under Texas Water Code and Tax Code provisions. Free to cite with attribution to Fort Bend MUD #218; rates are adopted annually.",
  },
];

async function seedPublicDataSources(): Promise<Record<string, string>> {
  const idByKey: Record<string, string> = {};
  for (const source of PUBLIC_DATA_SOURCES) {
    const row = await prisma.publicDataSource.upsert({
      where: { key: source.key },
      update: {
        name: source.name,
        domain: source.domain,
        jurisdictionScope: source.jurisdictionScope,
        licenseNote: source.licenseNote,
        attributionRequired: true,
        rateLimitPerMinute: source.rateLimitPerMinute ?? null,
        healthStatus: "healthy",
        lastCheckedAt: new Date(),
      },
      create: {
        key: source.key,
        name: source.name,
        domain: source.domain,
        jurisdictionScope: source.jurisdictionScope,
        licenseNote: source.licenseNote,
        attributionRequired: true,
        rateLimitPerMinute: source.rateLimitPerMinute ?? null,
        healthStatus: "healthy",
        lastCheckedAt: new Date(),
      },
    });
    idByKey[source.key] = row.id;
  }
  return idByKey;
}

// ---------------------------------------------------------------------------
// 3. Jurisdictions
// ---------------------------------------------------------------------------

async function seedJurisdictions() {
  const fortBendCounty = await upsertJurisdiction("Fort Bend County", "county", "TX", "48157");
  const cityOfFulshear = await upsertJurisdiction("City of Fulshear", "city", "TX", null);
  return { fortBendCounty, cityOfFulshear };
}

async function upsertJurisdiction(
  name: string,
  level: string,
  state: string,
  fipsCode: string | null,
) {
  const existing = await prisma.jurisdiction.findFirst({ where: { name, level, state } });
  if (existing) {
    return prisma.jurisdiction.update({
      where: { id: existing.id },
      data: { fipsCode },
    });
  }
  return prisma.jurisdiction.create({
    data: { name, level, state, fipsCode },
  });
}

// ---------------------------------------------------------------------------
// 4. Demo property: 12814 Willow Creek Dr, Fulshear, TX 77441
// ---------------------------------------------------------------------------

const DEMO_ADDRESS = {
  line1: "12814 Willow Creek Dr",
  city: "Fulshear",
  state: "TX",
  postalCode: "77441",
  latitude: 29.6897,
  longitude: -95.9041,
};
const DEMO_NORMALIZED_KEY = "12814-willow-creek-dr-fulshear-tx-77441";
const DEMO_PARCEL_NUMBER = "R448733";
const DEMO_LEGAL_DESCRIPTION = "Willow Creek Sec 3, Block 2, Lot 15";

async function seedDemoProperty(fortBendCountyId: string) {
  let property = await prisma.property.findFirst({ where: { isDemoSample: true } });
  const propertyData = {
    propertyType: "single_family_residential",
    primaryUse: "Single-family residential",
    lotSizeAcres: 0.28,
    lotSizeSqFt: 12371,
    livingAreaSqFt: 3428,
    bedrooms: 4,
    bathrooms: 3.5,
    garageSpaces: 2,
    yearBuilt: 2019,
    isDemoSample: true,
  };
  if (property) {
    property = await prisma.property.update({ where: { id: property.id }, data: propertyData });
  } else {
    property = await prisma.property.create({ data: propertyData });
  }

  await prisma.propertyAddress.upsert({
    where: { normalizedKey: DEMO_NORMALIZED_KEY },
    update: {
      propertyId: property.id,
      line1: DEMO_ADDRESS.line1,
      city: DEMO_ADDRESS.city,
      state: DEMO_ADDRESS.state,
      postalCode: DEMO_ADDRESS.postalCode,
      latitude: DEMO_ADDRESS.latitude,
      longitude: DEMO_ADDRESS.longitude,
      isPrimary: true,
    },
    create: {
      propertyId: property.id,
      line1: DEMO_ADDRESS.line1,
      city: DEMO_ADDRESS.city,
      state: DEMO_ADDRESS.state,
      postalCode: DEMO_ADDRESS.postalCode,
      latitude: DEMO_ADDRESS.latitude,
      longitude: DEMO_ADDRESS.longitude,
      isPrimary: true,
      normalizedKey: DEMO_NORMALIZED_KEY,
    },
  });

  const parcel = await prisma.parcel.upsert({
    where: {
      jurisdictionId_parcelNumber: {
        jurisdictionId: fortBendCountyId,
        parcelNumber: DEMO_PARCEL_NUMBER,
      },
    },
    update: {
      legalDescription: DEMO_LEGAL_DESCRIPTION,
      acreage: 0.28,
      sourceUrl: "https://esearch.fbcad.org/Property/View/R448733",
    },
    create: {
      jurisdictionId: fortBendCountyId,
      parcelNumber: DEMO_PARCEL_NUMBER,
      legalDescription: DEMO_LEGAL_DESCRIPTION,
      acreage: 0.28,
      sourceUrl: "https://esearch.fbcad.org/Property/View/R448733",
    },
  });

  await prisma.parcelPropertyLink.upsert({
    where: { propertyId_parcelId: { propertyId: property.id, parcelId: parcel.id } },
    update: { isPrimary: true },
    create: { propertyId: property.id, parcelId: parcel.id, isPrimary: true },
  });

  return property;
}

// ---------------------------------------------------------------------------
// 5. Evidence documents + facts
// ---------------------------------------------------------------------------

type DocSeed = {
  key: string;
  sourceKey: string;
  title: string;
  documentType: string;
  url: string | null;
  pageCount: number | null;
  recordedAt: string | null;
};

const DOCUMENTS: DocSeed[] = [
  {
    key: "warranty-deed-2019",
    sourceKey: "fort-bend-recorder-clerk",
    title: "Warranty Deed",
    documentType: "deed",
    url: "https://countyclerk.fortbendcountytx.gov/records/2019-0715-WD-448733",
    pageCount: 6,
    recordedAt: "2019-07-15",
  },
  {
    key: "deed-of-trust-2019",
    sourceKey: "fort-bend-recorder-clerk",
    title: "Deed of Trust",
    documentType: "deed",
    url: "https://countyclerk.fortbendcountytx.gov/records/2019-0715-DOT-448733",
    pageCount: 12,
    recordedAt: "2019-07-15",
  },
  {
    key: "release-of-lien-2016",
    sourceKey: "fort-bend-recorder-clerk",
    title: "Release of Lien",
    documentType: "deed",
    url: "https://countyclerk.fortbendcountytx.gov/records/2016-0310-ROL-448733",
    pageCount: 4,
    recordedAt: "2016-03-10",
  },
  {
    key: "zoning-confirmation-2019",
    sourceKey: "city-fulshear-planning",
    title: "Zoning Confirmation Letter",
    documentType: "ordinance_section",
    url: "https://www.fulsheartexas.gov/planning/zoning-confirmations/R448733",
    pageCount: 1,
    recordedAt: "2019-01-08",
  },
  {
    key: "building-permit-2019",
    sourceKey: "city-fulshear-planning",
    title: "Building Permit — Single-Family Residence",
    documentType: "permit",
    url: "https://www.fulsheartexas.gov/permits/BP-2019-00548",
    pageCount: 3,
    recordedAt: "2019-03-18",
  },
  {
    key: "certificate-of-occupancy-2019",
    sourceKey: "city-fulshear-planning",
    title: "Certificate of Occupancy",
    documentType: "permit",
    url: "https://www.fulsheartexas.gov/permits/CO-2019-00412",
    pageCount: 1,
    recordedAt: "2019-06-10",
  },
  {
    key: "assessment-notice-2025",
    sourceKey: "fbcad",
    title: "2025 Notice of Appraised Value",
    documentType: "assessment_notice",
    url: "https://esearch.fbcad.org/Property/View/R448733",
    pageCount: 2,
    recordedAt: "2025-04-15",
  },
];

type FactSeed = {
  field: string;
  domain: string;
  value: Prisma.InputJsonValue;
  sourceKey: string;
  documentKey?: string;
  sourceUrl?: string;
  retrievedAt: string;
  effectiveDate?: string;
  caveats?: string[];
};

const FACTS: FactSeed[] = [
  // Ownership
  {
    field: "currentOwner.name",
    domain: "ownership",
    value: "Willow Creek Holdings, LLC",
    sourceKey: "fort-bend-recorder-clerk",
    documentKey: "warranty-deed-2019",
    effectiveDate: "2019-07-15",
    retrievedAt: "2026-03-12",
  },
  {
    field: "currentOwner.ownerType",
    domain: "ownership",
    value: "Limited Liability Company (LLC)",
    sourceKey: "fort-bend-recorder-clerk",
    documentKey: "warranty-deed-2019",
    effectiveDate: "2019-07-15",
    retrievedAt: "2026-03-12",
  },
  {
    field: "currentOwner.ownedSince",
    domain: "ownership",
    value: "2019-07-15",
    sourceKey: "fort-bend-recorder-clerk",
    documentKey: "warranty-deed-2019",
    effectiveDate: "2019-07-15",
    retrievedAt: "2026-03-12",
  },
  {
    field: "ownershipHistory.priorOwner.taylorMorganReeves",
    domain: "ownership",
    value: { name: "Taylor & Morgan Reeves", startDate: "2016-03-10", endDate: "2019-07-15" },
    sourceKey: "fort-bend-recorder-clerk",
    documentKey: "warranty-deed-2019",
    retrievedAt: "2026-03-12",
  },
  {
    field: "ownershipHistory.priorOwner.lakesideDevelopment",
    domain: "ownership",
    value: {
      name: "Lakeside Development, Inc.",
      startDate: "2013-08-22",
      endDate: "2016-03-10",
    },
    sourceKey: "fort-bend-recorder-clerk",
    documentKey: "release-of-lien-2016",
    retrievedAt: "2026-03-12",
  },
  {
    field: "mortgage.lender",
    domain: "ownership",
    value: "Lone Star National Bank",
    sourceKey: "fort-bend-recorder-clerk",
    documentKey: "deed-of-trust-2019",
    effectiveDate: "2019-07-15",
    retrievedAt: "2026-03-12",
  },
  {
    field: "mortgage.originalAmountCents",
    domain: "ownership",
    value: 54800000,
    sourceKey: "fort-bend-recorder-clerk",
    documentKey: "deed-of-trust-2019",
    effectiveDate: "2019-07-15",
    retrievedAt: "2026-03-12",
    caveats: ["Reflects original loan amount at recording; current balance is not a public record."],
  },
  {
    field: "mortgage.loanType",
    domain: "ownership",
    value: "Conventional",
    sourceKey: "fort-bend-recorder-clerk",
    documentKey: "deed-of-trust-2019",
    effectiveDate: "2019-07-15",
    retrievedAt: "2026-03-12",
  },
  {
    field: "quickFacts.ownerOccupied",
    domain: "ownership",
    value: false,
    sourceKey: "fbcad",
    effectiveDate: "2025-04-15",
    retrievedAt: "2026-03-12",
    caveats: ["Based on absence of a homestead exemption on the current appraisal roll."],
  },
  {
    field: "quickFacts.numberOfOwners",
    domain: "ownership",
    value: 1,
    sourceKey: "fort-bend-recorder-clerk",
    retrievedAt: "2026-03-12",
  },
  {
    field: "quickFacts.relatedEntities",
    domain: "ownership",
    value: 0,
    sourceKey: "fort-bend-recorder-clerk",
    retrievedAt: "2026-03-12",
    caveats: ["No linked entities or additional ownership records were found for this owner name."],
  },
  // Assessment & taxes
  {
    field: "assessment.2021.assessedValueCents",
    domain: "assessment",
    value: 51200000,
    sourceKey: "fbcad",
    effectiveDate: "2021-01-01",
    retrievedAt: "2026-03-12",
    caveats: ["Assessed value is not a market appraisal."],
  },
  {
    field: "assessment.2022.assessedValueCents",
    domain: "assessment",
    value: 56500000,
    sourceKey: "fbcad",
    effectiveDate: "2022-01-01",
    retrievedAt: "2026-03-12",
    caveats: ["Assessed value is not a market appraisal."],
  },
  {
    field: "assessment.2023.assessedValueCents",
    domain: "assessment",
    value: 61400000,
    sourceKey: "fbcad",
    effectiveDate: "2023-01-01",
    retrievedAt: "2026-03-12",
    caveats: ["Assessed value is not a market appraisal."],
  },
  {
    field: "assessment.2024.assessedValueCents",
    domain: "assessment",
    value: 66800000,
    sourceKey: "fbcad",
    effectiveDate: "2024-01-01",
    retrievedAt: "2026-03-12",
    caveats: ["Assessed value is not a market appraisal."],
  },
  {
    field: "assessment.2025.assessedValueCents",
    domain: "assessment",
    value: 72100000,
    sourceKey: "fbcad",
    documentKey: "assessment-notice-2025",
    effectiveDate: "2025-01-01",
    retrievedAt: "2026-03-12",
    caveats: ["Assessed value is not a market appraisal."],
  },
  {
    field: "assessment.2025.appraisedValueCents",
    domain: "assessment",
    value: 72100000,
    sourceKey: "fbcad",
    documentKey: "assessment-notice-2025",
    effectiveDate: "2025-01-01",
    retrievedAt: "2026-03-12",
    caveats: ["Assessed value is not a market appraisal."],
  },
  {
    field: "taxes.2025.annualTotalCents",
    domain: "assessment",
    value: 1441200,
    sourceKey: "fort-bend-tax-office",
    effectiveDate: "2025-01-01",
    retrievedAt: "2026-03-12",
  },
  {
    field: "taxes.2025.effectiveTaxRatePct",
    domain: "assessment",
    value: 1.998,
    sourceKey: "fort-bend-tax-office",
    effectiveDate: "2025-01-01",
    retrievedAt: "2026-03-12",
    caveats: ["Effective rate is calculated as total annual tax divided by assessed value."],
  },
  {
    field: "taxes.2025.entity.lamarCisd",
    domain: "assessment",
    value: { entityName: "Lamar CISD", ratePct: 1.2069, annualTaxCents: 870534 },
    sourceKey: "lamar-cisd",
    effectiveDate: "2025-01-01",
    retrievedAt: "2026-03-12",
  },
  {
    field: "taxes.2025.entity.fortBendCounty",
    domain: "assessment",
    value: { entityName: "Fort Bend County", ratePct: 0.3987, annualTaxCents: 287465 },
    sourceKey: "fort-bend-tax-office",
    effectiveDate: "2025-01-01",
    retrievedAt: "2026-03-12",
  },
  {
    field: "taxes.2025.entity.cityOfFulshear",
    domain: "assessment",
    value: { entityName: "City of Fulshear", ratePct: 0.28, annualTaxCents: 201880 },
    sourceKey: "fort-bend-tax-office",
    effectiveDate: "2025-01-01",
    retrievedAt: "2026-03-12",
  },
  {
    field: "taxes.2025.entity.fortBendMud218",
    domain: "assessment",
    value: { entityName: "Fort Bend MUD #218", ratePct: 0.1124, annualTaxCents: 81121 },
    sourceKey: "fort-bend-mud-218",
    effectiveDate: "2025-01-01",
    retrievedAt: "2026-03-12",
  },
  // Zoning & use
  {
    field: "zoning.code",
    domain: "zoning",
    value: "R-1",
    sourceKey: "city-fulshear-planning",
    documentKey: "zoning-confirmation-2019",
    effectiveDate: "2019-01-08",
    retrievedAt: "2026-03-12",
  },
  {
    field: "zoning.label",
    domain: "zoning",
    value: "Low-Density Residential",
    sourceKey: "city-fulshear-planning",
    documentKey: "zoning-confirmation-2019",
    effectiveDate: "2019-01-08",
    retrievedAt: "2026-03-12",
  },
  {
    field: "zoning.permittedUses",
    domain: "zoning",
    value: [
      "Single-family dwelling",
      "Accessory structure (e.g., shed, detached garage)",
      "Fences and walls",
      "Home occupation (limited)",
      "Swimming pool (private)",
    ],
    sourceKey: "city-fulshear-planning",
    sourceUrl: "https://www.fulsheartexas.gov/government/departments/planning/zoning-ordinance",
    effectiveDate: "2026-03-12",
    retrievedAt: "2026-03-12",
  },
  {
    field: "zoning.conditionalUses",
    domain: "zoning",
    value: ["Child day care (home-based)", "Community residential facility (small)"],
    sourceKey: "city-fulshear-planning",
    sourceUrl: "https://www.fulsheartexas.gov/government/departments/planning/zoning-ordinance",
    effectiveDate: "2026-03-12",
    retrievedAt: "2026-03-12",
    caveats: ["Conditional uses require a permit and additional planning review before approval."],
  },
  // Market
  {
    field: "market.estimatedValueCents",
    domain: "market",
    value: 72100000,
    sourceKey: "fbcad",
    effectiveDate: "2026-03-12",
    retrievedAt: "2026-03-12",
    caveats: [
      "Estimated value is a model-assisted calculation derived from assessed value and recent comparable sales, not an appraisal.",
    ],
  },
  {
    field: "market.estimatedValueYoYPct",
    domain: "market",
    value: 6.3,
    sourceKey: "fbcad",
    effectiveDate: "2026-03-12",
    retrievedAt: "2026-03-12",
    caveats: ["Year-over-year change computed from assessed value at the same date one year prior."],
  },
  {
    field: "market.comp.12802WillowCreekDr",
    domain: "market",
    value: {
      address: "12802 Willow Creek Dr, Fulshear, TX 77441",
      livingAreaSqFt: 3389,
      bedrooms: 4,
      bathrooms: 3,
      status: "Sold",
      priceCents: 73000000,
      eventDate: "2026-10-18",
    },
    sourceKey: "fort-bend-recorder-clerk",
    retrievedAt: "2026-11-01",
    caveats: [
      "Confirmed arm's-length sale on the same street; parcel size and transaction type verified before comparison.",
    ],
  },
  {
    field: "market.comp.12796WillowCreekDr",
    domain: "market",
    value: {
      address: "12796 Willow Creek Dr, Fulshear, TX 77441",
      livingAreaSqFt: 3502,
      bedrooms: 4,
      bathrooms: 3,
      status: "Sold",
      priceCents: 72500000,
      eventDate: "2026-10-02",
    },
    sourceKey: "fort-bend-recorder-clerk",
    retrievedAt: "2026-11-01",
    caveats: [
      "Confirmed arm's-length sale on the same street; parcel size and transaction type verified before comparison.",
    ],
  },
  {
    field: "market.comp.12836WillowCreekDr",
    domain: "market",
    value: {
      address: "12836 Willow Creek Dr, Fulshear, TX 77441",
      livingAreaSqFt: 3427,
      bedrooms: 4,
      bathrooms: 3,
      status: "Sold",
      priceCents: 71800000,
      eventDate: "2026-09-20",
    },
    sourceKey: "fort-bend-recorder-clerk",
    retrievedAt: "2026-11-01",
    caveats: [
      "Confirmed arm's-length sale on the same street; parcel size and transaction type verified before comparison.",
    ],
  },
  // History
  {
    field: "history.event.zoningConfirmation",
    domain: "history",
    value: {
      date: "2019-01-08",
      title: "Zoning Confirmation",
      description: "Confirmed R-1 (Low-Density Residential).",
    },
    sourceKey: "city-fulshear-planning",
    documentKey: "zoning-confirmation-2019",
    effectiveDate: "2019-01-08",
    retrievedAt: "2026-03-12",
  },
  {
    field: "history.event.buildingPermit",
    domain: "history",
    value: {
      date: "2019-03-18",
      title: "Building Permit Issued",
      description: "Permit for single-family residence (3,428 sq ft).",
    },
    sourceKey: "city-fulshear-planning",
    documentKey: "building-permit-2019",
    effectiveDate: "2019-03-18",
    retrievedAt: "2026-03-12",
  },
  {
    field: "history.event.certificateOfOccupancy",
    domain: "history",
    value: {
      date: "2019-06-10",
      title: "Certificate of Occupancy",
      description: "Final CO issued (New Residential Construction).",
    },
    sourceKey: "city-fulshear-planning",
    documentKey: "certificate-of-occupancy-2019",
    effectiveDate: "2019-06-10",
    retrievedAt: "2026-03-12",
  },
  {
    field: "history.event.propertySold",
    domain: "history",
    value: {
      date: "2019-07-15",
      title: "Property Sold",
      description: "Sold for $548,000 to Willow Creek Holdings, LLC.",
    },
    sourceKey: "fort-bend-recorder-clerk",
    documentKey: "warranty-deed-2019",
    effectiveDate: "2019-07-15",
    retrievedAt: "2026-03-12",
  },
  {
    field: "history.event.ownershipTransfer",
    domain: "history",
    value: {
      date: "2019-07-15",
      title: "Ownership Transfer",
      description: "Ownership transferred to Willow Creek Holdings, LLC.",
    },
    sourceKey: "fort-bend-recorder-clerk",
    documentKey: "warranty-deed-2019",
    effectiveDate: "2019-07-15",
    retrievedAt: "2026-03-12",
  },
  {
    field: "history.event.taxRecordUpdated",
    domain: "history",
    value: {
      date: "2024-08-03",
      title: "Tax Record Updated",
      description: "Annual property tax of $14,412 recorded.",
    },
    sourceKey: "fort-bend-tax-office",
    effectiveDate: "2024-08-03",
    retrievedAt: "2026-03-12",
  },
  {
    field: "history.event.assessmentUpdated",
    domain: "history",
    value: {
      date: "2026-03-12",
      title: "Assessment Updated",
      description: "Assessed value set to $721,000 (+6.3% YoY).",
    },
    sourceKey: "fbcad",
    documentKey: "assessment-notice-2025",
    effectiveDate: "2026-03-12",
    retrievedAt: "2026-03-12",
  },
];

async function seedEvidence(propertyId: string, sourceIdByKey: Record<string, string>) {
  const documentIdByKey: Record<string, string> = {};
  for (const doc of DOCUMENTS) {
    const sourceId = sourceIdByKey[doc.sourceKey];
    if (!sourceId) throw new Error(`Unknown source key: ${doc.sourceKey}`);
    const existing = await prisma.evidenceDocument.findFirst({
      where: { propertyId, sourceId, title: doc.title },
    });
    const data = {
      propertyId,
      sourceId,
      title: doc.title,
      documentType: doc.documentType,
      url: doc.url,
      pageCount: doc.pageCount,
      recordedAt: doc.recordedAt ? new Date(doc.recordedAt) : null,
    };
    const row = existing
      ? await prisma.evidenceDocument.update({ where: { id: existing.id }, data })
      : await prisma.evidenceDocument.create({ data });
    documentIdByKey[doc.key] = row.id;
  }

  for (const fact of FACTS) {
    const sourceId = sourceIdByKey[fact.sourceKey];
    if (!sourceId) throw new Error(`Unknown source key: ${fact.sourceKey}`);
    const documentId = fact.documentKey ? documentIdByKey[fact.documentKey] : null;
    const existing = await prisma.evidenceFact.findFirst({
      where: { propertyId, field: fact.field, domain: fact.domain },
    });
    const data = {
      propertyId,
      field: fact.field,
      domain: fact.domain,
      value: fact.value,
      sourceId,
      documentId,
      sourceUrl: fact.sourceUrl ?? null,
      retrievedAt: new Date(fact.retrievedAt),
      effectiveDate: fact.effectiveDate ? new Date(fact.effectiveDate) : null,
      verification: "verified" as const,
      caveats: fact.caveats ?? [],
    };
    if (existing) {
      await prisma.evidenceFact.update({ where: { id: existing.id }, data });
    } else {
      await prisma.evidenceFact.create({ data });
    }
  }

  return { documentCount: DOCUMENTS.length, factCount: FACTS.length };
}

// ---------------------------------------------------------------------------
// 6. Research run, stages, report, findings, coverage
// ---------------------------------------------------------------------------

function buildOverview(): OverviewReport {
  return overviewReportSchema.parse({
    headline: {
      addressLine1: DEMO_ADDRESS.line1,
      city: DEMO_ADDRESS.city,
      state: DEMO_ADDRESS.state,
      postalCode: DEMO_ADDRESS.postalCode,
      propertyType: "Single-Family Residential",
      lotSizeAcres: 0.28,
      lotSizeSqFt: 12371,
      livingAreaSqFt: 3428,
      bedrooms: 4,
      bathrooms: 3.5,
      garageSpaces: 2,
      yearBuilt: 2019,
    },
    riskSummary: {
      level: "low",
      headline: "Low Risk",
      narrative:
        "A well-documented, owner-of-record single-family home in a planned Fulshear subdivision. Zoning, ownership, and tax records are all current and consistent, with no unresolved red flags found in available public records.",
    },
    atAGlance: [
      { icon: "home", label: "Property Type", value: "Single-Family Residential" },
      { icon: "ruler", label: "Lot Size", value: "0.28 ac (12,371 sq ft)" },
      { icon: "layers", label: "Living Area", value: "3,428 sq ft" },
      { icon: "calendar", label: "Year Built", value: "2019" },
      { icon: "map", label: "Zoning", value: "R-1 (Low-Density Residential)" },
      { icon: "shield", label: "Flood Zone", value: "Not in mapped 100-year floodplain" },
    ],
    parcelFacts: {
      parcelNumber: DEMO_PARCEL_NUMBER,
      legalDescription: DEMO_LEGAL_DESCRIPTION,
      jurisdiction: "Fort Bend County, TX",
      acreage: 0.28,
    },
    location: {
      latitude: DEMO_ADDRESS.latitude,
      longitude: DEMO_ADDRESS.longitude,
      mapNote: "Located within the Willow Creek subdivision, City of Fulshear ETJ.",
    },
    sourceCoverage: {
      verifiedDomainCount: 5,
      partialDomainCount: 4,
      totalDomainCount: 9,
    },
    nextSteps: [
      {
        title: "Review the full zoning ordinance",
        description: "See complete regulations and definitions for the R-1 district.",
        href: "https://www.fulsheartexas.gov/government/departments/planning/zoning-ordinance",
      },
      {
        title: "Confirm your intended use",
        description: "Ensure it aligns with R-1 requirements before making decisions.",
        href: null,
      },
      {
        title: "Contact the planning department",
        description: "Get clarification or request a pre-application meeting.",
        href: "https://www.fulsheartexas.gov/government/departments/planning",
      },
    ],
  });
}

function buildOwnership(): OwnershipReport {
  return ownershipReportSchema.parse({
    currentOwner: {
      name: "Willow Creek Holdings, LLC",
      ownerType: "Limited Liability Company (LLC)",
      ownedSince: "2019-07-15",
      ownedSinceLabel: "Jul 15, 2019 (6 yrs, 8 mos)",
    },
    quickFacts: {
      ownerOccupied: false,
      numberOfOwners: 1,
      relatedEntities: 0,
      activeMortgage: true,
    },
    ownershipHistory: [
      {
        ownerName: "Willow Creek Holdings, LLC",
        startDate: "2019-07-15",
        endDate: null,
        durationLabel: "Jul 15, 2019 – Present",
        isCurrent: true,
      },
      {
        ownerName: "Taylor & Morgan Reeves",
        startDate: "2016-03-10",
        endDate: "2019-07-15",
        durationLabel: "Mar 10, 2016 – Jul 15, 2019 (2 yrs, 4 mos)",
        isCurrent: false,
      },
      {
        ownerName: "Lakeside Development, Inc.",
        startDate: "2013-08-22",
        endDate: "2016-03-10",
        durationLabel: "Aug 22, 2013 – Mar 10, 2016 (2 yrs, 7 mos)",
        isCurrent: false,
      },
    ],
    deedRecords: [
      {
        documentName: "Warranty Deed",
        documentType: "Deed",
        recordedDate: "2019-07-15",
        pages: 6,
        url: "https://countyclerk.fortbendcountytx.gov/records/2019-0715-WD-448733",
      },
      {
        documentName: "Deed of Trust",
        documentType: "Mortgage",
        recordedDate: "2019-07-15",
        pages: 12,
        url: "https://countyclerk.fortbendcountytx.gov/records/2019-0715-DOT-448733",
      },
      {
        documentName: "Release of Lien",
        documentType: "Release",
        recordedDate: "2016-03-10",
        pages: 4,
        url: "https://countyclerk.fortbendcountytx.gov/records/2016-0310-ROL-448733",
      },
    ],
    relatedParties: {
      found: false,
      note:
        "We didn't find any linked entities, officers, or additional ownership records for this property.",
    },
    mortgage: {
      lender: "Lone Star National Bank",
      loanType: "Conventional",
      originalAmount: { cents: 54800000, formatted: usd(54800000) },
      recordedDate: "2019-07-15",
      status: "Active",
    },
  });
}

function buildAssessment(): AssessmentReport {
  const history: Array<{ year: number; assessedCents: number }> = [
    { year: 2021, assessedCents: 51200000 },
    { year: 2022, assessedCents: 56500000 },
    { year: 2023, assessedCents: 61400000 },
    { year: 2024, assessedCents: 66800000 },
    { year: 2025, assessedCents: 72100000 },
  ];
  return assessmentReportSchema.parse({
    currentAssessment: {
      assessedValue: { cents: 72100000, formatted: usd(72100000) },
      appraisedValue: { cents: 72100000, formatted: usd(72100000) },
      assessmentYear: 2025,
    },
    annualTaxes: {
      total: { cents: 1441200, formatted: usd(1441200) },
      effectiveTaxRatePct: 1.998,
      effectiveTaxRateFormatted: "1.998%",
    },
    assessmentHistory: history.map((h) => ({
      year: h.year,
      assessedValue: { cents: h.assessedCents, formatted: usd(h.assessedCents) },
      appraisedValue: { cents: h.assessedCents, formatted: usd(h.assessedCents) },
    })),
    taxBreakdown: [
      {
        entityName: "Lamar CISD",
        ratePct: 1.2069,
        rateFormatted: "1.206900%",
        annualTax: { cents: 870534, formatted: usd(870534) },
      },
      {
        entityName: "Fort Bend County",
        ratePct: 0.3987,
        rateFormatted: "0.398700%",
        annualTax: { cents: 287465, formatted: usd(287465) },
      },
      {
        entityName: "City of Fulshear",
        ratePct: 0.28,
        rateFormatted: "0.280000%",
        annualTax: { cents: 201880, formatted: usd(201880) },
      },
      {
        entityName: "Fort Bend MUD #218",
        ratePct: 0.1124,
        rateFormatted: "0.112400%",
        annualTax: { cents: 81121, formatted: usd(81121) },
      },
    ],
    keyDetails: {
      assessmentYear: 2025,
      appraisalDistrict: "Fort Bend Central Appraisal District",
      accountNumber: DEMO_PARCEL_NUMBER,
      legalDescription: DEMO_LEGAL_DESCRIPTION,
      appraisalDistrictUrl: "https://esearch.fbcad.org/Property/View/R448733",
    },
  });
}

function buildZoning(): ZoningReport {
  return zoningReportSchema.parse({
    zoningAtAGlance: {
      code: "R-1",
      label: "Low-Density Residential",
      category: "Residential",
      jurisdiction: "City of Fulshear",
      ordinanceUrl: "https://www.fulsheartexas.gov/government/departments/planning/zoning-ordinance",
      lastUpdated: "2026-03-12",
    },
    summary:
      "The property is zoned R-1 (Low-Density Residential), which primarily allows single-family residential use with certain accessory and conditional uses.",
    permittedUses: [
      { use: "Single-family dwelling", status: "permitted" },
      { use: "Accessory structure (e.g., shed, detached garage)", status: "permitted" },
      { use: "Fences and walls", status: "permitted" },
      { use: "Home occupation (limited)", status: "permitted" },
      { use: "Swimming pool (private)", status: "permitted" },
    ],
    conditionalUses: [
      { use: "Child day care (home-based)", status: "conditional" },
      { use: "Community residential facility (small)", status: "conditional" },
    ],
    notesAndConditions: [
      "Conditional uses may be allowed with a permit and additional planning review.",
      "Legal interpretation of the ordinance controls over this summary; confirm with the planning department before relying on it.",
    ],
    nextSteps: [
      {
        title: "Review full zoning ordinance",
        description: "See complete regulations and definitions.",
        href: "https://www.fulsheartexas.gov/government/departments/planning/zoning-ordinance",
      },
      {
        title: "Confirm your intended use",
        description: "Ensure it aligns with R-1 requirements.",
        href: null,
      },
      {
        title: "Contact the planning department",
        description: "Get clarification or request a pre-application meeting.",
        href: "https://www.fulsheartexas.gov/government/departments/planning",
      },
    ],
  });
}

function buildMarket(): MarketReport {
  const trendDollars = [625000, 651000, 668000, 682000, 695000, 705000, 721000];
  const trendCents = trendDollars.map((d) => d * 100);
  const trendLabels = ["Nov '25", "Jan '26", "Mar '26", "May '26", "Jul '26", "Sep '26", "Nov '26"];
  return marketReportSchema.parse({
    summaryMetrics: {
      estimatedValue: { cents: 72100000, formatted: usd(72100000) },
      estimatedValueChange: { value: 6.3, formatted: pct(6.3), direction: direction(6.3) },
      medianPricePerSqFt: { cents: 21000, formatted: usd(21000) },
      medianPricePerSqFtChange: { value: 5.1, formatted: pct(5.1), direction: direction(5.1) },
      medianDaysOnMarket: 18,
      medianDaysOnMarketChangeDays: -5,
      saleToListPct: 96.8,
      saleToListChangePp: 0.9,
    },
    homeValueTrend: trendLabels.map((label, i) => ({
      label,
      value: { cents: trendCents[i], formatted: usd(trendCents[i]) },
    })),
    marketSummary: {
      areaLabel: "Fulshear, TX",
      periodLabel: "Single-family residential market for the last 12 months.",
      medianSalePrice: { cents: 71500000, formatted: usd(71500000) },
      medianSalePriceChange: { value: 6.1, formatted: pct(6.1), direction: direction(6.1) },
      medianPricePerSqFt: { cents: 20900, formatted: usd(20900) },
      medianPricePerSqFtChange: { value: 4.9, formatted: pct(4.9), direction: direction(4.9) },
      medianDaysOnMarket: 19,
      medianDaysOnMarketChangeDays: -6,
      homesSold: 427,
      homesSoldChange: { value: 8.6, formatted: pct(8.6), direction: direction(8.6) },
      activeInventory: 152,
      activeInventoryChange: { value: -11.1, formatted: pct(-11.1), direction: direction(-11.1) },
      monthsOfSupply: 4.3,
      marketBalanceLabel: "Balanced",
    },
    comparableProperties: [
      {
        address: "12802 Willow Creek Dr, Fulshear, TX 77441",
        livingAreaSqFt: 3389,
        bedrooms: 4,
        bathrooms: 3,
        status: "Sold",
        price: { cents: 73000000, formatted: usd(73000000) },
        eventDate: "2026-10-18",
      },
      {
        address: "12796 Willow Creek Dr, Fulshear, TX 77441",
        livingAreaSqFt: 3502,
        bedrooms: 4,
        bathrooms: 3,
        status: "Sold",
        price: { cents: 72500000, formatted: usd(72500000) },
        eventDate: "2026-10-02",
      },
      {
        address: "12836 Willow Creek Dr, Fulshear, TX 77441",
        livingAreaSqFt: 3427,
        bedrooms: 4,
        bathrooms: 3,
        status: "Sold",
        price: { cents: 71800000, formatted: usd(71800000) },
        eventDate: "2026-09-20",
      },
    ],
    keyTakeaways: [
      "Property value is up 6.3% year-over-year, above the Fulshear market average of 6.1%.",
      "Homes in this area are selling in a median of 19 days.",
      "The market is balanced with 4.3 months of supply.",
      "Recent comparable sales range from $718,000 – $730,000 for similar homes.",
    ],
    disclaimer:
      "Estimated value and trend figures are model-assisted calculations derived from public assessment and recorded-sale data. They are not an appraisal and should not be relied upon as one.",
  });
}

function buildHistory(): HistoryReport {
  return historyReportSchema.parse({
    atAGlance: { totalEvents: 7, owners: 2, sales: 1, permits: 2 },
    events: [
      {
        date: "2026-03-12",
        category: "assessment",
        title: "Assessment Updated",
        description: "Assessed value set to $721,000 (+6.3% YoY).",
      },
      {
        date: "2024-08-03",
        category: "tax",
        title: "Tax Record Updated",
        description: "Annual property tax of $14,412 recorded.",
      },
      {
        date: "2019-07-15",
        category: "sale",
        title: "Property Sold",
        description: "Sold for $548,000 to Willow Creek Holdings, LLC.",
      },
      {
        date: "2019-07-15",
        category: "ownership",
        title: "Ownership Transfer",
        description: "Ownership transferred to Willow Creek Holdings, LLC.",
      },
      {
        date: "2019-06-10",
        category: "permit",
        title: "Certificate of Occupancy",
        description: "Final CO issued (New Residential Construction).",
      },
      {
        date: "2019-03-18",
        category: "permit",
        title: "Building Permit Issued",
        description: "Permit for single-family residence (3,428 sq ft).",
      },
      {
        date: "2019-01-08",
        category: "zoning",
        title: "Zoning Confirmation",
        description: "Confirmed R-1 (Low-Density Residential).",
      },
    ],
    ownershipTimeline: [
      {
        ownerName: "Willow Creek Holdings, LLC",
        startDate: "2019-07-15",
        endDate: null,
        startLabel: "Jul 15, 2019",
        endLabel: "Present",
      },
    ],
    valueHistory: [
      {
        year: 2021,
        assessedValue: { cents: 51200000, formatted: usd(51200000) },
        appraisedValue: { cents: 51200000, formatted: usd(51200000) },
      },
      {
        year: 2022,
        assessedValue: { cents: 56500000, formatted: usd(56500000) },
        appraisedValue: { cents: 56500000, formatted: usd(56500000) },
      },
      {
        year: 2023,
        assessedValue: { cents: 61400000, formatted: usd(61400000) },
        appraisedValue: { cents: 61400000, formatted: usd(61400000) },
      },
      {
        year: 2024,
        assessedValue: { cents: 66800000, formatted: usd(66800000) },
        appraisedValue: { cents: 66800000, formatted: usd(66800000) },
      },
      {
        year: 2025,
        assessedValue: { cents: 72100000, formatted: usd(72100000) },
        appraisedValue: { cents: 72100000, formatted: usd(72100000) },
      },
      {
        year: 2026,
        assessedValue: { cents: 72100000, formatted: usd(72100000) },
        appraisedValue: { cents: 72100000, formatted: usd(72100000) },
      },
    ],
  });
}

function buildCoverage(): CoverageReport {
  return coverageReportSchema.parse({
    domains: [
      {
        domain: "ownership",
        status: "verified",
        note: "Chain of title and recorded deed/mortgage documents confirmed by the county clerk.",
      },
      {
        domain: "assessment",
        status: "verified",
        note: "Assessed value, appraised value, and tax breakdown confirmed by FBCAD and the county tax office.",
      },
      {
        domain: "zoning",
        status: "verified",
        note: "Zoning district and use table confirmed by the City of Fulshear planning department.",
      },
      {
        domain: "market",
        status: "partial",
        note: "Comparable sales limited to the same street; broader-area comps may carry less precise matching.",
      },
      {
        domain: "history",
        status: "verified",
        note: "Timeline built from recorded permits, deeds, and assessment notices.",
      },
      {
        domain: "environmental",
        status: "partial",
        note: "No EPA ECHO/Envirofacts enforcement or cleanup records found; absence of a record is not proof of absence of contamination.",
      },
      {
        domain: "flood",
        status: "partial",
        note: "FEMA NFHL panel indicates the parcel is outside the mapped 100-year floodplain; map limitations and unmapped areas apply.",
      },
      {
        domain: "wetlands",
        status: "partial",
        note: "USFWS NWI shows no mapped wetlands on the parcel; inventory status is not a legal jurisdictional determination.",
      },
      {
        domain: "soil",
        status: "partial",
        note: "USDA NRCS SSURGO survey available for the area; not a substitute for a site-specific geotechnical study.",
      },
    ],
    methodologyNote:
      "Coverage status reflects whether each domain's supporting facts were independently confirmed against an authoritative public source ('verified'), partially available with caveats ('partial'), or unavailable in public records ('unavailable').",
  });
}

const FINDINGS: Finding[] = [
  {
    domain: "zoning",
    title: "Zoning compliant for single-family use",
    explanation:
      "The parcel is zoned R-1 (Low-Density Residential) by the City of Fulshear, and the existing single-family home is a permitted use by right. No variances or nonconforming-use flags were found.",
    severity: "low",
    verification: "verified",
    investmentImplication: "Supports straightforward as-is use and resale as a single-family residence.",
    recommendedAction: null,
  },
  {
    domain: "assessment",
    title: "No delinquent tax history found",
    explanation:
      "Fort Bend County Tax Office records show current-year taxes assessed with no indication of delinquency or unpaid prior-year balances on file.",
    severity: "low",
    verification: "verified",
    investmentImplication: "Reduces the likelihood of inherited tax liens at purchase.",
    recommendedAction: "Request a current tax certificate before closing to confirm the payoff amount.",
  },
  {
    domain: "ownership",
    title: "Clear single-owner chain of title since 2013",
    explanation:
      "Recorded deeds show an unbroken, sequential chain of title across three owners since 2013, with a lien release recorded prior to the most recent sale. No competing claims were found in the county clerk's index.",
    severity: "low",
    verification: "verified",
    investmentImplication: "Supports a straightforward title search; no gaps in the public chain of title.",
    recommendedAction: null,
  },
  {
    domain: "environmental",
    title: "No EPA enforcement actions on record",
    explanation:
      "EPA ECHO and Envirofacts show no enforcement, compliance, or cleanup records associated with this parcel or its immediate vicinity.",
    severity: "low",
    verification: "verified",
    investmentImplication: null,
    recommendedAction:
      "Absence of a record is not proof of absence of contamination; order a Phase I ESA if required by your lender.",
  },
];

const STAGES = [
  { key: "address_resolution", label: "Address & Location" },
  { key: "parcel_identification", label: "Parcel Identification" },
  { key: "property_records", label: "Property Records" },
  { key: "zoning_land_use", label: "Zoning & Land Use" },
  { key: "risk_environmental", label: "Risk & Environmental" },
  { key: "market_analysis", label: "Market Analysis" },
  { key: "report_assembly", label: "Report Assembly" },
];

async function seedResearchRun(propertyId: string) {
  const idempotencyKey = "demo-sample-willow-creek-dr";
  let run = await prisma.researchRun.findFirst({
    where: { propertyId, isSample: true, idempotencyKey },
  });
  const startedAt = new Date("2026-03-12T14:00:00-06:00");
  const completedAt = new Date("2026-03-12T14:00:45-06:00");
  const runData = {
    propertyId,
    idempotencyKey,
    researchProfile: "standard",
    status: "completed" as const,
    isSample: true,
    startedAt,
    completedAt,
    errorMessage: null,
  };
  run = run
    ? await prisma.researchRun.update({ where: { id: run.id }, data: runData })
    : await prisma.researchRun.create({ data: runData });

  for (const [i, stage] of STAGES.entries()) {
    const existing = await prisma.researchStage.findFirst({
      where: { researchRunId: run.id, key: stage.key },
    });
    const data = {
      researchRunId: run.id,
      key: stage.key,
      label: stage.label,
      status: "complete",
      startedAt,
      completedAt,
      sortOrder: i,
    };
    if (existing) {
      await prisma.researchStage.update({ where: { id: existing.id }, data });
    } else {
      await prisma.researchStage.create({ data });
    }
  }

  const overview = buildOverview();
  const ownership = buildOwnership();
  const assessment = buildAssessment();
  const zoning = buildZoning();
  const market = buildMarket();
  const history = buildHistory();
  const coverage = buildCoverage();

  const existingReport = await prisma.researchReport.findUnique({
    where: { researchRunId: run.id },
  });
  const reportData = {
    researchRunId: run.id,
    propertyId,
    schemaVersion: "1.0",
    promptVersion: "seed-v1",
    generatedAt: completedAt,
    overview: overview as unknown as Prisma.InputJsonValue,
    ownership: ownership as unknown as Prisma.InputJsonValue,
    assessment: assessment as unknown as Prisma.InputJsonValue,
    zoning: zoning as unknown as Prisma.InputJsonValue,
    market: market as unknown as Prisma.InputJsonValue,
    history: history as unknown as Prisma.InputJsonValue,
    coverage: coverage as unknown as Prisma.InputJsonValue,
  };
  const report = existingReport
    ? await prisma.researchReport.update({ where: { id: existingReport.id }, data: reportData })
    : await prisma.researchReport.create({ data: reportData });

  for (const finding of FINDINGS) {
    const existingFinding = await prisma.researchFinding.findFirst({
      where: { reportId: report.id, domain: finding.domain, title: finding.title },
    });
    const data = {
      reportId: report.id,
      domain: finding.domain,
      title: finding.title,
      explanation: finding.explanation,
      severity: finding.severity,
      verification: finding.verification,
      evidenceIds: [] as string[],
      investmentImplication: finding.investmentImplication,
      recommendedAction: finding.recommendedAction,
    };
    if (existingFinding) {
      await prisma.researchFinding.update({ where: { id: existingFinding.id }, data });
    } else {
      await prisma.researchFinding.create({ data });
    }
  }

  for (const assessmentRow of coverage.domains) {
    const existingCoverage = await prisma.coverageAssessment.findFirst({
      where: { reportId: report.id, domain: assessmentRow.domain },
    });
    const data = {
      reportId: report.id,
      domain: assessmentRow.domain,
      status: assessmentRow.status,
      note: assessmentRow.note,
    };
    if (existingCoverage) {
      await prisma.coverageAssessment.update({ where: { id: existingCoverage.id }, data });
    } else {
      await prisma.coverageAssessment.create({ data });
    }
  }

  return {
    run,
    report,
    stageCount: STAGES.length,
    findingCount: FINDINGS.length,
    coverageCount: coverage.domains.length,
  };
}

// ---------------------------------------------------------------------------
// 7. Help & Support content
// ---------------------------------------------------------------------------

type ArticleSeed = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  sortOrder: number;
};

type TopicSeed = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
  articles: ArticleSeed[];
};

const HELP_TOPICS: TopicSeed[] = [
  {
    slug: "research-lookups",
    title: "Research & Lookups",
    description:
      "Learn how to run lookups, understand your results, and get the most value from your property research.",
    icon: "layers",
    sortOrder: 0,
    articles: [
      {
        slug: "how-to-run-a-lookup",
        title: "How to run a lookup",
        summary: "Step-by-step instructions to search for a property and view your report.",
        sortOrder: 0,
        content: `Run a property lookup in seconds to get a comprehensive research report with key property details, ownership, valuations, and more.

Step-by-step:

1. Go to Research — From the top navigation, click Research.
2. Enter a property address — Type a full address (e.g., 12814 Willow Creek Dr, Fulshear, TX 77441) in the search bar. Include the city, state, and ZIP code for the best match.
3. Run the lookup — Click Search Property to generate the report. A new lookup consumes one credit from your plan's monthly (or lifetime, on the Free plan) allowance; reopening a report you already generated is always free.
4. View your results — Your report will load with property details, ownership, assessment and tax history, zoning and use, market insights, and a full history timeline.

Tips for success:
- Use a complete, valid address, including city, state, and ZIP.
- Double-check the address if you don't see the expected property; typos in street names or unit numbers are the most common cause of a mismatch.
- Try a nearby address if the property is newly built or not yet listed in public records — brand-new parcels can take time to appear in county systems.

If a lookup doesn't return the results you expect, see "Troubleshooting a failed lookup" for common causes and fixes.`,
      },
      {
        slug: "understanding-your-results",
        title: "Understanding your results",
        summary: "Learn what each section of your property report means and how to use it.",
        sortOrder: 1,
        content: `Every PropertyLens report is organized into six tabs so you can quickly find what you need:

- Overview — A hero summary with key facts (lot size, living area, year built), an overall risk summary, parcel identification, location, and a coverage snapshot showing which research domains were fully verified versus partially available.
- Ownership — The current owner of record, ownership history going back through prior transfers, recorded deed and mortgage documents, and related-party checks.
- Assessment & Taxes — Current and historical assessed/appraised values, the annual tax bill, and a breakdown by each taxing entity (school district, county, city, and any special districts).
- Zoning & Use — The zoning district, jurisdiction, and a table of permitted versus conditional uses under the applicable ordinance.
- Market Insights — Estimated value, local price trends, days on market, sale-to-list ratio, and recently sold comparable properties nearby.
- History — A chronological timeline combining ownership changes, sales, permits, zoning actions, and assessment updates.

Every figure in a report is backed by at least one evidence record with a source name, a retrieval date, and — where applicable — caveats explaining the figure's limitations. Click through on any data point to see its underlying source. Estimated values and trend figures are always clearly labeled as model-assisted calculations, never presented as a certified appraisal.`,
      },
      {
        slug: "what-data-is-included",
        title: "What data is included",
        summary: "A breakdown of the property, ownership, valuation, and market data in your report.",
        sortOrder: 2,
        content: `PropertyLens reports are built entirely from freely accessible government and public-record sources — there are no paid data subscriptions or private data brokers involved. Depending on the property's location, a report may draw on:

- Address & parcel identification — U.S. Census Bureau geocoding and county assessor/GIS parcel services.
- Ownership & deeds — County clerk/recorder official public records (deeds, mortgages, liens, releases).
- Assessment & taxes — The county appraisal district's assessment roll and the county tax office's consolidated tax statement, including each taxing entity's adopted rate.
- Zoning & use — City or county planning department zoning maps and ordinance text.
- Environmental & hazard context — FEMA flood maps, USFWS wetlands inventory, USGS elevation data, USDA soil survey data, and EPA compliance/cleanup records, where relevant to the property.
- Market insights — Recorded comparable sales and assessment trends for similar nearby properties.

Because this is public-record data, coverage and completeness vary by jurisdiction and property type. Any section where complete data isn't available in public records is labeled "partial" or "unavailable" rather than filled in with a guess — PropertyLens never fabricates ownership, valuation, or legal facts.`,
      },
      {
        slug: "lookup-limits-and-usage",
        title: "Lookup limits and usage",
        summary: "How lookups are counted, what's included in each plan, and how to track your usage.",
        sortOrder: 3,
        content: `Every plan includes a lookup allowance:

- Free — 5 lifetime lookups, no monthly reset.
- Explorer — 50 lookups per month.
- Investor — 150 lookups per month.
- Professional — Unlimited lookups per month.

A lookup is counted the moment you start a new research run for a property you haven't already researched (or when you explicitly refresh an existing report). Viewing or reopening a report you've already generated costs nothing — saved properties and prior reports are always free to revisit. The one exception is the curated sample property shown on the Research landing page: anyone, including signed-out visitors, can view it for free without consuming a lookup or starting new research.

You can track your usage at any time from the Usage page, which shows lookups used this month, lookups remaining, your next reset date, and a history of recent lookups with their status.`,
      },
      {
        slug: "tips-for-better-results",
        title: "Tips for better results",
        summary: "Best practices for searching, interpreting data, and identifying opportunities.",
        sortOrder: 4,
        content: `A few habits that make PropertyLens reports more useful:

- Search with the most complete address you have, including unit/suite numbers, city, state, and ZIP code — ambiguous or partial addresses are more likely to return a weak match or no match.
- Read the caveats, not just the numbers. Every figure that involves interpretation (like an estimated value or an effective tax rate) includes caveats explaining what it does and doesn't tell you.
- Compare the "verified" versus "partial" coverage labels before drawing conclusions. A "partial" market or environmental section means the absence of a finding is not the same as a clean bill of health.
- Treat assessed value and estimated market value as different things — assessed value comes from the county appraisal district and is not a market appraisal; it can lag behind or run ahead of what a property would actually sell for.
- Use the History tab to sanity-check a story. If an owner, sale price, or zoning change looks off, the timeline links back to the specific recorded document or public filing.
- Save properties you're actively tracking so PropertyLens can flag future changes (like a new assessment or an ownership transfer) in your Activity feed.`,
      },
      {
        slug: "troubleshooting-a-failed-lookup",
        title: "Troubleshooting a failed lookup",
        summary: "Common reasons a lookup might not work and how to fix it.",
        sortOrder: 5,
        content: `If a lookup fails or returns incomplete results, it's usually one of these:

- Address couldn't be matched — Double-check spelling, and make sure you included the city, state, and ZIP code. Rural routes and brand-new addresses are the most likely to fail an initial geocoding match; try a nearby cross-street or the subdivision name instead.
- Property is outside a currently supported jurisdiction — PropertyLens's research engine depends on the target county or city publishing accessible public-data services. If a jurisdiction hasn't been onboarded yet, you'll see a clear message rather than a fabricated report.
- Research run timed out or an upstream source was temporarily unavailable — Public government data sources occasionally have maintenance windows or rate limits. Wait a few minutes and try the lookup again; if a reservation was made for a run that failed, it is automatically released back to your plan's allowance.
- Report looks incomplete — Some domains (for example, market comps in a rural area, or wetlands data in an urban core) may have thin or no public data. These are shown as "unavailable" or "partial" rather than guessed at.

If none of these explain what you're seeing, send us a message from Help & Support with the address you searched and we'll take a look.`,
      },
    ],
  },
  {
    slug: "plans-billing",
    title: "Plans & Billing",
    description: "Plan details, usage limits, payments, and upgrades.",
    icon: "credit-card",
    sortOrder: 1,
    articles: [
      {
        slug: "managing-your-plan",
        title: "Managing your plan",
        summary: "Change your plan, update your payment method, or view billing history.",
        sortOrder: 0,
        content: `You can manage your plan at any time from the Billing page:

- Change your plan — Choose Free, Explorer ($19/month, 50 lookups), Investor ($39/month, 150 lookups), or Professional ($99/month, unlimited lookups). Upgrades apply immediately; downgrades take effect at the start of your next billing period so you don't lose access mid-cycle.
- Update your payment method — Add or replace the card on file from the Payment Method card. We never store full card numbers ourselves; payment details are handled by our billing provider.
- View billing history — Every charge appears in Billing History with a downloadable receipt.

Your current plan, usage this month, and next billing date are always visible at the top of the Billing and Usage pages, and from the account dropdown in the top navigation.`,
      },
      {
        slug: "understanding-plan-tiers-and-limits",
        title: "Understanding plan tiers and limits",
        summary: "What's included in each plan and how lookup allowances work.",
        sortOrder: 1,
        content: `PropertyLens plans differ primarily in how many lookups (full property research reports) they include per period:

- Free — $0, 5 lifetime lookups. Includes the full research report, public records and government data, and evidence with source links. Meant for trying the product, not ongoing use.
- Explorer — $19/month, 50 lookups/month. Adds 6 months of prior report history and PDF export.
- Investor — $39/month, 150 lookups/month. Adds priority research processing and 12 months of report history. This is our most popular plan for active investors researching multiple properties regularly.
- Professional — $99/month, unlimited lookups. Adds the highest processing priority, full report history, and early access to new features.

All paid plans include everything in the tier below them. Every plan includes the same underlying report — higher tiers unlock more volume, more history, and faster processing, not a "better" or more accurate report.`,
      },
      {
        slug: "billing-history-and-receipts",
        title: "Billing history and receipts",
        summary: "Where to find past charges and download receipts for your records.",
        sortOrder: 2,
        content: `Every subscription charge is recorded in your Billing History, including the date, plan, and amount charged. Click View next to any entry to open or download a receipt, or use Download Receipts to export your full billing history at once. If a charge looks incorrect, send us a message from Help & Support with the date and amount and we'll investigate.`,
      },
      {
        slug: "upgrading-or-downgrading-your-plan",
        title: "Upgrading or downgrading your plan",
        summary: "How plan changes affect your billing and lookup allowance.",
        sortOrder: 3,
        content: `Upgrades take effect immediately: your lookup allowance increases right away and any price difference is prorated for the remainder of the current billing period. Downgrades (including cancelling to the Free plan) take effect at the end of your current billing period — you keep your current plan's allowance and features until then, so you never lose access you've already paid for mid-cycle. Lookups already used in the current period are not refunded when you change plans.`,
      },
    ],
  },
  {
    slug: "account-security",
    title: "Account & Security",
    description: "Manage your profile, sign-in methods, and account security.",
    icon: "user",
    sortOrder: 2,
    articles: [
      {
        slug: "resetting-your-password",
        title: "Resetting your password",
        summary: "Steps to securely reset your password and regain access to your account.",
        sortOrder: 0,
        content: `PropertyLens authentication is handled by our account provider (Clerk), so password resets go through a secure, provider-managed flow:

1. From the sign-in page, click "Forgot password?".
2. Enter the email address associated with your account.
3. Check your inbox for a reset link or code and follow the instructions to choose a new password.
4. Sign in with your new password. If you have multi-factor authentication enabled, you'll be prompted for your second factor as usual.

If you don't receive the reset email within a few minutes, check your spam folder and confirm you're using the same email address you originally signed up with. If you still can't get in, send us a message from Help & Support and we'll help verify your identity and restore access.`,
      },
      {
        slug: "managing-your-profile",
        title: "Managing your profile and email",
        summary: "Update your name, profile photo, and email address.",
        sortOrder: 1,
        content: `Open the account dropdown in the top navigation and choose Manage Account to update your name, profile photo, and contact email. Email changes require confirming the new address before it becomes active, to prevent account takeover. Your display name and photo are used only within the PropertyLens app and are never shared publicly.`,
      },
      {
        slug: "account-security-best-practices",
        title: "Account security best practices",
        summary: "Recommendations for keeping your account secure.",
        sortOrder: 2,
        content: `A few steps to keep your PropertyLens account secure:

- Enable multi-factor authentication (MFA) from the Security tab of your account settings.
- Use a unique, strong password, or sign in with a supported social/connected account instead.
- Review connected accounts periodically and remove any you no longer use.
- Watch for account notifications about new sign-ins or security changes — these are sent for transactional and security events and cannot be disabled.
- Never share your password or one-time codes with anyone, including anyone claiming to be PropertyLens support. We will never ask for your password.`,
      },
      {
        slug: "managing-connected-accounts",
        title: "Managing connected accounts",
        summary: "Link or unlink social and third-party sign-in methods.",
        sortOrder: 3,
        content: `From the Connected Accounts tab in Manage Account, you can link an additional sign-in method (such as a social provider) to your existing account, or remove one you no longer want to use. You must keep at least one verified sign-in method (password or connected account) active at all times so you don't get locked out.`,
      },
    ],
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Common issues and step-by-step fixes.",
    icon: "settings",
    sortOrder: 3,
    articles: [
      {
        slug: "common-error-messages",
        title: "Common error messages and what they mean",
        summary: "What to do when you see an error while searching or viewing a report.",
        sortOrder: 0,
        content: `- "We couldn't match that address" — The address couldn't be geocoded. Check spelling, and include city, state, and ZIP code.
- "This jurisdiction isn't supported yet" — The county or city hasn't been onboarded to our public-data research engine. We only register a jurisdiction once its data sources have been reviewed and validated — we never fabricate records for unsupported areas.
- "You've used all of your available lookups" — You've reached your plan's allowance. Upgrade your plan or wait for your next reset date (shown on the Usage page).
- "Research run failed" — An upstream public data source was temporarily unavailable or the run timed out. Any credit reserved for the run is automatically released, and you can safely retry.

If you see an error not listed here, send us a message with a screenshot and the address or report you were viewing.`,
      },
      {
        slug: "why-is-data-missing-from-my-report",
        title: "Why is some data missing from my report?",
        summary: "Understanding partial and unavailable sections in a property report.",
        sortOrder: 1,
        content: `PropertyLens only shows what can be verified from public records. If a section of your report shows "partial" or "unavailable" coverage, it means the authoritative public source for that domain either has limited data for this property or wasn't accessible for this lookup — it does not mean the underlying condition is favorable or unfavorable. For example, a "partial" environmental section means no enforcement or cleanup records were found, not that the property has been confirmed free of environmental issues. We intentionally avoid filling these gaps with AI guesses, since an invented fact is more dangerous than a clearly labeled gap.`,
      },
      {
        slug: "resolving-billing-issues",
        title: "Resolving billing issues",
        summary: "What to do if a charge looks wrong or a payment fails.",
        sortOrder: 2,
        content: `If a payment fails, your subscription status will show as "past due" and you'll be prompted to update your payment method from the Billing page. If a charge amount looks incorrect, check Billing History first — it lists the plan and billing period for every charge. If something still looks wrong, send us a message from Help & Support with the date and amount in question and we'll investigate and correct it.`,
      },
      {
        slug: "contacting-support",
        title: "Contacting support",
        summary: "How to reach our team when you can't find an answer here.",
        sortOrder: 3,
        content: `If you can't find what you need in the Help Center, click "Send us a message" to open a support ticket. Include your account email, the property address or report involved (if relevant), and as much detail as possible about what you expected versus what happened. Our team typically responds within a few hours, Monday–Friday, 8 AM–6 PM CT. You can track the status of your ticket (open, waiting, resolved, or closed) and continue the conversation from the Support section of your account.`,
      },
    ],
  },
];

async function seedHelpContent() {
  let topicCount = 0;
  let articleCount = 0;
  for (const topic of HELP_TOPICS) {
    const topicRow = await prisma.helpTopic.upsert({
      where: { slug: topic.slug },
      update: {
        title: topic.title,
        description: topic.description,
        icon: topic.icon,
        sortOrder: topic.sortOrder,
      },
      create: {
        slug: topic.slug,
        title: topic.title,
        description: topic.description,
        icon: topic.icon,
        sortOrder: topic.sortOrder,
      },
    });
    topicCount += 1;
    for (const article of topic.articles) {
      await prisma.helpArticle.upsert({
        where: { slug: article.slug },
        update: {
          topicId: topicRow.id,
          title: article.title,
          summary: article.summary,
          content: article.content,
          sortOrder: article.sortOrder,
        },
        create: {
          topicId: topicRow.id,
          slug: article.slug,
          title: article.title,
          summary: article.summary,
          content: article.content,
          sortOrder: article.sortOrder,
        },
      });
      articleCount += 1;
    }
  }
  return { topicCount, articleCount };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const planCount = await seedPlans();
  console.log(`Seeded ${planCount} plans.`);

  const sourceIdByKey = await seedPublicDataSources();
  console.log(`Seeded ${Object.keys(sourceIdByKey).length} public data sources.`);

  const { fortBendCounty } = await seedJurisdictions();
  console.log("Seeded Fort Bend County, TX and City of Fulshear, TX jurisdictions.");

  const property = await seedDemoProperty(fortBendCounty.id);
  console.log(`Seeded demo property ${property.id} (12814 Willow Creek Dr, Fulshear, TX 77441).`);

  const { documentCount, factCount } = await seedEvidence(property.id, sourceIdByKey);
  console.log(`Seeded ${documentCount} evidence documents and ${factCount} evidence facts.`);

  const { stageCount, findingCount, coverageCount } = await seedResearchRun(property.id);
  console.log(
    `Seeded a completed sample ResearchRun with ${stageCount} stages, ${findingCount} findings, and ${coverageCount} coverage assessments.`,
  );

  const { topicCount, articleCount } = await seedHelpContent();
  console.log(`Seeded ${topicCount} help topics and ${articleCount} help articles.`);

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
