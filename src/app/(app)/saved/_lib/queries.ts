import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/infrastructure/database/prisma";
import {
  assessmentReportSchema,
  marketReportSchema,
  zoningReportSchema,
} from "@/contracts/schemas/report";
import { savedPropertyAddressLine, type SavedPropertyAddress } from "./format";

export { savedPropertyAddressLine };
export type { SavedPropertyAddress };

/**
 * Data-access helpers for the Saved Properties / Activity / Comparison
 * surface. Kept colocated under `src/app/(app)/saved` (rather than a shared
 * `server/domains/saved` facade) per this task's file-ownership boundaries;
 * both the pages and the `/api/v1/saved` + `/api/v1/activity` route handlers
 * import from here so query logic and JSON-shape parsing stay in one place.
 */

export type SavedPropertySummary = {
  savedId: string;
  propertyId: string;
  savedAt: string;
  notes: string | null;
  tags: string[];
  address: SavedPropertyAddress | null;
  propertyType: string;
  lotSizeAcres: number | null;
  lotSizeSqFt: number | null;
  livingAreaSqFt: number | null;
  yearBuilt: number | null;
  photoUrl: string | null;
  latestReport: {
    reportId: string;
    generatedAt: string;
    estimatedValue: string | null;
    estimatedValueChange: { formatted: string; direction: "up" | "down" | "flat" } | null;
    annualTax: string | null;
    zoningCode: string | null;
  } | null;
};

/** All of a user's saved properties, newest-first, with the latest report snapshot. */
export async function getSavedPropertiesForUser(userId: string): Promise<SavedPropertySummary[]> {
  const rows = await prisma.savedProperty.findMany({
    where: { userId },
    orderBy: { savedAt: "desc" },
    include: {
      property: {
        include: {
          addresses: { where: { isPrimary: true }, take: 1 },
          media: { orderBy: { sortOrder: "asc" }, take: 1 },
          reports: { orderBy: { generatedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  return rows.map((row) => {
    const property = row.property;
    const address = property.addresses[0] ?? null;
    const report = property.reports[0];

    let latestReport: SavedPropertySummary["latestReport"] = null;
    if (report) {
      const assessment = assessmentReportSchema.safeParse(report.assessment);
      const zoning = zoningReportSchema.safeParse(report.zoning);
      const market = marketReportSchema.safeParse(report.market);
      latestReport = {
        reportId: report.id,
        generatedAt: report.generatedAt.toISOString(),
        estimatedValue: market.success
          ? market.data.summaryMetrics.estimatedValue.formatted
          : null,
        estimatedValueChange: market.success
          ? {
              formatted: market.data.summaryMetrics.estimatedValueChange.formatted,
              direction: market.data.summaryMetrics.estimatedValueChange.direction,
            }
          : null,
        annualTax: assessment.success ? assessment.data.annualTaxes.total.formatted : null,
        zoningCode: zoning.success ? zoning.data.zoningAtAGlance.code : null,
      };
    }

    return {
      savedId: row.id,
      propertyId: property.id,
      savedAt: row.savedAt.toISOString(),
      notes: row.notes,
      tags: row.tags,
      address: address
        ? {
            line1: address.line1,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
          }
        : null,
      propertyType: property.propertyType,
      lotSizeAcres: property.lotSizeAcres,
      lotSizeSqFt: property.lotSizeSqFt,
      livingAreaSqFt: property.livingAreaSqFt,
      yearBuilt: property.yearBuilt,
      photoUrl: property.media[0]?.url ?? null,
      latestReport,
    };
  });
}

/** Verifies `savedPropertyId` belongs to `userId` and returns it, else null. */
export async function getOwnedSavedProperty(userId: string, savedPropertyId: string) {
  return prisma.savedProperty.findFirst({
    where: { id: savedPropertyId, userId },
    include: { property: { include: { addresses: { where: { isPrimary: true }, take: 1 } } } },
  });
}

export type ActivityEventDTO = {
  id: string;
  category: string;
  title: string;
  description: string;
  eventTime: string;
  propertyId: string | null;
  propertyLabel: string | null;
};

export type ActivityFilters = {
  propertyId?: string;
  category?: string;
  from?: string;
  to?: string;
  q?: string;
};

type CursorPayload = { eventTime: string; id: string };

export function encodeActivityCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeActivityCursor(cursor: string | undefined): CursorPayload | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof parsed?.eventTime === "string" && typeof parsed?.id === "string") {
      return parsed as CursorPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/** Reverse-chronological, cursor-paginated activity feed for a user, with optional filters. */
export async function getActivityPage(
  userId: string,
  options: ActivityFilters & { cursor?: string; limit: number }
): Promise<{ items: ActivityEventDTO[]; nextCursor: string | null; hasMore: boolean }> {
  const { cursor, limit, propertyId, category, from, to, q } = options;
  const decoded = decodeActivityCursor(cursor);

  const conditions: Prisma.ActivityEventWhereInput[] = [{ userId }];
  if (propertyId) conditions.push({ propertyId });
  if (category) conditions.push({ category });
  if (from || to) {
    conditions.push({
      eventTime: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    });
  }
  if (q) {
    conditions.push({
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    });
  }
  if (decoded) {
    conditions.push({
      OR: [
        { eventTime: { lt: new Date(decoded.eventTime) } },
        { eventTime: new Date(decoded.eventTime), id: { lt: decoded.id } },
      ],
    });
  }

  const rows = await prisma.activityEvent.findMany({
    where: { AND: conditions },
    orderBy: [{ eventTime: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: { property: { include: { addresses: { where: { isPrimary: true }, take: 1 } } } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items: ActivityEventDTO[] = page.map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    eventTime: row.eventTime.toISOString(),
    propertyId: row.propertyId,
    propertyLabel: row.property
      ? savedPropertyAddressLine(row.property.addresses[0] ?? null)
      : null,
  }));

  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeActivityCursor({ eventTime: last.eventTime.toISOString(), id: last.id })
      : null;

  return { items, nextCursor, hasMore };
}

export type ActivitySummary = {
  total: number;
  byCategory: Array<{ category: string; count: number }>;
};

/** Counts for the "Activity Summary" sidebar card, across the user's full activity history. */
export async function getActivitySummary(userId: string): Promise<ActivitySummary> {
  const grouped = await prisma.activityEvent.groupBy({
    by: ["category"],
    where: { userId },
    _count: { _all: true },
  });
  const total = grouped.reduce((sum, g) => sum + g._count._all, 0);
  const byCategory = grouped
    .map((g) => ({ category: g.category, count: g._count._all }))
    .sort((a, b) => b.count - a.count);
  return { total, byCategory };
}

export type ActivityPropertyRef = {
  propertyId: string;
  label: string;
  photoUrl: string | null;
};

/**
 * Count of non-save/unsave activity events (real property changes) in the
 * last `days` days, for the Saved Properties page's "Recent Changes" stat.
 */
export async function getRecentChangesCount(userId: string, days = 7): Promise<number> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.activityEvent.count({
    where: {
      userId,
      eventTime: { gte: since },
      category: { notIn: ["saved", "unsaved"] },
    },
  });
}

/** Distinct properties referenced in the user's activity, for the "Properties in Activity" card. */
export async function getPropertiesInActivity(userId: string): Promise<ActivityPropertyRef[]> {
  const events = await prisma.activityEvent.findMany({
    where: { userId, propertyId: { not: null } },
    distinct: ["propertyId"],
    orderBy: { eventTime: "desc" },
    include: {
      property: {
        include: {
          addresses: { where: { isPrimary: true }, take: 1 },
          media: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  });

  return events
    .filter((e) => e.property)
    .map((e) => ({
      propertyId: e.property!.id,
      label: savedPropertyAddressLine(e.property!.addresses[0] ?? null),
      photoUrl: e.property!.media[0]?.url ?? null,
    }));
}

export type ComparisonProperty = {
  propertyId: string;
  savedId: string;
  address: SavedPropertyAddress | null;
  propertyType: string;
  lotSizeAcres: number | null;
  lotSizeSqFt: number | null;
  livingAreaSqFt: number | null;
  yearBuilt: number | null;
  report: {
    generatedAt: string;
    appraisedValue: string | null;
    assessmentYear: number | null;
    estimatedValue: string | null;
    annualTax: string | null;
    zoningCode: string | null;
    zoningLabel: string | null;
    zoningAsOf: string | null;
  } | null;
};

/** Loads up to `propertyIds.length` saved properties (scoped to `userId`) for side-by-side comparison. */
export async function getComparisonProperties(
  userId: string,
  propertyIds: string[]
): Promise<ComparisonProperty[]> {
  if (propertyIds.length === 0) return [];
  const rows = await prisma.savedProperty.findMany({
    where: { userId, propertyId: { in: propertyIds } },
    include: {
      property: {
        include: {
          addresses: { where: { isPrimary: true }, take: 1 },
          reports: { orderBy: { generatedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  // Preserve the order the caller requested the ids in.
  const byPropertyId = new Map(rows.map((row) => [row.propertyId, row]));
  return propertyIds
    .map((id) => byPropertyId.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => {
      const property = row.property;
      const address = property.addresses[0] ?? null;
      const reportRow = property.reports[0];

      let report: ComparisonProperty["report"] = null;
      if (reportRow) {
        const assessment = assessmentReportSchema.safeParse(reportRow.assessment);
        const zoning = zoningReportSchema.safeParse(reportRow.zoning);
        const market = marketReportSchema.safeParse(reportRow.market);
        report = {
          generatedAt: reportRow.generatedAt.toISOString(),
          appraisedValue: assessment.success
            ? assessment.data.currentAssessment.appraisedValue.formatted
            : null,
          assessmentYear: assessment.success
            ? assessment.data.currentAssessment.assessmentYear
            : null,
          estimatedValue: market.success ? market.data.summaryMetrics.estimatedValue.formatted : null,
          annualTax: assessment.success ? assessment.data.annualTaxes.total.formatted : null,
          zoningCode: zoning.success ? zoning.data.zoningAtAGlance.code : null,
          zoningLabel: zoning.success ? zoning.data.zoningAtAGlance.label : null,
          zoningAsOf: zoning.success ? zoning.data.zoningAtAGlance.lastUpdated : null,
        };
      }

      return {
        propertyId: property.id,
        savedId: row.id,
        address: address
          ? {
              line1: address.line1,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
            }
          : null,
        propertyType: property.propertyType,
        lotSizeAcres: property.lotSizeAcres,
        lotSizeSqFt: property.lotSizeSqFt,
        livingAreaSqFt: property.livingAreaSqFt,
        yearBuilt: property.yearBuilt,
        report,
      };
    });
}
