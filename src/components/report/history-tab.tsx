"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Home,
  FileText,
  DollarSign,
  Users,
  HardHat,
  Map as MapIcon,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { HistoryReport } from "@/contracts/schemas/report";

const CATEGORY_META: Record<
  HistoryReport["events"][number]["category"],
  { label: string; icon: React.ComponentType<{ className?: string }>; variant: "success" | "info" | "outline" | "moderate" | "accent" }
> = {
  ownership: { label: "Ownership", icon: Users, variant: "success" },
  sale: { label: "Sale", icon: DollarSign, variant: "accent" },
  assessment: { label: "Assessment", icon: Home, variant: "info" },
  tax: { label: "Tax", icon: FileText, variant: "outline" },
  permit: { label: "Permit", icon: HardHat, variant: "moderate" },
  zoning: { label: "Zoning", icon: MapIcon, variant: "outline" },
};

const FILTERS: Array<{ key: "all" | HistoryReport["events"][number]["category"]; label: string }> = [
  { key: "all", label: "All Events" },
  { key: "ownership", label: "Ownership" },
  { key: "sale", label: "Sales" },
  { key: "assessment", label: "Assessment" },
  { key: "tax", label: "Tax" },
  { key: "permit", label: "Permits" },
  { key: "zoning", label: "Zoning" },
];

export function HistoryTab({ history }: { history: HistoryReport }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const events = useMemo(
    () => (filter === "all" ? history.events : history.events.filter((e) => e.category === filter)),
    [filter, history.events]
  );

  const chartData = history.valueHistory.map((entry) => ({
    year: String(entry.year),
    Assessed: entry.assessedValue.cents / 100,
    Appraised: entry.appraisedValue.cents / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.key}
            type="button"
            size="sm"
            variant={filter === item.key ? "primary" : "outline"}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Property History</CardTitle>
            <CardDescription>A timeline of ownership, sales, assessment, and key property events.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-5 border-l border-border pl-5">
              {events.map((event) => {
                const meta = CATEGORY_META[event.category];
                const Icon = meta.icon;
                return (
                  <li key={`${event.date}-${event.title}`} className="relative">
                    <span className="absolute -left-[29px] flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" /> {formatDate(event.date)}
                      </span>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </li>
                );
              })}
              {events.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No events in this category.</p>
              )}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">History at a Glance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-center">
              <Stat label="Total Events" value={history.atAGlance.totalEvents} />
              <Stat label="Owners" value={history.atAGlance.owners} />
              <Stat label="Sales" value={history.atAGlance.sales} />
              <Stat label="Permits" value={history.atAGlance.permits} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ownership Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.ownershipTimeline.map((entry) => (
                <div key={entry.ownerName} className="space-y-1">
                  <div className="rounded-md bg-primary px-3 py-2 text-center text-sm font-medium text-primary-foreground">
                    {entry.ownerName}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{entry.startLabel}</span>
                    <span>{entry.endLabel}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Value &amp; Assessment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="year" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis
                  stroke="var(--color-muted-foreground)"
                  fontSize={12}
                  tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line type="monotone" dataKey="Assessed" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Appraised" stroke="var(--color-chart-2)" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
