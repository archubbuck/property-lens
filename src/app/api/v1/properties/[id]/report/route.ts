import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, notFound } from "@/contracts/problem-details";
import { getPropertyReport } from "@/app/api/v1/properties/_lib/property-data";

/**
 * Full report projection for all six tabs (Overview/Ownership/Assessment &
 * Taxes/Zoning & Use/Market Insights/History) plus findings and coverage.
 * Returns the whole payload in one call; `tab` is accepted for future
 * per-tab caching but all tabs are already render-ready and cheap to parse.
 */
export const GET = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;

    const report = await getPropertyReport(id);
    if (!report) return notFound("No research report found for this property.");

    return NextResponse.json({ report, schemaVersion: "1.0" });
  }
);
