import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/infrastructure/database/prisma";
import { requireSessionUserId } from "@/server/auth/session";
import { withErrorHandling } from "@/contracts/problem-details";
import { cursorPaginationQuerySchema, paginatedResponse } from "@/contracts/schemas/common";

const createTicketSchema = z.object({
  category: z.string().min(1).max(64),
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(2000),
  propertyId: z.string().min(1).max(64).optional(),
  reportId: z.string().min(1).max(64).optional(),
});

/** User's own support tickets, most recently updated first. */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireSessionUserId();
  const { cursor, limit } = cursorPaginationQuerySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = tickets.length > limit;
  const page = hasMore ? tickets.slice(0, limit) : tickets;

  return NextResponse.json(
    paginatedResponse(page, hasMore ? page[page.length - 1].id : null, hasMore)
  );
});

/** Creates a support ticket and its initial message in one transaction. */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireSessionUserId();
  const body = createTicketSchema.parse(await request.json());

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      category: body.category,
      subject: body.subject,
      propertyId: body.propertyId,
      reportId: body.reportId,
      messages: {
        create: { authorId: userId, body: body.message },
      },
    },
    include: { messages: true },
  });

  return NextResponse.json({ ticket, schemaVersion: "1.0" }, { status: 201 });
});
