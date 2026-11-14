import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { withErrorHandling, badRequest, unprocessable } from "@/contracts/problem-details";

/**
 * Our own `User` profile fields (firstName/lastName). This is legitimate,
 * app-owned data — not a Clerk-managed credential — so a real read/write API
 * is appropriate here (unlike password/connected-accounts, see
 * src/components/account/account-dialog.tsx).
 */
const patchSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(60),
  lastName: z.string().trim().min(1, "Last name is required.").max(60),
});

export const GET = withErrorHandling(async () => {
  const userId = await requireSessionUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true, imageUrl: true },
  });
  if (!user) {
    return badRequest("User record could not be found for the current session.");
  }
  return NextResponse.json({ user });
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const userId = await requireSessionUserId();
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return unprocessable(parsed.error);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    },
    select: { id: true, email: true, firstName: true, lastName: true, imageUrl: true },
  });

  return NextResponse.json({ user });
});
