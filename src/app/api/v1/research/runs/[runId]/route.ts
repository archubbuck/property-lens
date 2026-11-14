import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/infrastructure/database/prisma";
import { withErrorHandling, notFound } from "@/contracts/problem-details";
import { advanceRun } from "@/app/api/v1/research/_lib/run-engine";

/**
 * Polled by the research-in-progress screen every ~1.5s. Advances the
 * simulated run's stages based on elapsed wall-clock time, persists the
 * result, and returns the current stage tracker so progress survives
 * navigating away and back.
 */
export const GET = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ runId: string }> }) => {
    const { runId } = await context.params;

    const existing = await prisma.researchRun.findUnique({
      where: { id: runId },
      select: { id: true },
    });
    if (!existing) return notFound("Research run not found.");

    const run = await advanceRun(runId);
    if (!run) return notFound("Research run not found.");

    const property = await prisma.property.findUnique({
      where: { id: run.propertyId },
      select: {
        id: true,
        isDemoSample: true,
        addresses: {
          where: { isPrimary: true },
          take: 1,
          select: { line1: true, city: true, state: true, postalCode: true },
        },
      },
    });

    return NextResponse.json({
      run: {
        id: run.id,
        status: run.status,
        isSample: run.isSample,
        startedAt: run.startedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
        errorMessage: run.errorMessage,
      },
      property: property
        ? {
            id: property.id,
            isDemoSample: property.isDemoSample,
            address: property.addresses[0] ?? null,
          }
        : null,
      stages: run.stages.map((stage) => ({
        key: stage.key,
        label: stage.label,
        status: stage.status,
        startedAt: stage.startedAt?.toISOString() ?? null,
        completedAt: stage.completedAt?.toISOString() ?? null,
        sortOrder: stage.sortOrder,
      })),
      schemaVersion: "1.0",
    });
  }
);
