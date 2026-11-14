"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import {
  type ComparisonProperty,
  type SavedPropertySummary,
} from "@/app/(app)/saved/_lib/queries";
import { savedPropertyAddressLine } from "@/app/(app)/saved/_lib/format";

type Props = {
  allSaved: SavedPropertySummary[];
  selectedIds: string[];
  comparisonProperties: ComparisonProperty[];
};

const NOT_AVAILABLE = "Not available";

function asOf(date: string | null): string {
  return date ? `As of ${formatDate(date)}` : "No evidence date available";
}

function cell(value: string | null, date: string | null) {
  if (!value) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground">{NOT_AVAILABLE}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{value}</span>
      <span className="text-xs text-muted-foreground">{asOf(date)}</span>
    </div>
  );
}

export function CompareView({ allSaved, selectedIds, comparisonProperties }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(
    selectedIds.length > 0 ? selectedIds : []
  );

  function togglePick(propertyId: string) {
    setPicked((current) => {
      if (current.includes(propertyId)) return current.filter((id) => id !== propertyId);
      if (current.length >= 3) return current;
      return [...current, propertyId];
    });
  }

  function applySelection() {
    if (picked.length < 2) return;
    router.push(`/saved/compare?ids=${picked.join(",")}`);
  }

  const showTable = selectedIds.length >= 2 && comparisonProperties.length >= 2;
  const missingCount = selectedIds.length - comparisonProperties.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <Link href="/saved" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Saved Properties
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-bold">Compare Properties</h1>
        <p className="mt-1 text-muted-foreground">
          Select 2–3 saved properties to compare key facts side by side.
        </p>
      </div>

      {allSaved.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No saved properties yet"
          description="Save properties from a research report to compare them here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Choose properties</CardTitle>
            <CardDescription>Pick 2 or 3 properties ({picked.length}/3 selected).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allSaved.map((p) => {
                const checked = picked.includes(p.propertyId);
                const disabled = !checked && picked.length >= 3;
                return (
                  <label
                    key={p.propertyId}
                    className={`flex items-center gap-2 rounded-md border border-border p-3 text-sm ${
                      disabled ? "opacity-50" : "cursor-pointer hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => togglePick(p.propertyId)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="truncate">{savedPropertyAddressLine(p.address)}</span>
                  </label>
                );
              })}
            </div>
            <div>
              <Button onClick={applySelection} disabled={picked.length < 2}>
                Compare Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {missingCount > 0 && selectedIds.length > 0 && (
        <p className="text-sm text-risk-high">
          {missingCount} of the selected propert{missingCount === 1 ? "y was" : "ies were"} not found among your
          saved properties.
        </p>
      )}

      {selectedIds.length > 0 && selectedIds.length < 2 && (
        <p className="text-sm text-muted-foreground">Select at least 2 properties to compare.</p>
      )}

      {showTable && (
        <Card className="overflow-x-auto">
          <CardContent className="p-0">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-40 p-4 text-left font-medium text-muted-foreground">Fact</th>
                  {comparisonProperties.map((p) => (
                    <th key={p.propertyId} className="p-4 text-left align-top">
                      <Link href={`/properties/${p.propertyId}`} className="font-serif text-base font-semibold hover:underline">
                        {savedPropertyAddressLine(p.address)}
                      </Link>
                      <div className="mt-1">
                        <Badge variant="outline">{p.propertyType}</Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium text-muted-foreground">Estimated Value</td>
                  {comparisonProperties.map((p) => (
                    <td key={p.propertyId} className="p-4">
                      {cell(p.report?.estimatedValue ?? null, p.report?.generatedAt ?? null)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium text-muted-foreground">Appraised Value</td>
                  {comparisonProperties.map((p) => (
                    <td key={p.propertyId} className="p-4">
                      {cell(
                        p.report?.appraisedValue ?? null,
                        p.report?.assessmentYear ? String(p.report.assessmentYear) : null
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium text-muted-foreground">Annual Tax</td>
                  {comparisonProperties.map((p) => (
                    <td key={p.propertyId} className="p-4">
                      {cell(p.report?.annualTax ?? null, p.report?.generatedAt ?? null)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium text-muted-foreground">Zoning</td>
                  {comparisonProperties.map((p) => (
                    <td key={p.propertyId} className="p-4">
                      {cell(
                        p.report?.zoningCode
                          ? `${p.report.zoningCode}${p.report.zoningLabel ? ` — ${p.report.zoningLabel}` : ""}`
                          : null,
                        p.report?.zoningAsOf ?? null
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium text-muted-foreground">Lot Size</td>
                  {comparisonProperties.map((p) => (
                    <td key={p.propertyId} className="p-4">
                      {cell(
                        p.lotSizeAcres
                          ? `${p.lotSizeAcres} acres`
                          : p.lotSizeSqFt
                            ? `${p.lotSizeSqFt.toLocaleString()} sq ft`
                            : null,
                        null
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-medium text-muted-foreground">Living Area</td>
                  {comparisonProperties.map((p) => (
                    <td key={p.propertyId} className="p-4">
                      {cell(p.livingAreaSqFt ? `${p.livingAreaSqFt.toLocaleString()} sq ft` : null, null)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 font-medium text-muted-foreground">Year Built</td>
                  {comparisonProperties.map((p) => (
                    <td key={p.propertyId} className="p-4">
                      {cell(p.yearBuilt ? String(p.yearBuilt) : null, null)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
