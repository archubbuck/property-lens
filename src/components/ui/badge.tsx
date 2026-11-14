import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-foreground",
        success: "border-transparent bg-risk-low/15 text-risk-low",
        critical: "border-transparent bg-risk-critical/15 text-risk-critical",
        high: "border-transparent bg-risk-high/15 text-risk-high",
        moderate: "border-transparent bg-risk-moderate/15 text-risk-moderate",
        unknown: "border-transparent bg-muted text-muted-foreground",
        info: "border-transparent bg-info/15 text-info",
        accent: "border-transparent bg-accent text-accent-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Maps a risk/severity level to the semantic badge variant; "unknown" is distinct from "low". */
export function riskVariant(
  severity: "critical" | "high" | "moderate" | "low" | "unknown"
): VariantProps<typeof badgeVariants>["variant"] {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "high";
    case "moderate":
      return "moderate";
    case "low":
      return "success";
    default:
      return "unknown";
  }
}
