import { z } from "zod";

export const verificationSchema = z.enum([
  "verified",
  "corroborated",
  "unverified",
  "conflicting",
]);
export type Verification = z.infer<typeof verificationSchema>;

export const coverageStatusSchema = z.enum([
  "verified",
  "partial",
  "unavailable",
  "not_applicable",
]);
export type CoverageStatus = z.infer<typeof coverageStatusSchema>;

export const runStatusSchema = z.enum([
  "queued",
  "resolving",
  "retrieving",
  "analyzing",
  "assembling",
  "completed",
  "partial",
  "failed",
  "cancel_requested",
  "cancelled",
]);
export type RunStatus = z.infer<typeof runStatusSchema>;

export const severitySchema = z.enum(["critical", "high", "moderate", "low", "unknown"]);
export type Severity = z.infer<typeof severitySchema>;

export const planTierSchema = z.enum(["free", "explorer", "investor", "professional"]);
export type PlanTier = z.infer<typeof planTierSchema>;

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function paginatedResponse<T>(items: T[], nextCursor: string | null, hasMore: boolean) {
  return {
    items,
    pagination: {
      nextCursor,
      hasMore,
    },
    schemaVersion: "1.0",
  };
}
