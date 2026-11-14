import { NextRequest } from "next/server";
import { requireSessionUserId } from "@/server/auth/session";
import { withErrorHandling, notFound } from "@/contracts/problem-details";
import { prisma } from "@/server/infrastructure/database/prisma";
import { getOwnedSavedProperty } from "@/app/(app)/saved/_lib/queries";

/** DELETE /api/v1/saved/[id] — unsave a property (id is the SavedProperty id). */
export const DELETE = withErrorHandling(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await requireSessionUserId();
    const { id } = await params;

    const saved = await getOwnedSavedProperty(userId, id);
    if (!saved) return notFound("Saved property not found.");

    await prisma.$transaction([
      prisma.savedProperty.delete({ where: { id } }),
      prisma.activityEvent.create({
        data: {
          userId,
          propertyId: saved.propertyId,
          category: "unsaved",
          title: "Property removed from saved list",
          description: "Removed from your saved properties.",
          eventTime: new Date(),
        },
      }),
    ]);

    return new Response(null, { status: 204 });
  }
);
