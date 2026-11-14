"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { AssessmentReport, Finding } from "@/contracts/schemas/report";
import { VerificationNote, SeverityBadge } from "./shared";

export function AssessmentTab({
  assessment,
  findings,
}: {
  assessment: AssessmentReport;
  findings: Finding[];
}) {
  const { currentAssessment, annualTaxes, assessmentHistory, taxBreakdown, keyDetails } = assessment;

  const chartData = assessmentHistory.map((entry) => ({
    year: String(entry.year),
    Assessed: entry.assessedValue.cents / 100,
    Appraised: entry.appraisedValue.cents / 100,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Assessment</CardTitle>
            <CardDescription>Most recent appraised and assessed values.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 rounded-md bg-risk-low/5 p-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Assessed Value</p>
              <p className="text-lg font-semibold">{currentAssessment.assessedValue.formatted}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Appraised Value</p>
              <p className="text-lg font-semibold">{currentAssessment.appraisedValue.formatted}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Assessment Year</p>
              <p className="text-lg font-semibold">{currentAssessment.assessmentYear}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Annual Property Taxes</CardTitle>
            <CardDescription>Total taxes and effective tax rate for the latest year.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <p className="text-2xl font-semibold">{annualTaxes.total.formatted}</p>
            <Badge variant="success">Effective Rate {annualTaxes.effectiveTaxRateFormatted}</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assessment History</CardTitle>
            <CardDescription>Historical appraised and assessed values.</CardDescription>
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

        <Card>
          <CardHeader>
            <CardTitle>Tax Breakdown ({currentAssessment.assessmentYear})</CardTitle>
            <CardDescription>Annual taxes by taxing entity.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Taxing Entity</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Annual Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxBreakdown.map((entity) => (
                  <TableRow key={entity.entityName}>
                    <TableCell className="font-medium">{entity.entityName}</TableCell>
                    <TableCell>{entity.rateFormatted}</TableCell>
                    <TableCell>{entity.annualTax.formatted}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-risk-low/5 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell>{annualTaxes.effectiveTaxRateFormatted}</TableCell>
                  <TableCell>{annualTaxes.total.formatted}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Key Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Row label="Assessment Year" value={String(keyDetails.assessmentYear)} />
          <Row label="Appraisal District" value={keyDetails.appraisalDistrict} />
          <Row label="Account Number" value={keyDetails.accountNumber} />
          <Row label="Legal Description" value={keyDetails.legalDescription} />
          {keyDetails.appraisalDistrictUrl && (
            <div className="sm:col-span-2">
              <a
                href={keyDetails.appraisalDistrictUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline"
              >
                View on Appraisal District →
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {findings.map((finding) => (
              <div key={finding.title} className="rounded-md border border-border p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <p className="font-medium">{finding.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{finding.explanation}</p>
                <div className="mt-2">
                  <VerificationNote verification={finding.verification} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
