import { NextRequest, NextResponse } from "next/server";
import { requireSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { getCurrentEntitlementSummary } from "@/server/domains/billing/entitlements";
import { withErrorHandling } from "@/contracts/problem-details";
import { cursorPaginationQuerySchema, paginatedResponse } from "@/contracts/schemas/common";

/**
 * Lookup-credit ledger for the Usage page: the current entitlement summary
 * plus a cursor-paginated view of the append-only UsageLedgerEntry log
 * (newest first), per SPECIFICATION.md section 10.1.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireSessionUserId();
  const { cursor, limit } = cursorPaginationQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  const entitlement = await getCurrentEntitlementSummary(userId);

  const entries = await prisma.usageLedgerEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      researchRun: {
        select: {
          id: true,
          status: true,
          property: {
            select: {
              addresses: {
                where: { isPrimary: true },
                take: 1,
                select: { line1: true, city: true, state: true },
              },
            },
          },
        },
      },
    },
  });

  const hasMore = entries.length > limit;
  const page = hasMore ? entries.slice(0, limit) : entries;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;

  const items = page.map((entry) => ({
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    reason: entry.reason,
    createdAt: entry.createdAt.toISOString(),
    researchRun: entry.researchRun
      ? {
          id: entry.researchRun.id,
          status: entry.researchRun.status,
          address: entry.researchRun.property.addresses[0]
            ? `${entry.researchRun.property.addresses[0].line1}, ${entry.researchRun.property.addresses[0].city}, ${entry.researchRun.property.addresses[0].state}`
            : null,
        }
      : null,
  }));

  return NextResponse.json({
    entitlement,
    ledger: paginatedResponse(items, nextCursor, hasMore),
  });
});
