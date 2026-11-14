import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/auth/session";
import { withErrorHandling, notFound } from "@/contracts/problem-details";
import { getPropertyHero } from "@/app/api/v1/properties/_lib/property-data";

/** Hero/summary data for the property report shell. */
export const GET = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const userId = await getSessionUserId();

    const hero = await getPropertyHero(id, userId);
    if (!hero) return notFound("Property not found.");

    return NextResponse.json({ property: hero, schemaVersion: "1.0" });
  }
);
