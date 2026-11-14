import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthenticationError } from "@/server/auth/session";

/**
 * RFC 9457 Problem Details helper. Every API error response (4xx/5xx) should
 * be produced through this helper so error shapes stay consistent across the
 * whole `/api/v1` surface (see SPECIFICATION.md section 5.1).
 */
export function problem(
  status: number,
  title: string,
  detail?: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      type: "about:blank",
      title,
      status,
      detail,
      requestId: crypto.randomUUID(),
      ...extra,
    },
    { status, headers: { "Content-Type": "application/problem+json" } }
  );
}

export function notFound(detail = "The requested resource was not found.") {
  return problem(404, "Not Found", detail);
}

export function forbidden(detail = "You do not have access to this resource.") {
  return problem(403, "Forbidden", detail);
}

export function unauthorized(detail = "Authentication is required.") {
  return problem(401, "Unauthorized", detail);
}

export function badRequest(detail: string, errors?: unknown) {
  return problem(400, "Bad Request", detail, errors ? { errors } : undefined);
}

export function unprocessable(error: ZodError) {
  return problem(422, "Unprocessable Entity", "Request validation failed.", {
    errors: error.flatten(),
  });
}

/**
 * Wraps a Next.js route handler, converting known domain errors into
 * Problem Details responses. Preserves the handler's parameters (request,
 * and for dynamic routes, `{ params }`) so it works for both
 * `export const GET = withErrorHandling(async (request) => {...})` and
 * `export const GET = withErrorHandling(async (request, { params }) => {...})`.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error: unknown) {
      if (error instanceof AuthenticationError) return unauthorized(error.message);
      if (error instanceof ZodError) return unprocessable(error);
      console.error(error);
      return problem(500, "Internal Server Error", "An unexpected error occurred.");
    }
  };
}
