"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

type LedgerEntryType = "reservation" | "settlement" | "release" | "grant" | "adjustment";

type LedgerEntry = {
  id: string;
  type: LedgerEntryType;
  amount: number;
  reason: string | null;
  createdAt: string;
  researchRun: { id: string; status: string; address: string | null } | null;
};

const TYPE_LABEL: Record<LedgerEntryType, string> = {
  reservation: "Reserved",
  settlement: "Settled",
  release: "Released",
  grant: "Granted",
  adjustment: "Adjusted",
};

const PAGE_SIZE = 10;

/** Paginated, append-only lookup-credit ledger table backed by GET /api/v1/usage. */
export function UsageLedgerTable() {
  const [items, setItems] = useState<LedgerEntry[] | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | undefined>>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading/error state for a new data fetch triggered by pageIndex changes.
    setLoading(true);
    setError(false);
    const cursor = cursorStack[pageIndex];
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);

    fetch(`/api/v1/usage?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load usage history.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setItems(data.ledger.items);
        setNextCursor(data.ledger.pagination.nextCursor);
        setHasMore(data.ledger.pagination.hasMore);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pageIndex, cursorStack]);

  function goNext() {
    if (!nextCursor) return;
    setCursorStack((stack) => [...stack.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((i) => i + 1);
  }

  function goPrevious() {
    setPageIndex((i) => Math.max(0, i - 1));
  }

  if (loading && items === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={History}
        title="Couldn't load usage history"
        description="Something went wrong loading your lookup history. Please try again later."
      />
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No usage yet"
        description="Your lookup history will appear here once you run your first research report."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Research run</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(entry.createdAt, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell>
                <Badge variant={entry.amount > 0 ? "success" : "outline"}>
                  {TYPE_LABEL[entry.type]}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
              </TableCell>
              <TableCell className="text-muted-foreground">{entry.reason ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {entry.researchRun
                  ? (entry.researchRun.address ?? `Run ${entry.researchRun.id.slice(0, 8)}`)
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        hasNextPage={hasMore}
        hasPreviousPage={pageIndex > 0}
        onNext={goNext}
        onPrevious={goPrevious}
        label={`Page ${pageIndex + 1}`}
      />
    </div>
  );
}
