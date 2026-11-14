"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, MessageSquare, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function PropertyMenu({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div className="relative">
      <Button variant="outline" size="icon" aria-label="More actions" onClick={() => setOpen((o) => !o)}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-border bg-card p-1 text-sm shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-muted"
              onClick={() => {
                navigator.clipboard?.writeText(propertyId);
                toast({ variant: "success", title: "Copied", description: "Property ID copied to clipboard." });
                setOpen(false);
              }}
            >
              <Copy className="h-4 w-4" /> Copy Property ID
            </button>
            <Link
              href="/support/new"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <MessageSquare className="h-4 w-4" /> Report an Issue
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
