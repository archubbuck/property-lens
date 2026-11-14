import { NextRequest } from "next/server";
import { z } from "zod";
import { requireSessionUserId } from "@/server/auth/session";
import { withErrorHandling } from "@/contracts/problem-details";
import { cursorPaginationQuerySchema, paginatedResponse } from "@/contracts/schemas/common";
import { getActivityPage } from "@/app/(app)/saved/_lib/queries";

const activityQuerySchema = cursorPaginationQuerySchema.extend({
  propertyId: z.string().optional(),
  category: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
});

/** GET /api/v1/activity — cursor-paginated activity feed for the signed-in user. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireSessionUserId();
  const query = activityQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  const page = await getActivityPage(userId, {
    cursor: query.cursor,
    limit: query.limit,
    propertyId: query.propertyId,
    category: query.category,
    from: query.from,
    to: query.to,
    q: query.q,
  });

  return Response.json(paginatedResponse(page.items, page.nextCursor, page.hasMore));
});
