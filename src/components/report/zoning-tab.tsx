import { Map, CheckCircle2, Clock, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { ZoningReport, Finding } from "@/contracts/schemas/report";
import { VerificationNote, SeverityBadge } from "./shared";

const USE_STATUS_VARIANT = {
  permitted: "success",
  conditional: "moderate",
  prohibited: "critical",
} as const;

export function ZoningTab({
  zoning,
  findings,
}: {
  zoning: ZoningReport;
  findings: Finding[];
}) {
  const { zoningAtAGlance, summary, permittedUses, conditionalUses, notesAndConditions, nextSteps } = zoning;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-risk-low/30 bg-risk-low/5 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Map className="h-4 w-4" /> Zoning at a Glance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-serif text-2xl font-bold">{zoningAtAGlance.code}</p>
                <Badge variant="success">{zoningAtAGlance.category}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{zoningAtAGlance.label}</p>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Jurisdiction: </span>
                {zoningAtAGlance.jurisdiction}
              </p>
              <p>
                <span className="text-muted-foreground">Last Updated: </span>
                {formatDate(zoningAtAGlance.lastUpdated)}
              </p>
              {zoningAtAGlance.ordinanceUrl && (
                <a
                  href={zoningAtAGlance.ordinanceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View ordinance
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Zoning &amp; Use Details</CardTitle>
            <CardDescription>{summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-risk-low" /> Permitted Uses
              </h3>
              <UseTable uses={permittedUses} />
            </div>
            {conditionalUses.length > 0 && (
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-risk-moderate" /> Conditional Uses
                </h3>
                <UseTable uses={conditionalUses} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {notesAndConditions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Notes &amp; Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {notesAndConditions.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zoning Findings</CardTitle>
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

      <Card className="border-primary/30 bg-accent/30">
        <CardHeader>
          <CardTitle className="text-base">Recommended Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {nextSteps.map((step) => (
            <div key={step.title} className="text-sm">
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
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function UseTable({ uses }: { uses: { use: string; status: "permitted" | "conditional" | "prohibited" }[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Use</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {uses.map((item) => (
          <TableRow key={item.use}>
            <TableCell>{item.use}</TableCell>
            <TableCell>
              <Badge variant={USE_STATUS_VARIANT[item.status]} className="capitalize">
                {item.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
