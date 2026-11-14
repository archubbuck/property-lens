import Link from "next/link";
import { Sparkles, Search as SearchIcon } from "lucide-react";
import { getSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResearchSearchForm } from "./research-search-form";
import { SAMPLE_ADDRESS } from "@/app/api/v1/research/_lib/address";

export const metadata = { title: "Research | PropertyLens" };

const RUN_STATUS_BADGE: Record<string, "unknown" | "success" | "critical" | "moderate"> = {
  queued: "unknown",
  resolving: "unknown",
  retrieving: "unknown",
  analyzing: "unknown",
  assembling: "unknown",
  completed: "success",
  partial: "moderate",
  failed: "critical",
  cancel_requested: "unknown",
  cancelled: "unknown",
};

export default async function ResearchLandingPage() {
  const userId = await getSessionUserId();

  const recentRun = userId
    ? await prisma.researchRun.findFirst({
        where: { userId },
        orderBy: { startedAt: "desc" },
        include: {
          property: {
            include: { addresses: { where: { isPrimary: true }, take: 1 } },
          },
        },
      })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent/40 to-transparent p-8">
        <h1 className="font-serif text-4xl font-bold">Research</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Run a property lookup to get zoning, use, ownership, and market insights.
        </p>
        <div className="mt-6 max-w-2xl">
          <ResearchSearchForm />
        </div>
      </header>

      <Card className="border-primary/30 bg-accent/20">
        <CardContent className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="rounded-full bg-primary/10 p-2 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">Try the sample property</p>
              <p className="text-sm text-muted-foreground">
                {SAMPLE_ADDRESS} — a fully working report, free and unlimited to explore.
              </p>
            </div>
          </div>
          <ResearchSearchForm sampleOnly />
        </CardContent>
      </Card>

      {recentRun && (
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">Recent Lookup</h2>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">
                  {recentRun.property.addresses[0]
                    ? `${recentRun.property.addresses[0].line1}, ${recentRun.property.addresses[0].city}, ${recentRun.property.addresses[0].state}`
                    : "Property"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Started {recentRun.startedAt.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={RUN_STATUS_BADGE[recentRun.status] ?? "unknown"} className="capitalize">
                  {recentRun.status.replace("_", " ")}
                </Badge>
                <Link
                  href={
                    recentRun.status === "completed"
                      ? `/properties/${recentRun.propertyId}`
                      : `/research/runs/${recentRun.id}`
                  }
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <SearchIcon className="h-3.5 w-3.5" /> View
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
