import { NextResponse } from "next/server";
import { prisma } from "@/server/infrastructure/database/prisma";
import { withErrorHandling } from "@/contracts/problem-details";

/** Public plan catalog, read from the `Plan` table (seeded from PLAN_CATALOG). */
export const GET = withErrorHandling(async () => {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ plans });
});
