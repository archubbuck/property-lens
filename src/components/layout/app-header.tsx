"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { AvatarMenu, type AvatarMenuEntitlement, type AvatarMenuUser } from "@/components/layout/avatar-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/research", label: "Research", match: ["/", "/research"] },
  { href: "/saved", label: "Saved Properties", match: ["/saved"] },
  { href: "/usage", label: "Usage", match: ["/usage"] },
  { href: "/billing", label: "Billing", match: ["/billing"] },
  { href: "/help", label: "Help & Support", match: ["/help", "/support"] },
];

export function AppHeader({
  user,
  entitlement,
}: {
  user: AvatarMenuUser | null;
  entitlement: AvatarMenuEntitlement | null;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = item.match.some((m) =>
                m === "/" ? pathname === "/" : pathname.startsWith(m),
              );
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "border-b-2 border-transparent pb-0.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                    active && "border-primary text-primary",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {user ? (
          <AvatarMenu user={user} entitlement={entitlement} />
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Sign In
            </Link>
            <Link href="/sign-up" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
