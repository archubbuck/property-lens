import Link from "next/link";
import { MapPin, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OverviewReport, Finding } from "@/contracts/schemas/report";
import { SeverityBadge, VerificationNote } from "./shared";

export function OverviewTab({
  overview,
  findings,
}: {
  overview: OverviewReport;
  findings: Finding[];
}) {
  const { riskSummary, atAGlance, parcelFacts, location, sourceCoverage, nextSteps } = overview;

  return (
    <div className="space-y-6">
      <Card className={riskSummary.level === "low" ? "border-risk-low/30 bg-risk-low/5" : undefined}>
        <CardContent className="flex flex-col gap-2 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <SeverityBadge severity={riskSummary.level} />
              <h2 className="font-serif text-lg font-semibold">{riskSummary.headline}</h2>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">{riskSummary.narrative}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>At a Glance</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {atAGlance.map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</dt>
                    <dd className="mt-1 text-sm font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parcel Facts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Parcel Number" value={parcelFacts.parcelNumber} />
              <Row label="Legal Description" value={parcelFacts.legalDescription} />
              <Row label="Jurisdiction" value={parcelFacts.jurisdiction} />
              <Row label="Acreage" value={`${parcelFacts.acreage} ac`} />
            </CardContent>
          </Card>

          {findings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Key Findings</CardTitle>
                <CardDescription>Notable items surfaced across this report, with source verification.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {findings.map((finding) => (
                  <div key={finding.title} className="rounded-md border border-border p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={finding.severity} />
                      <Badge variant="outline" className="capitalize">{finding.domain}</Badge>
                      <p className="font-medium">{finding.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{finding.explanation}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <VerificationNote verification={finding.verification} />
                      {finding.investmentImplication && (
                        <span className="text-xs text-muted-foreground">{finding.investmentImplication}</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" /> Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground">
                Map preview unavailable (no mapping credentials configured)
              </div>
              <p className="text-xs text-muted-foreground">{location.mapNote}</p>
              <p className="text-xs text-muted-foreground">
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Source Coverage</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-semibold text-risk-low">{sourceCoverage.verifiedDomainCount}</p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-risk-moderate">{sourceCoverage.partialDomainCount}</p>
                <p className="text-xs text-muted-foreground">Partial</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{sourceCoverage.totalDomainCount}</p>
                <p className="text-xs text-muted-foreground">Total domains</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-accent/30">
            <CardHeader>
              <CardTitle className="text-base">Recommended Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {nextSteps.map((step) => (
                <div key={step.title} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    {step.href ? (
                      <Link
                        href={step.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        {step.title}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <p className="font-medium">{step.title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
