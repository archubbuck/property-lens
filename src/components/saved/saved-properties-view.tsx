"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Home,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import type { ActivityEventDTO, SavedPropertySummary } from "@/app/(app)/saved/_lib/queries";
import { savedPropertyAddressLine } from "@/app/(app)/saved/_lib/format";
import { getCategoryMeta } from "@/app/(app)/saved/_lib/categories";

const MAX_COMPARE = 3;

type SortKey = "recent" | "address" | "value";

export function SavedPropertiesView({
  initialProperties,
  recentActivity,
  updatedChangesCount,
}: {
  initialProperties: SavedPropertySummary[];
  recentActivity: ActivityEventDTO[];
  updatedChangesCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [properties, setProperties] = useState(initialProperties);
  const [query, setQuery] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unsaveTarget, setUnsaveTarget] = useState<SavedPropertySummary | null>(null);
  const [refreshTarget, setRefreshTarget] = useState<SavedPropertySummary | null>(null);
  const [isPending, setIsPending] = useState(false);

  const propertyTypes = useMemo(
    () => Array.from(new Set(properties.map((p) => p.propertyType))).sort(),
    [properties]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = properties.filter((p) => {
      const matchesQuery =
        q.length === 0 ||
        savedPropertyAddressLine(p.address).toLowerCase().includes(q) ||
        (p.notes ?? "").toLowerCase().includes(q);
      const matchesType = propertyType === "all" || p.propertyType === propertyType;
      return matchesQuery && matchesType;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "address") {
        return savedPropertyAddressLine(a.address).localeCompare(savedPropertyAddressLine(b.address));
      }
      if (sortBy === "value") {
        const parseVal = (s: SavedPropertySummary) =>
          Number((s.latestReport?.estimatedValue ?? "").replace(/[^0-9.]/g, "")) || 0;
        return parseVal(b) - parseVal(a);
      }
      return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
    });

    return list;
  }, [properties, query, propertyType, sortBy]);

  const lastResearched = useMemo(() => {
    const dates = properties
      .map((p) => p.latestReport?.generatedAt)
      .filter((d): d is string => Boolean(d))
      .map((d) => new Date(d).getTime());
    if (dates.length === 0) return null;
    return new Date(Math.max(...dates)).toISOString();
  }, [properties]);

  function toggleSelected(propertyId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else if (next.size < MAX_COMPARE) {
        next.add(propertyId);
      } else {
        toast({
          variant: "warning",
          title: "Compare up to 3 properties",
          description: "Deselect one property before adding another.",
        });
      }
      return next;
    });
  }

  async function confirmUnsave() {
    if (!unsaveTarget) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/v1/saved/${unsaveTarget.savedId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to unsave property");
      setProperties((current) => current.filter((p) => p.savedId !== unsaveTarget.savedId));
      setSelected((current) => {
        const next = new Set(current);
        next.delete(unsaveTarget.propertyId);
        return next;
      });
      toast({ variant: "success", title: "Property unsaved", description: savedPropertyAddressLine(unsaveTarget.address) });
    } catch {
      toast({ variant: "error", title: "Couldn't unsave property", description: "Please try again." });
    } finally {
      setIsPending(false);
      setUnsaveTarget(null);
    }
  }

  async function confirmRefresh() {
    if (!refreshTarget) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/v1/saved/${refreshTarget.savedId}/refresh`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to request refresh");
      toast({
        variant: "success",
        title: "Refresh requested",
        description: "We've logged your request. Re-running research may use a credit.",
      });
      router.refresh();
    } catch {
      toast({ variant: "error", title: "Couldn't request refresh", description: "Please try again." });
    } finally {
      setIsPending(false);
      setRefreshTarget(null);
    }
  }

  function goToCompare() {
    router.push(`/saved/compare?ids=${Array.from(selected).join(",")}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Saved Properties</h1>
        <p className="mt-1 text-muted-foreground">
          Keep track of properties you&apos;re researching, compare insights, and monitor changes over time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search saved properties..."
                className="pl-9"
                aria-label="Search saved properties"
              />
            </div>
            <Select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              aria-label="Filter by property type"
              className="sm:w-56"
            >
              <option value="all">All property types</option>
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {humanizePropertyType(type)}
                </option>
              ))}
            </Select>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sort saved properties"
              className="sm:w-56"
            >
              <option value="recent">Sort: Recently Saved</option>
              <option value="address">Sort: Address A-Z</option>
              <option value="value">Sort: Estimated Value</option>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            {visible.length} {visible.length === 1 ? "property" : "properties"}
          </p>

          {visible.length === 0 ? (
            <EmptyState
              icon={Heart}
              title={properties.length === 0 ? "No saved properties yet" : "No properties match your filters"}
              description={
                properties.length === 0
                  ? "Research a property and save it to track changes and compare it with others."
                  : "Try a different search term or clear your filters."
              }
              action={
                properties.length === 0 ? (
                  <Link href="/" className={buttonVariants({ variant: "primary" })}>
                    Run New Research
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map((property) => (
                <SavedPropertyCard
                  key={property.savedId}
                  property={property}
                  selected={selected.has(property.propertyId)}
                  onToggleSelected={() => toggleSelected(property.propertyId)}
                  onUnsave={() => setUnsaveTarget(property)}
                  onRefresh={() => setRefreshTarget(property)}
                />
              ))}
            </div>
          )}

          <Card className="flex flex-col items-start justify-between gap-4 bg-accent/40 p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-accent p-2 text-accent-foreground">
                <Scale className="h-5 w-5" />
              </span>
              <div>
                <p className="font-serif text-lg font-semibold">Compare Properties</p>
                <p className="text-sm text-muted-foreground">Analyze multiple properties side-by-side.</p>
              </div>
            </div>
            <Button variant="outline" disabled={selected.size < 2} onClick={goToCompare}>
              Compare Selected ({selected.size})
            </Button>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" /> My Saved Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SummaryRow label="Total Saved" value={String(properties.length)} />
              <SummaryRow
                label="Last Researched"
                value={lastResearched ? formatDate(lastResearched) : "Not available"}
              />
              <SummaryRow label="Recent Changes (7d)" value={String(updatedChangesCount)} />
              <Link
                href="/"
                className={buttonVariants({ variant: "outline", className: "mt-2 w-full" })}
              >
                <Plus className="h-4 w-4" /> Add a Property
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest changes to your saved properties.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                recentActivity.map((event) => {
                  const meta = getCategoryMeta(event.category);
                  return (
                    <div key={event.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{event.title}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(event.eventTime, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{event.propertyLabel ?? meta.label}</p>
                    </div>
                  );
                })
              )}
              <Link href="/saved/activity" className="text-sm font-medium text-primary hover:underline">
                View All Activity →
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={Boolean(unsaveTarget)} onOpenChange={(open) => !open && setUnsaveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader
            title="Unsave this property?"
            description="This only removes it from your saved list. Your past research report stays available."
            onClose={() => setUnsaveTarget(null)}
          />
          {unsaveTarget && (
            <p className="text-sm text-foreground">{savedPropertyAddressLine(unsaveTarget.address)}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnsaveTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmUnsave} disabled={isPending}>
              <Trash2 className="h-4 w-4" /> Unsave Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(refreshTarget)} onOpenChange={(open) => !open && setRefreshTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader
            title="Refresh research?"
            description="Re-running research re-checks public sources and may consume one credit if a new report is generated."
            onClose={() => setRefreshTarget(null)}
          />
          {refreshTarget && (
            <p className="text-sm text-foreground">{savedPropertyAddressLine(refreshTarget.address)}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefreshTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmRefresh} disabled={isPending}>
              <RefreshCw className="h-4 w-4" /> Confirm Refresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function humanizePropertyType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function SavedPropertyCard({
  property,
  selected,
  onToggleSelected,
  onUnsave,
  onRefresh,
}: {
  property: SavedPropertySummary;
  selected: boolean;
  onToggleSelected: () => void;
  onUnsave: () => void;
  onRefresh: () => void;
}) {
  const address = savedPropertyAddressLine(property.address);

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <label className="flex shrink-0 items-start gap-3 sm:items-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelected}
          aria-label={`Select ${address} for comparison`}
          className="mt-1 h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring sm:mt-0"
        />
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
          {property.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external, unconfigured demo-fixture image domains
            <img src={property.photoUrl} alt={address} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Home className="h-6 w-6" />
            </div>
          )}
        </div>
      </label>

      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-lg font-semibold">{property.address?.line1 ?? "Address unavailable"}</p>
        <p className="truncate text-sm text-muted-foreground">
          {property.address ? `${property.address.city}, ${property.address.state} ${property.address.postalCode}` : ""}
        </p>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <Home className="h-3.5 w-3.5" /> {humanizePropertyType(property.propertyType)}
        </p>
        <p className="text-xs text-muted-foreground">Saved {formatDate(property.savedAt)}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm sm:w-80">
        <div>
          <p className="text-xs text-muted-foreground">Est. Value</p>
          <p className="font-semibold">{property.latestReport?.estimatedValue ?? "Not available"}</p>
          {property.latestReport?.estimatedValueChange && (
            <Badge
              variant={property.latestReport.estimatedValueChange.direction === "down" ? "critical" : "success"}
              className="mt-0.5"
            >
              {property.latestReport.estimatedValueChange.formatted}
            </Badge>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tax (Annual)</p>
          <p className="font-semibold">{property.latestReport?.annualTax ?? "Not available"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Zoning</p>
          {property.latestReport?.zoningCode ? (
            <Badge variant="info" className="mt-0.5">
              {property.latestReport.zoningCode}
            </Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Not available</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:w-44">
        <Link
          href={`/properties/${property.propertyId}`}
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          View Report
        </Link>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" /> Refresh Research
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onUnsave}>
          <Trash2 className="h-4 w-4" /> Unsave
        </Button>
      </div>
    </Card>
  );
}
