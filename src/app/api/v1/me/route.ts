import { NextResponse } from "next/server";
import { getSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { getCurrentEntitlementSummary } from "@/server/domains/billing/entitlements";
import { withErrorHandling } from "@/contracts/problem-details";

/**
 * Returns the current session's identity + plan/usage snapshot, used by the
 * app header, avatar menu, usage page, and billing page so none of them
 * need to re-implement entitlement math.
 */
export const GET = withErrorHandling(async () => {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ authenticated: false, user: null, entitlement: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      imageUrl: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null, entitlement: null });
  }

  const entitlement = await getCurrentEntitlementSummary(user.id);

  return NextResponse.json({ authenticated: true, user, entitlement });
});
