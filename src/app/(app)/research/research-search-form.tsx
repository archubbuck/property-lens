"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SAMPLE_ADDRESS } from "@/app/api/v1/research/_lib/address";

const addressSchema = z.string().trim().min(3, "Enter a valid address to research.");

export function ResearchSearchForm({ sampleOnly = false }: { sampleOnly?: boolean }) {
  const [address, setAddress] = useState(sampleOnly ? "" : "");
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(value: string) {
    const parsed = addressSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid address.");
      return;
    }
    setError(null);
    setUpgradeRequired(false);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/research/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: parsed.data }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/sign-in?redirect_url=/research`);
          return;
        }
        setError(data?.detail ?? "We couldn't start that research run. Please try again.");
        setUpgradeRequired(Boolean(data?.upgradeRequired));
        setLoading(false);
        return;
      }
      router.push(`/research/runs/${data.runId}`);
    } catch {
      setError("We couldn't reach the server. Please try again.");
      setLoading(false);
    }
  }

  if (sampleOnly) {
    return (
      <Button variant="primary" onClick={() => submit(SAMPLE_ADDRESS)} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Try Sample Property
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          submit(address);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={`Try a sample: ${SAMPLE_ADDRESS}`}
            className="h-11 pl-9 pr-9"
            aria-label="Property address"
          />
          {address && (
            <button
              type="button"
              aria-label="Clear address"
              onClick={() => setAddress("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" size="lg" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Search
        </Button>
      </form>
      {error && (
        <p className="text-sm text-risk-critical">
          {error}
          {upgradeRequired && (
            <>
              {" "}
              <Link href="/billing" className="font-medium underline">
                View plans
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
