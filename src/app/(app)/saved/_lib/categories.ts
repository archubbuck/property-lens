import type { VariantProps } from "class-variance-authority";
import {
  Bell,
  Gavel,
  Heart,
  HeartOff,
  Landmark,
  Layers,
  Map,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

export type ActivityCategoryMeta = {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
};

/**
 * Known `ActivityEvent.category` conventions (see SPECIFICATION.md Phase 10 /
 * prisma/schema.prisma comment on `ActivityEvent.category`). The category is
 * a plain string column, so anything not listed here still renders through
 * `humanizeCategory` instead of being dropped.
 */
const CATEGORY_META: Record<string, ActivityCategoryMeta> = {
  saved: { label: "Saved", icon: Plus, badgeVariant: "success" },
  unsaved: { label: "Unsaved", icon: HeartOff, badgeVariant: "unknown" },
  research_started: { label: "Research", icon: RefreshCw, badgeVariant: "info" },
  research_completed: { label: "Research", icon: RefreshCw, badgeVariant: "info" },
  research_failed: { label: "Research", icon: RefreshCw, badgeVariant: "critical" },
  report_refreshed: { label: "Research", icon: RefreshCw, badgeVariant: "info" },
  value_change: { label: "Value Change", icon: TrendingUp, badgeVariant: "success" },
  source_update: { label: "Market Data", icon: Bell, badgeVariant: "accent" },
  market_update: { label: "Market Data", icon: Bell, badgeVariant: "accent" },
  tax_change: { label: "Assessment / Tax", icon: Layers, badgeVariant: "moderate" },
  assessment_change: { label: "Assessment / Tax", icon: Layers, badgeVariant: "moderate" },
  ownership_change: { label: "Ownership", icon: Users, badgeVariant: "accent" },
  zoning_change: { label: "Zoning", icon: Map, badgeVariant: "info" },
  notification_sent: { label: "Notification", icon: Bell, badgeVariant: "unknown" },
  legal_update: { label: "Legal", icon: Gavel, badgeVariant: "moderate" },
  tax_record_update: { label: "Assessment / Tax", icon: Landmark, badgeVariant: "moderate" },
};

/** Turns an unmapped `snake_case`/`kebab-case` category into a readable label. */
export function humanizeCategory(category: string): string {
  return category.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getCategoryMeta(category: string): ActivityCategoryMeta {
  return (
    CATEGORY_META[category] ?? {
      label: humanizeCategory(category),
      icon: Heart,
      badgeVariant: "unknown",
    }
  );
}
