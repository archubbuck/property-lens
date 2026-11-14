"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Send } from "lucide-react";
import { Label, Textarea } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";

const MESSAGE_MAX = 2000;

export function NewTicketForm({ topics }: { topics: { slug: string; title: string }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const nextErrors: Record<string, string> = {};
    if (!category) nextErrors.category = "Please select a topic.";
    if (subject.trim().length < 3) nextErrors.subject = "Subject must be at least 3 characters.";
    if (message.trim().length < 10) nextErrors.message = "Message must be at least 10 characters.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject: subject.trim(), message: message.trim() }),
      });

      if (!response.ok) {
        const problem = await response.json().catch(() => null);
        setFormError(problem?.detail ?? "Something went wrong. Please try again.");
        return;
      }

      const data = await response.json();
      toast({
        variant: "success",
        title: "Message sent",
        description: "Our team will respond to your ticket soon.",
      });
      router.push(`/support/tickets/${data.ticket.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {formError && <Alert variant="critical">{formError}</Alert>}

      <div className="space-y-1.5">
        <Label htmlFor="category">
          What can we help you with? <span className="text-risk-critical">*</span>
        </Label>
        <div className="relative">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Select
            id="category"
            className="pl-10"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Select a topic</option>
            {topics.map((topic) => (
              <option key={topic.slug} value={topic.slug}>
                {topic.title}
              </option>
            ))}
            <option value="other">Something else</option>
          </Select>
        </div>
        {errors.category && <p className="text-sm text-risk-critical">{errors.category}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subject">
          Subject <span className="text-risk-critical">*</span>
        </Label>
        <Input
          id="subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Briefly describe your request"
          maxLength={200}
        />
        {errors.subject && <p className="text-sm text-risk-critical">{errors.subject}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">
          Message <span className="text-risk-critical">*</span>
        </Label>
        <Textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value.slice(0, MESSAGE_MAX))}
          placeholder="Tell us more about what you need, including any details that might help us resolve it faster."
          className="min-h-40"
        />
        <p className="text-right text-xs text-muted-foreground">
          {message.length} / {MESSAGE_MAX}
        </p>
        {errors.message && <p className="text-sm text-risk-critical">{errors.message}</p>}
      </div>

      <Alert variant="neutral">
        Your information is secure. Messages are only accessible to our support team.
      </Alert>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/help")}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          <Send className="h-4 w-4" />
          {submitting ? "Sending…" : "Send Message"}
        </Button>
      </div>
    </form>
  );
}
