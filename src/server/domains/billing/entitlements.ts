import { prisma } from "@/server/infrastructure/database/prisma";

export interface EntitlementSummary {
  tier: "free" | "explorer" | "investor" | "professional";
  planName: string;
  isLifetime: boolean;
  lookupAllowance: number | null;
  used: number;
  remaining: number | null;
  periodStart: Date;
  periodEnd: Date | null;
}

/**
 * Resolves the user's current entitlement period (the most recently created
 * one — a new period is minted whenever a subscription renews/changes tier)
 * and tallies consumption from the append-only UsageLedgerEntry log.
 *
 * Per SPECIFICATION.md section 5: usage history is append-only, credits are
 * reserved before a research run starts and settled/released afterward, so
 * "used" here reflects settled + still-reserved consumption (reservation +
 * settlement entries are negative; release/adjustment entries restore them).
 */
export async function getCurrentEntitlementSummary(
  userId: string,
): Promise<EntitlementSummary | null> {
  const period = await prisma.entitlementPeriod.findFirst({
    where: { userId },
    orderBy: { periodStart: "desc" },
    include: {
      subscription: { include: { plan: true } },
      usageLedgerEntries: { select: { amount: true } },
    },
  });

  if (!period) return null;

  const consumed = period.usageLedgerEntries.reduce(
    (sum, entry) => sum + (entry.amount < 0 ? Math.abs(entry.amount) : 0),
    0,
  );
  const restored = period.usageLedgerEntries.reduce(
    (sum, entry) => sum + (entry.amount > 0 ? entry.amount : 0),
    0,
  );
  const used = Math.max(consumed - restored, 0);

  const plan = period.subscription?.plan;

  return {
    tier: period.tier,
    planName: plan?.name ?? (period.tier === "free" ? "Free" : period.tier),
    isLifetime: period.isLifetime,
    lookupAllowance: period.lookupAllowance,
    used,
    remaining:
      period.lookupAllowance === null ? null : Math.max(period.lookupAllowance - used, 0),
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
  };
}
