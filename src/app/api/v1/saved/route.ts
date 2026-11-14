import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUserId } from "@/server/auth/session";
import { withErrorHandling, badRequest } from "@/contracts/problem-details";
import { prisma } from "@/server/infrastructure/database/prisma";
import { getSavedPropertiesForUser } from "@/app/(app)/saved/_lib/queries";

const saveBodySchema = z.object({
  propertyId: z.string().min(1),
  notes: z.string().optional(),
});

/** GET /api/v1/saved — the signed-in user's saved properties, newest-first. */
export const GET = withErrorHandling(async () => {
  const userId = await requireSessionUserId();
  const items = await getSavedPropertiesForUser(userId);
  return Response.json({ items });
});

/** POST /api/v1/saved — save a property for the signed-in user. */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireSessionUserId();
  const body = saveBodySchema.parse(await request.json());

  const property = await prisma.property.findUnique({ where: { id: body.propertyId } });
  if (!property) return badRequest("The specified property does not exist.");

  const existing = await prisma.savedProperty.findFirst({
    where: { userId, propertyId: body.propertyId },
  });
  if (existing) {
    return Response.json({ savedId: existing.id }, { status: 200 });
  }

  const saved = await prisma.savedProperty.create({
    data: { userId, propertyId: body.propertyId, notes: body.notes },
  });

  await prisma.activityEvent.create({
    data: {
      userId,
      propertyId: body.propertyId,
      category: "saved",
      title: "Property saved",
      description: "Added to your saved properties.",
      eventTime: new Date(),
    },
  });

  return Response.json({ savedId: saved.id }, { status: 201 });
});
