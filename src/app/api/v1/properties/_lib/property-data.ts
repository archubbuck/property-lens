import { prisma } from "@/server/infrastructure/database/prisma";
import {
  overviewReportSchema,
  ownershipReportSchema,
  assessmentReportSchema,
  zoningReportSchema,
  marketReportSchema,
  historyReportSchema,
  coverageReportSchema,
  findingSchema,
} from "@/contracts/schemas/report";

/** Hero/summary projection for the property report shell (address, key facts, save state). */
export async function getPropertyHero(propertyId: string, userId: string | null) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      addresses: { where: { isPrimary: true }, take: 1 },
      media: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!property) return null;

  const savedProperty = userId
    ? await prisma.savedProperty.findUnique({
        where: { userId_propertyId: { userId, propertyId } },
      })
    : null;

  const address = property.addresses[0] ?? null;

  return {
    id: property.id,
    isDemoSample: property.isDemoSample,
    propertyType: property.propertyType,
    lotSizeAcres: property.lotSizeAcres,
    lotSizeSqFt: property.lotSizeSqFt,
    livingAreaSqFt: property.livingAreaSqFt,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    garageSpaces: property.garageSpaces,
    yearBuilt: property.yearBuilt,
    address: address
      ? {
          line1: address.line1,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
        }
      : null,
    media: property.media.map((item) => ({
      url: item.url,
      altText: item.altText,
      isPlaceholder: item.isPlaceholder,
    })),
    isSaved: Boolean(savedProperty),
  };
}

/** Full, typed report projection for all six tabs plus findings/coverage. */
export async function getPropertyReport(propertyId: string) {
  const report = await prisma.researchReport.findFirst({
    where: { propertyId },
    orderBy: { generatedAt: "desc" },
    include: { findings: true },
  });
  if (!report) return null;

  return {
    generatedAt: report.generatedAt.toISOString(),
    overview: overviewReportSchema.parse(report.overview),
    ownership: ownershipReportSchema.parse(report.ownership),
    assessment: assessmentReportSchema.parse(report.assessment),
    zoning: zoningReportSchema.parse(report.zoning),
    market: marketReportSchema.parse(report.market),
    history: historyReportSchema.parse(report.history),
    coverage: coverageReportSchema.parse(report.coverage),
    findings: report.findings.map((finding) =>
      findingSchema.parse({
        domain: finding.domain,
        title: finding.title,
        explanation: finding.explanation,
        severity: finding.severity,
        verification: finding.verification,
        investmentImplication: finding.investmentImplication,
        recommendedAction: finding.recommendedAction,
      })
    ),
  };
}
