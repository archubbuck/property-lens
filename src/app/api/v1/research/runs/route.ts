import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/server/infrastructure/database/prisma";
import { getSessionUserId } from "@/server/auth/session";
import { getCurrentEntitlementSummary } from "@/server/domains/billing/entitlements";
import { withErrorHandling, problem, badRequest } from "@/contracts/problem-details";
import {
  isDemoAddress,
  parseFreeTextAddress,
  slugifyAddress,
} from "@/app/api/v1/research/_lib/address";
import { STAGES } from "@/app/api/v1/research/_lib/run-engine";

const startRunSchema = z.object({
  address: z.string().trim().min(3, "Enter a valid address.").max(300),
});

/**
 * Starts a research run for the given address. The seeded demo property
 * resolves to (and reuses) its existing completed sample run at no cost;
 * any other address requires sign-in, reserves one lookup credit (if
 * available), and runs the full simulated stage sequence toward an honest
 * "not yet available" outcome — see run-engine.ts.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const { address } = startRunSchema.parse(await request.json());

  if (isDemoAddress(address)) {
    const property = await prisma.property.findFirst({ where: { isDemoSample: true } });
    if (!property) {
      return problem(500, "Demo Property Missing", "The sample property has not been seeded.");
    }
    const run = await prisma.researchRun.findFirst({
      where: { propertyId: property.id, isSample: true },
      orderBy: { startedAt: "desc" },
    });
    if (!run) {
      return problem(500, "Demo Run Missing", "The sample research run has not been seeded.");
    }
    return NextResponse.json({ runId: run.id, isDemo: true }, { status: 201 });
  }

  const userId = await getSessionUserId();
  if (!userId) {
    return problem(
      401,
      "Sign In Required",
      "Sign in to research a new address. The sample property is always free to explore."
    );
  }

  const entitlement = await getCurrentEntitlementSummary(userId);
  if (!entitlement) {
    return badRequest("No active plan found for this account.");
  }
  if (entitlement.remaining !== null && entitlement.remaining <= 0) {
    return problem(
      403,
      "Lookup Limit Reached",
      "You've used all of your lookups for this period. Upgrade your plan to research more properties, or try the free sample property.",
      { upgradeRequired: true }
    );
  }

  const entitlementPeriod = await prisma.entitlementPeriod.findFirst({
    where: { userId },
    orderBy: { periodStart: "desc" },
  });
  if (!entitlementPeriod) {
    return badRequest("No active plan found for this account.");
  }

  const parsed = parseFreeTextAddress(address);
  const normalizedKey = slugifyAddress(address);

  let propertyAddress = await prisma.propertyAddress.findUnique({ where: { normalizedKey } });
  let propertyId: string;
  if (propertyAddress) {
    propertyId = propertyAddress.propertyId;
  } else {
    const property = await prisma.property.create({
      data: { propertyType: "unknown", isDemoSample: false },
    });
    propertyAddress = await prisma.propertyAddress.create({
      data: {
        propertyId: property.id,
        line1: parsed.line1,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        isPrimary: true,
        normalizedKey,
      },
    });
    propertyId = property.id;
  }

  const idempotencyKey = crypto.randomUUID();

  const run = await prisma.researchRun.create({
    data: {
      userId,
      propertyId,
      idempotencyKey,
      researchProfile: "standard",
      status: "queued",
      isSample: false,
      startedAt: new Date(),
      stages: {
        create: STAGES.map((stage, index) => ({
          key: stage.key,
          label: stage.label,
          status: "pending",
          sortOrder: index,
        })),
      },
    },
  });

  await prisma.$transaction([
    prisma.creditReservation.create({
      data: {
        userId,
        entitlementPeriodId: entitlementPeriod.id,
        researchRunId: run.id,
        idempotencyKey,
        status: "reserved",
      },
    }),
    prisma.usageLedgerEntry.create({
      data: {
        userId,
        entitlementPeriodId: entitlementPeriod.id,
        type: "reservation",
        amount: -1,
        researchRunId: run.id,
        reason: "Research lookup reserved.",
      },
    }),
  ]);

  return NextResponse.json({ runId: run.id, isDemo: false }, { status: 201 });
});
