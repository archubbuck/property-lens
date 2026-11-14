"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function SavePropertyButton({
  propertyId,
  initialSaved,
  signedIn,
}: {
  propertyId: string;
  initialSaved: boolean;
  signedIn: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function toggle() {
    if (!signedIn) {
      router.push(`/sign-in?redirect_url=/properties/${propertyId}`);
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/v1/properties/${propertyId}/save`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to update saved property.");
        const data = await res.json();
        setSaved(data.saved);
        toast({
          variant: "success",
          title: data.saved ? "Property saved" : "Property removed",
          description: data.saved
            ? "You can find it under Saved Properties."
            : "Removed from your saved properties.",
        });
      } catch {
        toast({ variant: "error", title: "Something went wrong", description: "Please try again." });
      }
    });
  }

  return (
    <Button variant="outline" onClick={toggle} disabled={isPending}>
      <Star className={cn("h-4 w-4", saved && "fill-primary text-primary")} />
      {saved ? "Saved" : "Save Property"}
    </Button>
  );
}
