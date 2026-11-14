import { redirect, notFound } from "next/navigation";
import { getSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { TicketThread } from "./ticket-thread";
import type { VariantProps } from "class-variance-authority";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  return { title: ticket ? `${ticket.subject} | Support | PropertyLens` : "Support Ticket" };
}

const STATUS_VARIANT: Record<string, VariantProps<typeof badgeVariants>["variant"]> = {
  open: "info",
  waiting: "moderate",
  resolved: "success",
  closed: "unknown",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  waiting: "Waiting on us",
  resolved: "Resolved",
  closed: "Closed",
};

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) redirect(`/sign-in?redirect_url=/support/tickets/${id}`);

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" }, include: { author: true } } },
  });

  if (!ticket || ticket.userId !== userId) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: "Help & Support", href: "/help" },
          { label: "Support Tickets", href: "/support/new" },
          { label: ticket.subject },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ticket #{ticket.id.slice(-8).toUpperCase()} · Opened {formatDate(ticket.createdAt)} ·{" "}
            {ticket.category}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[ticket.status] ?? "default"}>
          {STATUS_LABEL[ticket.status] ?? ticket.status}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <TicketThread
            ticketId={ticket.id}
            currentUserId={userId}
            initialMessages={ticket.messages.map((message) => ({
              id: message.id,
              body: message.body,
              createdAt: message.createdAt.toISOString(),
              authorId: message.authorId,
              authorName:
                [message.author.firstName, message.author.lastName].filter(Boolean).join(" ") ||
                message.author.email,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
