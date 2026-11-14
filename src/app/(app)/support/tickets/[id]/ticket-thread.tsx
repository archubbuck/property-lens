"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn, formatRelativeTime } from "@/lib/utils";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

export function TicketThread({
  ticketId,
  currentUserId,
  initialMessages,
}: {
  ticketId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReply(event: React.FormEvent) {
    event.preventDefault();
    const body = reply.trim();
    if (body.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        setError(problem?.detail ?? "Couldn't send your reply. Please try again.");
        return;
      }

      const data = await response.json();
      setMessages((current) => [
        ...current,
        {
          id: data.message.id,
          body: data.message.body,
          createdAt: data.message.createdAt,
          authorId: currentUserId,
          authorName: "You",
        },
      ]);
      setReply("");
      toast({ variant: "success", title: "Reply sent" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="divide-y divide-border">
      <ul className="divide-y divide-border">
        {messages.map((message) => {
          const isOwn = message.authorId === currentUserId;
          return (
            <li key={message.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {isOwn ? "You" : message.authorName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(message.createdAt)}
                </span>
              </div>
              <p
                className={cn(
                  "mt-2 whitespace-pre-wrap rounded-lg p-3 text-sm",
                  isOwn ? "bg-secondary/60" : "bg-muted"
                )}
              >
                {message.body}
              </p>
            </li>
          );
        })}
      </ul>

      <form className="space-y-3 p-5" onSubmit={handleReply}>
        {error && <p className="text-sm text-risk-critical">{error}</p>}
        <Textarea
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          placeholder="Write a reply..."
          className="min-h-24"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting || reply.trim().length === 0}>
            <Send className="h-4 w-4" />
            {submitting ? "Sending…" : "Send Reply"}
          </Button>
        </div>
      </form>
    </div>
  );
}
