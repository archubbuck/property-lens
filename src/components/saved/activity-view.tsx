"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Home as HomeIcon, Layers, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import type {
  ActivityEventDTO,
  ActivityPropertyRef,
  ActivitySummary,
} from "@/app/(app)/saved/_lib/queries";
import { getCategoryMeta } from "@/app/(app)/saved/_lib/categories";

const PAGE_SIZE = 10;

type Props = {
  initialItems: ActivityEventDTO[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  summary: ActivitySummary;
  propertiesInActivity: ActivityPropertyRef[];
};

function groupByDay(items: ActivityEventDTO[]): Array<{ label: string; items: ActivityEventDTO[] }> {
  const groups: Array<{ label: string; items: ActivityEventDTO[] }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const item of items) {
    const date = new Date(item.eventTime);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    let label: string;
    if (dayStart.getTime() === today.getTime()) {
      label = `Today · ${formatDate(date)}`;
    } else if (dayStart.getTime() === yesterday.getTime()) {
      label = `Yesterday · ${formatDate(date)}`;
    } else {
      label = formatDate(date, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
    }

    const existing = groups.find((g) => g.label === label);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

export function ActivityView({
  initialItems,
  initialNextCursor,
  initialHasMore,
  summary,
  propertiesInActivity,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [propertyId, setPropertyId] = useState("all");
  const [range, setRange] = useState("all");

  const categories = useMemo(() => summary.byCategory.map((c) => c.category), [summary]);

  const rangeFrom = useMemo(() => {
    const now = new Date();
    if (range === "7d") return new Date(now.getTime() - 7 * 86400000).toISOString();
    if (range === "30d") return new Date(now.getTime() - 30 * 86400000).toISOString();
    if (range === "90d") return new Date(now.getTime() - 90 * 86400000).toISOString();
    return undefined;
  }, [range]);

  const fetchPage = useCallback(
    async (cursor: string | undefined) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (cursor) params.set("cursor", cursor);
        if (q.trim()) params.set("q", q.trim());
        if (category !== "all") params.set("category", category);
        if (propertyId !== "all") params.set("propertyId", propertyId);
        if (rangeFrom) params.set("from", rangeFrom);

        const res = await fetch(`/api/v1/activity?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load activity");
        const data = await res.json();
        setItems(data.items);
        setNextCursor(data.pagination.nextCursor);
        setHasMore(data.pagination.hasMore);
      } catch {
        setItems([]);
        setNextCursor(null);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [q, category, propertyId, rangeFrom]
  );

  function applyFilters() {
    setCursorStack([undefined]);
    void fetchPage(undefined);
  }

  function goNext() {
    if (!nextCursor) return;
    setCursorStack((stack) => [...stack, nextCursor]);
    void fetchPage(nextCursor);
  }

  function goPrevious() {
    setCursorStack((stack) => {
      if (stack.length <= 1) return stack;
      return stack.slice(0, -1);
    });
  }

  const isFirstPageLoad = useRef(true);
  useEffect(() => {
    if (isFirstPageLoad.current) {
      isFirstPageLoad.current = false;
      return;
    }
    const cursor = cursorStack[cursorStack.length - 1];
    void fetchPage(cursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cursorStack changes drive refetch; fetchPage closes over the latest filter state
  }, [cursorStack]);

  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately scoped to filter selects only (search box applies on Enter)
  }, [category, propertyId, range]);

  const groups = groupByDay(items);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <Link href="/saved" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Saved Properties
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-bold">Activity</h1>
        <p className="mt-1 text-muted-foreground">
          A complete history of research, updates, and changes for your saved properties.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 sm:min-w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                placeholder="Search activity..."
                className="pl-9"
                aria-label="Search activity"
              />
            </div>
            <Select
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
              }}
              aria-label="Filter by date range"
              className="sm:w-44"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </Select>
            <Select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              aria-label="Filter by property"
              className="sm:w-56"
            >
              <option value="all">All Properties</option>
              {propertiesInActivity.map((p) => (
                <option key={p.propertyId} value={p.propertyId}>
                  {p.label}
                </option>
              ))}
            </Select>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by activity type"
              className="sm:w-52"
            >
              <option value="all">All Activity Types</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {getCategoryMeta(c).label}
                </option>
              ))}
            </Select>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No activity found"
              description="Try a different search, date range, or filter."
            />
          ) : (
            <div className="flex flex-col gap-5">
              {groups.map((group) => (
                <Card key={group.label} className="p-5">
                  <p className="mb-3 font-serif text-lg font-semibold">{group.label}</p>
                  <div className="flex flex-col divide-y divide-border">
                    {group.items.map((event) => {
                      const meta = getCategoryMeta(event.category);
                      const Icon = meta.icon;
                      return (
                        <div key={event.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                          <span className="mt-0.5 rounded-md bg-secondary p-2 text-secondary-foreground">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {event.propertyLabel ? `${event.propertyLabel} — ` : ""}
                              {event.description}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-xs text-muted-foreground">{formatDate(event.eventTime)}</span>
                            <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Pagination
            hasNextPage={hasMore}
            hasPreviousPage={cursorStack.length > 1}
            onNext={goNext}
            onPrevious={goPrevious}
            label={`Showing ${items.length} event${items.length === 1 ? "" : "s"}`}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="bg-accent/40">
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
              <CardDescription>Across all saved properties.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <SummaryRow label="Total Activity" value={summary.total} />
              {summary.byCategory.map((c) => (
                <SummaryRow key={c.category} label={getCategoryMeta(c.category).label} value={c.count} />
              ))}
              {summary.byCategory.length === 0 && (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HomeIcon className="h-4 w-4 text-primary" /> Properties in Activity
              </CardTitle>
              <CardDescription>{propertiesInActivity.length} properties</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {propertiesInActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No properties yet.</p>
              ) : (
                propertiesInActivity.map((p) => (
                  <Link
                    key={p.propertyId}
                    href={`/properties/${p.propertyId}`}
                    className="flex items-center gap-3 rounded-md p-1 hover:bg-muted"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {p.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- external, unconfigured demo-fixture image domains
                        <img src={p.photoUrl} alt={p.label} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <HomeIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium">{p.label}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
