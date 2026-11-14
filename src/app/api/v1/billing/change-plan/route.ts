import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { withErrorHandling, badRequest, notFound } from "@/contracts/problem-details";
import { planTierSchema } from "@/contracts/schemas/common";

const changePlanSchema = z.object({ tier: planTierSchema });

const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Stands in for a real billing-provider (e.g. Clerk Billing / Stripe)
 * checkout + webhook flow. SPECIFICATION.md section 10.2 notes the billing
 * provider choice is a pending external decision this agent cannot
 * provision/approve; until a provider is wired up, plan changes are applied
 * directly here (updating the Subscription row and minting a new
 * EntitlementPeriod) instead of redirecting to a real checkout. No payment
 * is actually processed — see the UI copy ("Plan updated", never "Payment
 * successful").
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireSessionUserId();
  const json = await request.json().catch(() => null);
  const parsed = changePlanSchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Invalid request body.", parsed.error.flatten());
  }
  const { tier } = parsed.data;

  const plan = await prisma.plan.findUnique({ where: { tier } });
  if (!plan || !plan.active) {
    return notFound("The requested plan is not available.");
  }

  const existingSubscription = await prisma.subscription.findUnique({ where: { userId } });

  const result = await prisma.$transaction(async (tx) => {
    if (tier === "free") {
      if (existingSubscription) {
        await tx.subscription.update({
          where: { id: existingSubscription.id },
          data: { status: "cancelled", cancelAtPeriodEnd: false, currentPeriodEnd: new Date() },
        });
      }
      const period = await tx.entitlementPeriod.create({
        data: {
          userId,
          subscriptionId: null,
          tier: "free",
          lookupAllowance: plan.lookupAllowance,
          periodStart: new Date(),
          periodEnd: null,
          isLifetime: true,
        },
      });
      return { period };
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + MONTH_IN_MS);

    const subscription = existingSubscription
      ? await tx.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            planId: plan.id,
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          },
        })
      : await tx.subscription.create({
          data: {
            userId,
            planId: plan.id,
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
        });

    await tx.invoice.create({
      data: {
        subscriptionId: subscription.id,
        amountCents: plan.priceCents,
        currency: plan.currency,
        status: "paid",
        issuedAt: now,
        periodDescription: `${plan.name} Plan (Monthly)`,
      },
    });

    const period = await tx.entitlementPeriod.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        tier,
        lookupAllowance: plan.lookupAllowance,
        periodStart: now,
        periodEnd,
        isLifetime: false,
      },
    });

    return { period };
  });

  return NextResponse.json({
    ok: true,
    tier,
    planName: plan.name,
    entitlementPeriodId: result.period.id,
  });
});
