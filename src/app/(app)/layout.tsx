import type { ReactNode } from "react";
import { getSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { getCurrentEntitlementSummary } from "@/server/domains/billing/entitlements";
import { AppHeader } from "@/components/layout/app-header";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const userId = await getSessionUserId();

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
    : null;

  const entitlement = user ? await getCurrentEntitlementSummary(user.id) : null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        user={user}
        entitlement={
          entitlement
            ? {
                planName: entitlement.planName,
                remaining: entitlement.remaining,
                lookupAllowance: entitlement.lookupAllowance,
              }
            : null
        }
      />
      <main>{children}</main>
    </div>
  );
}
