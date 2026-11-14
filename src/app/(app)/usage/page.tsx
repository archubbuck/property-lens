import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Layers, Sparkles } from "lucide-react";
import { getSessionUserId } from "@/server/auth/session";
import { getCurrentEntitlementSummary } from "@/server/domains/billing/entitlements";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AllowanceProgress } from "@/components/billing/allowance-progress";
import { UsageLedgerTable } from "@/components/billing/usage-ledger-table";
import { formatDate } from "@/lib/utils";

export default async function UsagePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in");

  const entitlement = await getCurrentEntitlementSummary(userId);

  if (!entitlement) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <header>
          <h1 className="font-serif text-3xl font-bold">Usage</h1>
          <p className="mt-1 text-muted-foreground">
            Track your lookups, view your history, and monitor your plan limits.
          </p>
        </header>
        <EmptyState
          icon={Layers}
          title="No plan set up yet"
          description="Visit Billing to choose a plan and start tracking your lookup usage."
          action={
            <Link href="/billing" className={buttonVariants({ variant: "primary" })}>
              Go to Billing
            </Link>
          }
        />
      </div>
    );
  }

  const { tier, planName, isLifetime, lookupAllowance, used, remaining, periodEnd } = entitlement;
  const nearLimit =
    lookupAllowance !== null &&
    remaining !== null &&
    remaining <= Math.max(1, Math.ceil(lookupAllowance * 0.2));
  const showUpgradeCta = tier === "free" || nearLimit;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header>
        <h1 className="font-serif text-3xl font-bold">Usage</h1>
        <p className="mt-1 text-muted-foreground">
          Track your lookups, view your history, and monitor your plan limits.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/30 bg-accent/40">
          <CardHeader>
            <span className="inline-flex w-fit rounded-md bg-primary/10 p-2 text-primary">
              <Layers className="h-5 w-5" />
            </span>
            <CardDescription>Current Plan</CardDescription>
            <CardTitle className="text-2xl">{planName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {lookupAllowance === null
                ? "Unlimited lookups"
                : isLifetime
                  ? `${lookupAllowance} lifetime lookups`
                  : `${lookupAllowance} lookups per month`}
            </p>
            <Badge variant="success">Active</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>This Period&apos;s Usage</CardTitle>
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {lookupAllowance === null ? `${used} used` : `${used} of ${lookupAllowance} used`}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <AllowanceProgress used={used} allowance={lookupAllowance} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {lookupAllowance === null ? "No limit on this plan" : `${remaining} lookups remaining`}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {isLifetime
                  ? "Lifetime — does not reset"
                  : periodEnd
                    ? `Resets ${formatDate(periodEnd)}`
                    : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {showUpgradeCta && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium">
                  {tier === "free"
                    ? "Upgrade for more monthly lookups"
                    : "You're running low on lookups"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tier === "free"
                    ? "Free gives you 5 lifetime lookups. Upgrade to a monthly plan for recurring research credits."
                    : "Upgrade your plan to avoid running out before your next reset."}
                </p>
              </div>
            </div>
            <Link href="/billing" className={buttonVariants({ variant: "primary" })}>
              View Plans
            </Link>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="font-serif text-xl font-semibold">Recent Lookups</h2>
        <Card>
          <CardContent className="p-5">
            <UsageLedgerTable />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
