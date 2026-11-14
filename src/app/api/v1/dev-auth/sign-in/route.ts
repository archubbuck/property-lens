import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/infrastructure/database/prisma";
import { ensureUserProvisioned } from "@/server/domains/users/provisioning";
import { createDevSessionToken, isClerkConfigured, DEV_SESSION_COOKIE } from "@/server/auth/session";

const bodySchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
});

/**
 * Development-only identity endpoint. Stands in for Clerk sign-in/sign-up
 * while no Clerk keys are configured (see src/server/auth/session.ts). Never
 * enabled once `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set.
 */
export async function POST(request: Request) {
  if (isClerkConfigured()) {
    return NextResponse.json(
      { type: "about:blank", title: "Not found", status: 404 },
      { status: 404 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "Invalid request",
        status: 422,
        errors: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  const user =
    existing ??
    (await ensureUserProvisioned({
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    }));

  const response = NextResponse.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  });

  response.cookies.set(DEV_SESSION_COOKIE, createDevSessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
