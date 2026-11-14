import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/infrastructure/database/prisma";
import { requireSessionUserId } from "@/server/auth/session";
import { withErrorHandling, notFound } from "@/contracts/problem-details";

const createMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

/** Appends a reply message to a ticket the caller owns. */
export const POST = withErrorHandling(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await requireSessionUserId();
    const { id } = await params;
    const { body } = createMessageSchema.parse(await request.json());

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket || ticket.userId !== userId) return notFound("Support ticket not found.");

    const message = await prisma.supportMessage.create({
      data: { ticketId: ticket.id, authorId: userId, body },
    });

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "waiting" },
    });

    return NextResponse.json({ message, schemaVersion: "1.0" }, { status: 201 });
  }
);
