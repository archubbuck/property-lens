import { NextRequest, NextResponse } from "next/server";
import { requireSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { withErrorHandling } from "@/contracts/problem-details";
import { cursorPaginationQuerySchema, paginatedResponse } from "@/contracts/schemas/common";

/** Billing history (invoices) for the current user's subscription, newest first. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireSessionUserId();
  const { cursor, limit } = cursorPaginationQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) {
    return NextResponse.json({ invoices: paginatedResponse([], null, false) });
  }

  const invoices = await prisma.invoice.findMany({
    where: { subscriptionId: subscription.id },
    orderBy: { issuedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = invoices.length > limit;
  const page = hasMore ? invoices.slice(0, limit) : invoices;
  const nextCursor = hasMore ? page[page.length - 1]!.id : null;

  const items = page.map((invoice) => ({
    id: invoice.id,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    status: invoice.status,
    issuedAt: invoice.issuedAt.toISOString(),
    periodDescription: invoice.periodDescription,
    receiptUrl: invoice.receiptUrl,
  }));

  return NextResponse.json({ invoices: paginatedResponse(items, nextCursor, hasMore) });
});
