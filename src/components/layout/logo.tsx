import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * PropertyLens wordmark: a simple two-peak "mountain" glyph next to a serif
 * wordmark, matching the mockups' header/login branding.
 */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-serif text-xl font-semibold text-foreground",
        className,
      )}
    >
      <svg
        viewBox="0 0 32 24"
        aria-hidden="true"
        className="h-6 w-8 text-primary"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 20 L11 6 L17 16" />
        <path d="M11 20 L20 4 L30 20" />
      </svg>
      <span>PropertyLens</span>
    </Link>
  );
}
