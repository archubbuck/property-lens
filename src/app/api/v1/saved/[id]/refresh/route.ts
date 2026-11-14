import { NextRequest } from "next/server";
import { requireSessionUserId } from "@/server/auth/session";
import { withErrorHandling, notFound } from "@/contracts/problem-details";
import { prisma } from "@/server/infrastructure/database/prisma";
import { getOwnedSavedProperty } from "@/app/(app)/saved/_lib/queries";

/**
 * POST /api/v1/saved/[id]/refresh — request a refreshed research report for
 * a saved property. The real research pipeline (ResearchRun creation,
 * credit/billing deduction) is owned by other in-progress parts of this
 * codebase and intentionally out of scope here, so this endpoint only
 * records an auditable "refresh requested" activity event rather than
 * fabricating a completed report or silently consuming a credit.
 */
export const POST = withErrorHandling(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await requireSessionUserId();
    const { id } = await params;

    const saved = await getOwnedSavedProperty(userId, id);
    if (!saved) return notFound("Saved property not found.");

    const event = await prisma.activityEvent.create({
      data: {
        userId,
        propertyId: saved.propertyId,
        category: "report_refreshed",
        title: "Refresh requested",
        description: "A research refresh was requested for this property.",
        eventTime: new Date(),
      },
    });

    return Response.json({ eventId: event.id }, { status: 202 });
  }
);
