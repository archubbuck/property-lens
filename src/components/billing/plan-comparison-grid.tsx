"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn, formatCurrency } from "@/lib/utils";

export type PlanDTO = {
  tier: "free" | "explorer" | "investor" | "professional";
  name: string;
  description: string;
  priceCents: number;
  billingInterval: "lifetime" | "monthly";
  lookupAllowance: number | null;
  isMostPopular: boolean;
  sortOrder: number;
  features: string[];
};

function priceLabel(plan: PlanDTO): string {
  if (plan.priceCents === 0) return "$0";
  return formatCurrency(plan.priceCents / 100, plan.priceCents % 100 === 0 ? 0 : 2);
}

/**
 * Plan comparison grid with upgrade/downgrade actions. There is no real
 * billing provider wired up yet (SPECIFICATION.md 10.2 flags the provider
 * choice as a pending external decision), so a confirmed plan change calls
 * the local `/api/v1/billing/change-plan` stand-in route directly instead of
 * redirecting to a real checkout — never a real charge, hence "Plan
 * updated" rather than "Payment successful" messaging.
 */
export function PlanComparisonGrid({
  plans,
  currentTier,
  currentSortOrder,
}: {
  plans: PlanDTO[];
  currentTier: string;
  currentSortOrder: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingPlan, setPendingPlan] = useState<PlanDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function confirmChange() {
    if (!pendingPlan) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: pendingPlan.tier }),
      });
      if (!res.ok) throw new Error("Plan change failed.");
      toast({
        variant: "success",
        title: "Plan updated",
        description: `You're now on the ${pendingPlan.name} plan.`,
      });
      setPendingPlan(null);
      router.refresh();
    } catch {
      toast({
        variant: "error",
        title: "Couldn't update plan",
        description: "Please try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isUpgrade = plan.sortOrder > currentSortOrder;

          return (
            <Card
              key={plan.tier}
              className={cn(
                "relative flex flex-col",
                isCurrent && "border-primary ring-1 ring-primary",
                plan.isMostPopular && !isCurrent && "border-primary/60"
              )}
            >
              {plan.isMostPopular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-transparent bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <h3 className="font-serif text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <span className="font-serif text-3xl font-bold">{priceLabel(plan)}</span>
                  {plan.billingInterval === "monthly" && (
                    <span className="text-sm text-muted-foreground"> / month</span>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.lookupAllowance === null
                      ? "Unlimited lookups"
                      : plan.billingInterval === "lifetime"
                        ? `${plan.lookupAllowance} lifetime lookups`
                        : `${plan.lookupAllowance} lookups per month`}
                  </p>
                </div>
                <ul className="flex-1 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="secondary" disabled className="w-full">
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    variant={isUpgrade ? "primary" : "outline"}
                    className="w-full"
                    onClick={() => setPendingPlan(plan)}
                  >
                    {isUpgrade ? "Upgrade" : "Downgrade"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={pendingPlan !== null} onOpenChange={(open) => !open && setPendingPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader
            title={`Switch to ${pendingPlan?.name ?? ""}`}
            description="This is a demo billing flow — no real payment is processed."
            onClose={() => setPendingPlan(null)}
          />
          <p className="text-sm text-muted-foreground">
            Your plan and lookup allowance update immediately. This stands in for a real
            billing-provider checkout + webhook flow, which is a pending integration decision per
            the product specification.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingPlan(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={confirmChange} disabled={submitting}>
              {submitting ? "Updating…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
