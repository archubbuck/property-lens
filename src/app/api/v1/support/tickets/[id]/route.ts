import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/infrastructure/database/prisma";
import { requireSessionUserId } from "@/server/auth/session";
import { withErrorHandling, notFound } from "@/contracts/problem-details";

/**
 * Ticket detail with its message thread. Scoped to the owning user; a ticket
 * that exists but belongs to someone else is reported as not-found (rather
 * than 403) to avoid confirming other users' ticket IDs exist.
 */
export const GET = withErrorHandling(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await requireSessionUserId();
    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" }, include: { author: true } },
        attachments: true,
      },
    });

    if (!ticket || ticket.userId !== userId) return notFound("Support ticket not found.");

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status,
        propertyId: ticket.propertyId,
        reportId: ticket.reportId,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        messages: ticket.messages.map((message) => ({
          id: message.id,
          body: message.body,
          createdAt: message.createdAt,
          authorId: message.authorId,
          isOwnMessage: message.authorId === userId,
          author: {
            firstName: message.author.firstName,
            lastName: message.author.lastName,
            email: message.author.email,
          },
        })),
        attachments: ticket.attachments,
      },
      schemaVersion: "1.0",
    });
  }
);
