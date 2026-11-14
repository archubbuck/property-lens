import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Identity abstraction.
 *
 * PropertyLens is specified to use Clerk for production identity (sign-in/up,
 * MFA, OAuth, webhooks). Real Clerk keys are an external credential this
 * agent cannot provision (see docs/operations/external-setup.md). To keep
 * the application fully functional and testable without those credentials,
 * this module provides a signed-cookie "dev session" that stands in for a
 * Clerk session whenever `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is not set.
 *
 * When Clerk keys ARE configured, swap the implementations below for
 * `@clerk/nextjs/server`'s `auth()`/`currentUser()` — the call sites
 * (`getSessionUserId`, `requireSessionUserId`) are designed to be the only
 * integration seam the rest of the app depends on.
 */

export const DEV_SESSION_COOKIE = "pl_dev_session";
const DEV_SESSION_SECRET = process.env.CLERK_SECRET_KEY || "dev-only-insecure-secret";

export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

function sign(value: string): string {
  return crypto.createHmac("sha256", DEV_SESSION_SECRET).update(value).digest("hex");
}

export function createDevSessionToken(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function verifyDevSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [userId, signature] = token.split(".");
  if (!userId || !signature) return null;
  const expected = sign(userId);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return userId;
}

/** Returns the authenticated user's internal User.id, or null if unauthenticated. */
export async function getSessionUserId(): Promise<string | null> {
  if (isClerkConfigured()) {
    // Production/real-Clerk path. Dynamically imported so the dev-mode build
    // never requires Clerk keys to compile or run.
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;
    const { prisma } = await import("@/server/infrastructure/database/prisma");
    const user = await prisma.user.findUnique({ where: { clerkId } });
    return user?.id ?? null;
  }

  const store = await cookies();
  const token = store.get(DEV_SESSION_COOKIE)?.value;
  return verifyDevSessionToken(token);
}

export async function requireSessionUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new AuthenticationError("Authentication required.");
  }
  return userId;
}

export class AuthenticationError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "AuthenticationError";
  }
}
