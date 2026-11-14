import { Users, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { OwnershipReport, Finding } from "@/contracts/schemas/report";
import { VerificationNote, SeverityBadge } from "./shared";

export function OwnershipTab({
  ownership,
  findings,
}: {
  ownership: OwnershipReport;
  findings: Finding[];
}) {
  const { currentOwner, quickFacts, ownershipHistory, deedRecords, relatedParties, mortgage } = ownership;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-risk-low/15 text-risk-low">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm font-medium text-risk-low">Current Owner</p>
              <h2 className="font-serif text-xl font-semibold">{currentOwner.name}</h2>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner Type</p>
                  <p>{currentOwner.ownerType}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Owned Since</p>
                  <p>{currentOwner.ownedSinceLabel}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Facts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <FactRow label="Owner Occupied" value={quickFacts.ownerOccupied ? "Yes" : "No"} />
            <FactRow label="Number of Owners" value={String(quickFacts.numberOfOwners)} />
            <FactRow label="Related Entities" value={String(quickFacts.relatedEntities)} />
            <FactRow label="Active Mortgage" value={quickFacts.activeMortgage ? "Yes" : "No"} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ownership History</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4 border-l border-border pl-4">
              {ownershipHistory.map((entry) => (
                <li key={`${entry.ownerName}-${entry.startDate}`} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${
                      entry.isCurrent ? "bg-risk-low" : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{entry.durationLabel}</p>
                    {entry.isCurrent && <Badge variant="success">Current</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.ownerName}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Related Parties</CardTitle>
          </CardHeader>
          <CardContent>
            {relatedParties.found ? (
              <p className="text-sm">{relatedParties.note}</p>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Users className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No related parties found</p>
                <p className="max-w-xs text-sm text-muted-foreground">{relatedParties.note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deed &amp; Ownership Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recorded</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {deedRecords.map((doc) => (
                <TableRow key={doc.documentName}>
                  <TableCell className="font-medium">{doc.documentName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.documentType}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(doc.recordedDate)}</TableCell>
                  <TableCell>{doc.pages}</TableCell>
                  <TableCell>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" /> View
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {mortgage && (
        <Card>
          <CardHeader>
            <CardTitle>Mortgage Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <FactRow label="Lender" value={mortgage.lender} />
            <FactRow label="Loan Type" value={mortgage.loanType} />
            <FactRow label="Original Amount" value={formatCurrency(mortgage.originalAmount.cents / 100)} />
            <FactRow label="Recorded" value={formatDate(mortgage.recordedDate)} />
            <FactRow
              label="Status"
              value={<Badge variant={mortgage.status.toLowerCase() === "active" ? "success" : "outline"}>{mortgage.status}</Badge>}
            />
          </CardContent>
        </Card>
      )}

      {findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ownership Findings</CardTitle>
            <CardDescription>Notable ownership-related items, with source verification.</CardDescription>
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

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
