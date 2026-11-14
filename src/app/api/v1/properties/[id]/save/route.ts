import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/infrastructure/database/prisma";
import { requireSessionUserId } from "@/server/auth/session";
import { withErrorHandling, notFound } from "@/contracts/problem-details";

/** Toggles SavedProperty for the current user and records the activity event. */
export const POST = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const userId = await requireSessionUserId();

    const property = await prisma.property.findUnique({ where: { id }, select: { id: true } });
    if (!property) return notFound("Property not found.");

    const existing = await prisma.savedProperty.findUnique({
      where: { userId_propertyId: { userId, propertyId: id } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.savedProperty.delete({ where: { id: existing.id } }),
        prisma.activityEvent.create({
          data: {
            userId,
            propertyId: id,
            category: "unsaved",
            title: "Property unsaved",
            description: "Removed this property from saved properties.",
          },
        }),
      ]);
      return NextResponse.json({ saved: false });
    }

    await prisma.$transaction([
      prisma.savedProperty.create({ data: { userId, propertyId: id } }),
      prisma.activityEvent.create({
        data: {
          userId,
          propertyId: id,
          category: "saved",
          title: "Property saved",
          description: "Added this property to saved properties.",
        },
      }),
    ]);
    return NextResponse.json({ saved: true });
  }
);
