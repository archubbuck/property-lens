import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/server/auth/session";
import { withErrorHandling, notFound, forbidden, badRequest } from "@/contracts/problem-details";
import { cancelRun } from "@/app/api/v1/research/_lib/run-engine";

/** Cancels an in-progress research run (safe no-op if already terminal). */
export const POST = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ runId: string }> }) => {
    const { runId } = await context.params;
    const userId = await getSessionUserId();

    const result = await cancelRun(runId, userId);
    if (result === null) return notFound("Research run not found.");
    if (result === "forbidden") return forbidden("You do not have access to this research run.");
    if (!result) return badRequest("Unable to cancel this research run.");

    return NextResponse.json({ run: { id: result.id, status: result.status } });
  }
);
