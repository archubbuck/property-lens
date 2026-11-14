"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, CreditCard, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountDialog } from "@/components/account/account-dialog";

export interface AvatarMenuUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface AvatarMenuEntitlement {
  planName: string;
  remaining: number | null;
  lookupAllowance: number | null;
}

function initialsFor(user: AvatarMenuUser): string {
  const first = user.firstName?.[0] ?? user.email[0] ?? "?";
  const last = user.lastName?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export function AvatarMenu({
  user,
  entitlement,
}: {
  user: AvatarMenuUser;
  entitlement: AvatarMenuEntitlement | null;
}) {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickAway(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  async function handleSignOut() {
    await fetch("/api/v1/dev-auth/sign-out", { method: "POST" });
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {initialsFor(user)}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            {entitlement ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{entitlement.planName}</span>
                {" · "}
                {entitlement.remaining === null
                  ? "Unlimited lookups"
                  : `${entitlement.remaining} lookup${entitlement.remaining === 1 ? "" : "s"} remaining`}
              </p>
            ) : null}
          </div>

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setAccountOpen(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-accent"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Manage Account
            </button>
            <Link
              href="/billing"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              Manage Subscription
            </Link>
            <Link
              href="/help"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              <LifeBuoy className="h-4 w-4 text-muted-foreground" />
              Help &amp; Support
            </Link>
          </div>

          <div className="border-t border-border py-1">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-risk-critical hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      ) : null}

      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </div>
  );
}
