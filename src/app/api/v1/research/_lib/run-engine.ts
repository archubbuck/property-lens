import { prisma } from "@/server/infrastructure/database/prisma";
import type { RunStatus } from "@/contracts/schemas/common";

/**
 * Simulated research run engine. There is no durable job queue or real
 * external data/AI integration wired up in this environment (see
 * docs/operations/external-setup.md), so stage progress is derived
 * deterministically from wall-clock time elapsed since the run started and
 * persisted to the database on every read/poll. This keeps progress honest
 * (no fabricated countdowns) and safe to resume after navigating away, per
 * SPECIFICATION.md section 8.1.
 */

export const STAGES = [
  { key: "address_resolution", label: "Address & Location", status: "resolving" as RunStatus },
  { key: "parcel_identification", label: "Parcel Identification", status: "resolving" as RunStatus },
  { key: "property_records", label: "Property Records", status: "retrieving" as RunStatus },
  { key: "zoning_land_use", label: "Zoning & Land Use", status: "retrieving" as RunStatus },
  { key: "risk_environmental", label: "Risk & Environmental", status: "analyzing" as RunStatus },
  { key: "market_analysis", label: "Market Analysis", status: "analyzing" as RunStatus },
  { key: "report_assembly", label: "Report Assembly", status: "assembling" as RunStatus },
];

export const STAGE_DURATION_MS = 2200;

export const UNAVAILABLE_MESSAGE =
  "Real address resolution requires external public-records and AI provider credentials that are not yet configured in this environment. We couldn't produce a verified report for this address. Try the sample property below for a fully working example, or check back once those integrations are enabled.";

const TERMINAL_STATUSES: RunStatus[] = ["completed", "partial", "failed", "cancelled"];

async function releaseReservationIfNeeded(researchRunId: string) {
  const reservation = await prisma.creditReservation.findUnique({
    where: { researchRunId },
  });
  if (!reservation || reservation.status !== "reserved") return;

  await prisma.$transaction([
    prisma.creditReservation.update({
      where: { id: reservation.id },
      data: { status: "released", releasedAt: new Date() },
    }),
    prisma.usageLedgerEntry.create({
      data: {
        userId: reservation.userId,
        entitlementPeriodId: reservation.entitlementPeriodId,
        type: "release",
        amount: 1,
        researchRunId,
        reason: "Research run ended without a usable report; reservation released.",
      },
    }),
  ]);
}

/**
 * Advances a run's stages based on elapsed time and persists the result.
 * Safe to call repeatedly (idempotent) — a terminal run is returned as-is.
 */
export async function advanceRun(runId: string) {
  const run = await prisma.researchRun.findUnique({
    where: { id: runId },
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
      property: { select: { isDemoSample: true } },
    },
  });
  if (!run) return null;
  if (TERMINAL_STATUSES.includes(run.status as RunStatus)) return run;

  const now = new Date();
  const elapsed = now.getTime() - run.startedAt.getTime();
  const targetComplete = Math.min(
    STAGES.length,
    Math.max(0, Math.floor(elapsed / STAGE_DURATION_MS))
  );

  const stageUpdates: Array<{ id: string; status: string; startedAt: Date; completedAt?: Date }> = [];
  for (let i = 0; i < run.stages.length; i++) {
    const stage = run.stages[i]!;
    if (i < targetComplete && stage.status !== "complete") {
      stageUpdates.push({
        id: stage.id,
        status: "complete",
        startedAt: stage.startedAt ?? new Date(run.startedAt.getTime() + i * STAGE_DURATION_MS),
        completedAt: new Date(run.startedAt.getTime() + (i + 1) * STAGE_DURATION_MS),
      });
    } else if (i === targetComplete && stage.status === "pending") {
      stageUpdates.push({ id: stage.id, status: "in_progress", startedAt: now });
    }
  }

  const allComplete = targetComplete >= STAGES.length;
  const nextRunStatus: RunStatus = allComplete
    ? run.property.isDemoSample
      ? "completed"
      : "failed"
    : (STAGES[targetComplete]?.status ?? "assembling");

  await prisma.$transaction([
    ...stageUpdates.map((update) =>
      prisma.researchStage.update({
        where: { id: update.id },
        data: {
          status: update.status,
          startedAt: update.startedAt,
          ...(update.completedAt ? { completedAt: update.completedAt } : {}),
        },
      })
    ),
    prisma.researchRun.update({
      where: { id: runId },
      data: {
        status: nextRunStatus,
        ...(allComplete
          ? {
              completedAt: now,
              errorMessage: run.property.isDemoSample ? null : UNAVAILABLE_MESSAGE,
            }
          : {}),
      },
    }),
  ]);

  if (allComplete && !run.property.isDemoSample) {
    await releaseReservationIfNeeded(runId);
  }

  return prisma.researchRun.findUnique({
    where: { id: runId },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function cancelRun(runId: string, userId: string | null) {
  const run = await prisma.researchRun.findUnique({ where: { id: runId } });
  if (!run) return null;
  if (TERMINAL_STATUSES.includes(run.status as RunStatus)) return run;
  if (userId && run.userId && run.userId !== userId) return "forbidden" as const;

  await prisma.$transaction([
    prisma.researchStage.updateMany({
      where: { researchRunId: runId, status: { in: ["pending", "in_progress"] } },
      data: { status: "skipped" },
    }),
    prisma.researchRun.update({
      where: { id: runId },
      data: { status: "cancelled", completedAt: new Date() },
    }),
  ]);

  await releaseReservationIfNeeded(runId);

  return prisma.researchRun.findUnique({ where: { id: runId } });
}
