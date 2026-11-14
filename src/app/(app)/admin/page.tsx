import { redirect } from "next/navigation";
import { Server, KeyRound, CreditCard, Sparkles, Database } from "lucide-react";
import { getSessionUserId } from "@/server/auth/session";
import { prisma } from "@/server/infrastructure/database/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";

/**
 * Lightweight internal diagnostics view (SPECIFICATION.md Phase 12). Not a
 * full admin console — just environment/integration status and basic record
 * counts for operators. Gated to `role === "admin"` on the `User` row.
 */
export default async function AdminDiagnosticsPage() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const [userCount, propertyCount, researchRunCount, supportTicketCount] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.researchRun.count(),
    prisma.supportTicket.count(),
  ]);

  const integrations: {
    label: string;
    description: string;
    configured: boolean;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      label: "Clerk (identity)",
      description: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY",
      configured: Boolean(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
      ),
      icon: KeyRound,
    },
    {
      label: "AI provider",
      description: "AI_PROVIDER_API_KEY",
      configured: Boolean(process.env.AI_PROVIDER_API_KEY),
      icon: Sparkles,
    },
    {
      label: "Billing provider",
      description: "STRIPE_SECRET_KEY",
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      icon: CreditCard,
    },
    {
      label: "Database",
      description: "DATABASE_URL",
      configured: Boolean(process.env.DATABASE_URL),
      icon: Database,
    },
  ];

  const counts = [
    { label: "Users", value: userCount },
    { label: "Properties", value: propertyCount },
    { label: "Research runs", value: researchRunCount },
    { label: "Support tickets", value: supportTicketCount },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold">Admin Diagnostics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A lightweight internal diagnostics view — not a full admin console. It shows
          integration status and basic record counts only.
        </p>
      </div>

      <Alert variant="neutral" title="Scope note">
        This page intentionally does not expose run retry/replay tools, cost reports, or
        source-health dashboards (see SPECIFICATION.md Phase 12 — Admin operations and
        observability). It is a minimal status surface for now.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" /> Integration status
          </CardTitle>
          <CardDescription>
            Presence checks against environment variables only — secret values are never
            displayed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.map((integration) => (
            <div
              key={integration.label}
              className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <integration.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{integration.label}</p>
                  <p className="text-xs text-muted-foreground">{integration.description}</p>
                </div>
              </div>
              <Badge variant={integration.configured ? "success" : "unknown"}>
                {integration.configured ? "Configured" : "Not configured"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record counts</CardTitle>
          <CardDescription>Point-in-time totals from the database.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {counts.map((item) => (
              <div key={item.label} className="rounded-md border border-border p-4 text-center">
                <p className="font-serif text-2xl font-semibold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
