import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { withErrorHandling, unprocessable } from "@/contracts/problem-details";

/** Real, app-owned notification preferences backed by `NotificationPreference`. */
const patchSchema = z.object({
  researchReports: z.boolean(),
  usageAndPlanUpdates: z.boolean(),
  billingAndPayments: z.boolean(),
  productUpdates: z.boolean(),
  tipsAndInsights: z.boolean(),
  digestFrequency: z.enum(["real_time", "weekly", "monthly"]),
});

export const GET = withErrorHandling(async () => {
  const userId = await requireSessionUserId();
  const preference = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
  return NextResponse.json({ preference });
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireSessionUserId();
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return unprocessable(parsed.error);
  }

  const preference = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: { ...parsed.data },
  });

  return NextResponse.json({ preference });
});
