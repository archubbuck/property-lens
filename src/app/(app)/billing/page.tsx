import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Receipt } from "lucide-react";
import { getSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { getCurrentEntitlementSummary } from "@/server/domains/billing/entitlements";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AllowanceProgress } from "@/components/billing/allowance-progress";
import { PlanComparisonGrid, type PlanDTO } from "@/components/billing/plan-comparison-grid";
import { CancelSubscriptionButton } from "@/components/billing/cancel-subscription-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function BillingPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const [entitlement, plans, subscription] = await Promise.all([
    getCurrentEntitlementSummary(userId),
    prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.subscription.findUnique({ where: { userId } }),
  ]);

  const invoices = subscription
    ? await prisma.invoice.findMany({
        where: { subscriptionId: subscription.id },
        orderBy: { issuedAt: "desc" },
        take: 20,
      })
    : [];

  const planDtos: PlanDTO[] = plans.map((plan) => ({
    tier: plan.tier,
    name: plan.name,
    description: plan.description,
    priceCents: plan.priceCents,
    billingInterval: plan.billingInterval,
    lookupAllowance: plan.lookupAllowance,
    isMostPopular: plan.isMostPopular,
    sortOrder: plan.sortOrder,
    features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
  }));

  const header = (
    <header>
      <h1 className="font-serif text-3xl font-bold">Billing &amp; Plan</h1>
      <p className="mt-1 text-muted-foreground">
        Manage your subscription, plan, and billing history.
      </p>
    </header>
  );

  if (!entitlement) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 p-6">
        {header}
        {planDtos.length === 0 ? (
          <EmptyState title="Plans are not available yet" description="Check back shortly." />
        ) : (
          <PlanComparisonGrid plans={planDtos} currentTier="free" currentSortOrder={-1} />
        )}
      </div>
    );
  }

  const currentPlan = planDtos.find((plan) => plan.tier === entitlement.tier);
  const priceLabel = currentPlan
    ? currentPlan.priceCents === 0
      ? "Free"
      : `${formatCurrency(
          currentPlan.priceCents / 100,
          currentPlan.priceCents % 100 === 0 ? 0 : 2
        )} / month`
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {header}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/30 bg-accent/40">
          <CardHeader>
            <CardDescription>Current Plan</CardDescription>
            <CardTitle className="text-2xl">{entitlement.planName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {entitlement.lookupAllowance === null
                ? "Unlimited lookups"
                : entitlement.isLifetime
                  ? `${entitlement.lookupAllowance} lifetime lookups`
                  : `${entitlement.lookupAllowance} lookups per month`}
            </p>
            {priceLabel && <p className="font-serif text-xl font-semibold">{priceLabel}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="success">Active</Badge>
              <Link href="#plans" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Change Plan
              </Link>
              {entitlement.tier !== "free" && <CancelSubscriptionButton />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This Period&apos;s Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <AllowanceProgress used={entitlement.used} allowance={entitlement.lookupAllowance} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {entitlement.lookupAllowance === null
                  ? `${entitlement.used} used, no limit`
                  : `${entitlement.remaining} of ${entitlement.lookupAllowance} remaining`}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {entitlement.isLifetime
                  ? "Lifetime — does not reset"
                  : entitlement.periodEnd
                    ? `Next billing date ${formatDate(entitlement.periodEnd)}`
                    : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <section id="plans" className="scroll-mt-20 space-y-4">
        <div>
          <h2 className="font-serif text-xl font-semibold">Choose a Plan</h2>
          <p className="text-sm text-muted-foreground">
            Upgrade or change your plan at any time. All plans include the full property research
            report.
          </p>
        </div>
        {planDtos.length === 0 ? (
          <EmptyState title="Plans are not available yet" description="Check back shortly." />
        ) : (
          <PlanComparisonGrid
            plans={planDtos}
            currentTier={entitlement.tier}
            currentSortOrder={currentPlan?.sortOrder ?? -1}
          />
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">Billing History</h2>
        <Card>
          <CardContent className="p-5">
            {invoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No invoices yet"
                description="Invoices will appear here after your first paid billing cycle."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(invoice.issuedAt)}
                      </TableCell>
                      <TableCell>{invoice.periodDescription ?? "Subscription charge"}</TableCell>
                      <TableCell>
                        {formatCurrency(
                          invoice.amountCents / 100,
                          invoice.amountCents % 100 === 0 ? 0 : 2
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoice.status === "paid" ? "success" : "outline"}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
