import type { ReactNode } from "react";
import { Search, Zap, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const FEATURES = [
  {
    icon: Search,
    title: "Research Properties",
    description: "Get key details, ownership, and market insights in seconds.",
  },
  {
    icon: Zap,
    title: "Track Your Usage",
    description: "Monitor lookups and manage your plan with ease.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    description: "Your data is protected with enterprise-grade security.",
  },
];

/**
 * Shared centered-card-over-photo shell for /sign-in and /sign-up, matching
 * the mockups. The backdrop uses a layered CSS gradient (no stock photo
 * asset is bundled in this build) evoking the mockups' tree-canopy /
 * suburban-dusk photography.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 15% 10%, color-mix(in srgb, var(--color-primary) 35%, transparent), transparent 40%), " +
            "radial-gradient(circle at 85% 90%, color-mix(in srgb, var(--color-info) 25%, transparent), transparent 45%), " +
            "linear-gradient(160deg, var(--color-sand), var(--color-background))",
        }}
      />

      <div className="w-full max-w-md rounded-2xl border border-border bg-card/95 p-8 shadow-xl backdrop-blur">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        {children}
      </div>

      <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex items-start gap-3 text-center sm:flex-col sm:items-center">
            <feature.icon className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
