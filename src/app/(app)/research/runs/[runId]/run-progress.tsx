"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  MinusCircle,
  X,
  Info,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ResearchSearchForm } from "../../research-search-form";

type Stage = {
  key: string;
  label: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
};

type RunState = {
  run: {
    id: string;
    status: string;
    isSample: boolean;
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
  };
  property: {
    id: string;
    isDemoSample: boolean;
    address: { line1: string; city: string; state: string; postalCode: string } | null;
  } | null;
  stages: Stage[];
};

const TERMINAL = ["completed", "partial", "failed", "cancelled"];

function StageIcon({ status }: { status: string }) {
  if (status === "complete") return <CheckCircle2 className="h-5 w-5 text-risk-low" />;
  if (status === "in_progress") return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
  if (status === "skipped") return <MinusCircle className="h-5 w-5 text-muted-foreground" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

function StageStatusLabel({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "info" | "unknown" | "outline" }> = {
    complete: { label: "Complete", variant: "success" },
    in_progress: { label: "In Progress", variant: "info" },
    pending: { label: "Pending", variant: "unknown" },
    skipped: { label: "Skipped", variant: "outline" },
  };
  const meta = map[status] ?? map.pending!;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function RunProgress({ runId }: { runId: string }) {
  const [state, setState] = useState<RunState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();
  const redirected = useRef(false);

  const poll = useCallback(async () => {
    const res = await fetch(`/api/v1/research/runs/${runId}`, { cache: "no-store" });
    if (!res.ok) return;
    const data: RunState = await res.json();
    setState(data);
    return data;
  }, [runId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function tick() {
      const data = await poll();
      if (cancelled) return;
      if (data && TERMINAL.includes(data.run.status) && timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    tick();
    timer = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [poll]);

  useEffect(() => {
    if (!state) return;
    const start = new Date(state.run.startedAt).getTime();
    const end = state.run.completedAt ? new Date(state.run.completedAt).getTime() : Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derives elapsed time from the latest polled run state.
    setElapsedSeconds(Math.max(0, Math.round((end - start) / 1000)));
    if (!TERMINAL.includes(state.run.status)) {
      const tick = setInterval(() => {
        setElapsedSeconds(Math.max(0, Math.round((Date.now() - start) / 1000)));
      }, 1000);
      return () => clearInterval(tick);
    }
  }, [state]);

  useEffect(() => {
    if (state?.run.status === "completed" && state.property && !redirected.current) {
      redirected.current = true;
      router.replace(`/properties/${state.property.id}`);
    }
  }, [state, router]);

  async function cancel() {
    setCancelling(true);
    try {
      await fetch(`/api/v1/research/runs/${runId}/cancel`, { method: "POST" });
      await poll();
    } finally {
      setCancelling(false);
    }
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <p className="text-muted-foreground">Loading research run…</p>
      </div>
    );
  }

  const { run, property, stages } = state;
  const isTerminal = TERMINAL.includes(run.status);
  const completeCount = stages.filter((s) => s.status === "complete").length;
  const progressPct = stages.length
    ? Math.round(
        ((completeCount + (stages.some((s) => s.status === "in_progress") ? 0.5 : 0)) / stages.length) * 100
      )
    : 0;
  const address = property?.address
    ? `${property.address.line1}, ${property.address.city}, ${property.address.state} ${property.address.postalCode}`
    : "Property";
  const isHonestUnavailable = run.status === "failed" && !run.isSample;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link href="/research" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to Research
      </Link>

      <header>
        <h1 className="font-serif text-3xl font-bold">
          {isHonestUnavailable ? "Research Unavailable" : run.status === "cancelled" ? "Research Cancelled" : "Researching Your Property"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isHonestUnavailable
            ? "We finished checking, but couldn't produce a verified report for this address."
            : "We're gathering official records, analyzing the data, and building your property report."}
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-xl font-semibold">{address}</p>
            <p className="text-sm text-muted-foreground">Started {new Date(run.startedAt).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isTerminal ? (run.status === "completed" ? "success" : "critical") : "info"} className="capitalize">
              {run.status.replace("_", " ")}
            </Badge>
            {!isTerminal && (
              <Button variant="outline" size="sm" onClick={cancel} disabled={cancelling}>
                <X className="h-4 w-4" /> Cancel Research
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!isTerminal && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <p className="mb-1 font-medium">Overall Progress</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {progressPct}% · Elapsed {elapsedSeconds}s
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-1 py-5">
          <p className="mb-3 font-serif text-lg font-semibold">Research Stages</p>
          <ol className="space-y-4 border-l border-border pl-5">
            {stages.map((stage) => (
              <li key={stage.key} className="relative">
                <span className="absolute -left-[31px] top-0 bg-background">
                  <StageIcon status={stage.status} />
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{stage.label}</p>
                  <StageStatusLabel status={stage.status} />
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {isHonestUnavailable && (
        <div className="space-y-4">
          <Alert variant="info" title="Why wasn't a report produced?">
            {run.errorMessage}
          </Alert>
          <Card className="border-primary/30 bg-accent/20">
            <CardContent className="flex flex-col items-start gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">Try the sample property instead</p>
                  <p className="text-sm text-muted-foreground">
                    See a fully working report for 12814 Willow Creek Dr, Fulshear, TX.
                  </p>
                </div>
              </div>
              <ResearchSearchForm sampleOnly />
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                const res = await fetch("/api/v1/research/runs", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ address }),
                });
                const data = await res.json().catch(() => null);
                if (res.ok) router.push(`/research/runs/${data.runId}`);
              }}
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
            <Link href="/research" className="inline-flex">
              <Button variant="primary">Back to Research</Button>
            </Link>
          </div>
        </div>
      )}

      {run.status === "cancelled" && (
        <Alert variant="neutral" title="Research cancelled">
          You cancelled this research run. No credit was charged.
        </Alert>
      )}
    </div>
  );
}
