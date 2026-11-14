import { prisma } from "@/server/infrastructure/database/prisma";

/**
 * Creates (or returns) the local User row plus its default preferences and
 * free-tier lifetime entitlement. Mirrors what a verified Clerk `user.created`
 * webhook would do in production (see docs/operations/external-setup.md) so
 * swapping in real Clerk later does not change downstream behavior.
 */
export async function ensureUserProvisioned(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  clerkId?: string | null;
  imageUrl?: string | null;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return existing;

  const user = await prisma.user.create({
    data: {
      email: input.email,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      clerkId: input.clerkId ?? null,
      imageUrl: input.imageUrl ?? null,
      preferences: { create: {} },
      notificationPreference: { create: {} },
      entitlementPeriods: {
        create: {
          tier: "free",
          lookupAllowance: 5,
          isLifetime: true,
          periodStart: new Date(),
          periodEnd: null,
        },
      },
    },
  });

  await prisma.activityEvent.create({
    data: {
      userId: user.id,
      category: "account_created",
      title: "Account created",
      description: "Welcome to PropertyLens — you have 5 free lifetime lookups.",
    },
  });

  return user;
}
