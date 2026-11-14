"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

/**
 * Cancels the current paid subscription by downgrading to the Free plan via
 * the local `/api/v1/billing/change-plan` stand-in route. See
 * plan-comparison-grid.tsx for why this doesn't hit a real billing provider.
 */
export function CancelSubscriptionButton({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function confirm() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "free" }),
      });
      if (!res.ok) throw new Error("Cancellation failed.");
      toast({
        variant: "success",
        title: "Subscription cancelled",
        description: "You've been moved to the Free plan.",
      });
      setOpen(false);
      router.refresh();
    } catch {
      toast({
        variant: "error",
        title: "Couldn't cancel subscription",
        description: "Please try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        Cancel Subscription
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader
            title="Cancel subscription?"
            description="This downgrades you to the Free plan immediately."
            onClose={() => setOpen(false)}
          />
          <p className="text-sm text-muted-foreground">
            You&apos;ll keep access to your saved reports, but future research will use the Free
            plan&apos;s lifetime lookup allowance. This demo build has no live billing provider
            connected, so no charge is reversed — see Billing for details.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Keep Plan
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={submitting}>
              {submitting ? "Cancelling…" : "Cancel Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
