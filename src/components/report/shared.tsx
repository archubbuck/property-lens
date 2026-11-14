import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Info,
} from "lucide-react";
import { Badge, riskVariant } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PercentChange } from "@/contracts/schemas/report";
import type { Verification, Severity } from "@/contracts/schemas/common";

/** Up/down/flat change pill used across Market Insights and Assessment cards. */
export function ChangeBadge({ change }: { change: PercentChange }) {
  const Icon = change.direction === "up" ? TrendingUp : change.direction === "down" ? TrendingDown : Minus;
  const variant = change.direction === "down" ? "critical" : change.direction === "up" ? "success" : "unknown";
  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3" />
      {change.formatted}
    </Badge>
  );
}

const VERIFICATION_META: Record<
  Verification,
  { label: string; icon: typeof ShieldCheck; className: string }
> = {
  verified: { label: "Verified against a primary public record.", icon: ShieldCheck, className: "text-risk-low" },
  corroborated: {
    label: "Corroborated by more than one source.",
    icon: ShieldCheck,
    className: "text-info",
  },
  unverified: {
    label: "Not independently verified — treat as unconfirmed.",
    icon: ShieldQuestion,
    className: "text-muted-foreground",
  },
  conflicting: {
    label: "Sources disagree on this fact — review before relying on it.",
    icon: ShieldAlert,
    className: "text-risk-high",
  },
};

/**
 * Inline verification/caveat indicator. Never hides uncertainty: unverified
 * and conflicting facts are shown with a distinct icon and an explanatory
 * tooltip (native `title`) rather than defaulting to a positive signal.
 */
export function VerificationNote({
  verification,
  caveats,
  className,
}: {
  verification: Verification;
  caveats?: string[] | null;
  className?: string;
}) {
  const meta = VERIFICATION_META[verification];
  const Icon = meta.icon;
  const title = [meta.label, ...(caveats ?? [])].join(" ");
  return (
    <span title={title} className={cn("inline-flex items-center gap-1 text-xs", meta.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      <span className="capitalize">{verification}</span>
    </span>
  );
}

/** Inline caveat note with an info icon; used when a fact has known gaps/limitations. */
export function CaveatNote({ text }: { text: string }) {
  return (
    <span title={text} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Info className="h-3.5 w-3.5 shrink-0" />
      {text}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge variant={riskVariant(severity)}>{severity}</Badge>;
}
