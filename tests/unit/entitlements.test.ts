import { describe, expect, it, vi, beforeEach } from "vitest";

const findFirstMock = vi.fn();

vi.mock("@/server/infrastructure/database/prisma", () => ({
  prisma: {
    entitlementPeriod: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}));

import { getCurrentEntitlementSummary } from "@/server/domains/billing/entitlements";

describe("getCurrentEntitlementSummary", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns null when the user has no entitlement period", async () => {
    findFirstMock.mockResolvedValue(null);
    const result = await getCurrentEntitlementSummary("user_1");
    expect(result).toBeNull();
  });

  it("computes remaining lookups from the append-only usage ledger (consume minus restore)", async () => {
    findFirstMock.mockResolvedValue({
      tier: "free",
      isLifetime: true,
      lookupAllowance: 5,
      periodStart: new Date("2026-01-01"),
      periodEnd: null,
      subscription: null,
      usageLedgerEntries: [
        { amount: -1 }, // reservation/consume
        { amount: -1 }, // another consume
        { amount: 1 }, // a release restoring one of them
      ],
    });

    const result = await getCurrentEntitlementSummary("user_1");

    expect(result).not.toBeNull();
    expect(result!.used).toBe(1); // 2 consumed - 1 restored
    expect(result!.remaining).toBe(4); // 5 allowance - 1 used
    expect(result!.planName).toBe("Free");
  });

  it("never reports negative remaining lookups even if usage exceeds allowance", async () => {
    findFirstMock.mockResolvedValue({
      tier: "free",
      isLifetime: true,
      lookupAllowance: 5,
      periodStart: new Date("2026-01-01"),
      periodEnd: null,
      subscription: null,
      usageLedgerEntries: [{ amount: -1 }, { amount: -1 }, { amount: -1 }, { amount: -1 }, { amount: -1 }, { amount: -1 }],
    });

    const result = await getCurrentEntitlementSummary("user_1");

    expect(result!.remaining).toBe(0);
  });

  it("reports unlimited (null remaining) for an unlimited allowance", async () => {
    findFirstMock.mockResolvedValue({
      tier: "professional",
      isLifetime: false,
      lookupAllowance: null,
      periodStart: new Date("2026-01-01"),
      periodEnd: new Date("2026-02-01"),
      subscription: { plan: { name: "Professional" } },
      usageLedgerEntries: [{ amount: -1 }, { amount: -1 }],
    });

    const result = await getCurrentEntitlementSummary("user_1");

    expect(result!.remaining).toBeNull();
    expect(result!.planName).toBe("Professional");
  });
});
