"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Home, Tag, Calendar, Percent, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { MarketReport, PercentChange } from "@/contracts/schemas/report";
import { ChangeBadge } from "./shared";

export function MarketTab({ market }: { market: MarketReport }) {
  const { summaryMetrics, homeValueTrend, marketSummary, comparableProperties, keyTakeaways, disclaimer } = market;

  const chartData = homeValueTrend.map((point) => ({
    label: point.label,
    value: point.value.cents / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={Home} label="Estimated Value" value={summaryMetrics.estimatedValue.formatted} change={summaryMetrics.estimatedValueChange} />
        <MetricCard icon={Tag} label="Median Price / Sq Ft" value={summaryMetrics.medianPricePerSqFt.formatted} change={summaryMetrics.medianPricePerSqFtChange} />
        <MetricCard
          icon={Calendar}
          label="Median Time on Market"
          value={`${summaryMetrics.medianDaysOnMarket} days`}
          changeLabel={`${summaryMetrics.medianDaysOnMarketChangeDays > 0 ? "+" : ""}${summaryMetrics.medianDaysOnMarketChangeDays} days`}
          direction={summaryMetrics.medianDaysOnMarketChangeDays <= 0 ? "up" : "down"}
        />
        <MetricCard
          icon={Percent}
          label="Sale-to-List Price"
          value={`${summaryMetrics.saleToListPct}%`}
          changeLabel={`${summaryMetrics.saleToListChangePp > 0 ? "+" : ""}${summaryMetrics.saleToListChangePp} pp`}
          direction={summaryMetrics.saleToListChangePp >= 0 ? "up" : "down"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Home Value Trend</CardTitle>
            <CardDescription>Estimated market value over time for this property.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={12}
                    tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`}
                    domain={["dataMin - 20000", "dataMax + 20000"]}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fill="url(#valueFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-4 w-4 text-primary" /> Market Summary — {marketSummary.areaLabel}
            </CardTitle>
            <CardDescription>{marketSummary.periodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <SummaryRow label="Median Sale Price" value={marketSummary.medianSalePrice.formatted} change={marketSummary.medianSalePriceChange} />
            <SummaryRow label="Median Price / Sq Ft" value={marketSummary.medianPricePerSqFt.formatted} change={marketSummary.medianPricePerSqFtChange} />
            <SummaryRow label="Median Days on Market" value={String(marketSummary.medianDaysOnMarket)} />
            <SummaryRow label="Homes Sold" value={String(marketSummary.homesSold)} change={marketSummary.homesSoldChange} />
            <SummaryRow label="Active Inventory" value={String(marketSummary.activeInventory)} change={marketSummary.activeInventoryChange} />
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Months of Supply</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{marketSummary.monthsOfSupply}</span>
                <Badge variant="outline">{marketSummary.marketBalanceLabel}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Comparable Properties</CardTitle>
            <CardDescription>Recently sold, similar properties in the area.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {comparableProperties.map((comp) => (
              <div key={comp.address} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium">{comp.address}</p>
                  <p className="text-xs text-muted-foreground">
                    {comp.livingAreaSqFt.toLocaleString()} sq ft · {comp.bedrooms} bd · {comp.bathrooms} ba
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="info" className="mb-1">{comp.status}</Badge>
                  <p className="font-semibold">{comp.price.formatted}</p>
                  <p className="text-xs text-muted-foreground">{comp.eventDate}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-accent/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" /> Key Takeaways
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {keyTakeaways.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 text-risk-low">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">{disclaimer}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  changeLabel,
  direction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change?: PercentChange;
  changeLabel?: string;
  direction?: "up" | "down";
}) {
  return (
    <Card>
      <CardContent className="space-y-2 py-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <p className="text-xl font-semibold">{value}</p>
        {change && <ChangeBadge change={change} />}
        {changeLabel && (
          <Badge variant={direction === "up" ? "success" : "critical"}>{changeLabel}</Badge>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: PercentChange;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        {change && <ChangeBadge change={change} />}
      </div>
    </div>
  );
}
