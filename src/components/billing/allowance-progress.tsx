import { cn } from "@/lib/utils";

/** Simple allowance progress bar (used/limit) built from semantic tokens — no chart library needed. */
export function AllowanceProgress({
  used,
  allowance,
  className,
}: {
  used: number;
  allowance: number | null;
  className?: string;
}) {
  const pct = allowance === null || allowance <= 0 ? 0 : Math.min(100, Math.round((used / allowance) * 100));

  return (
    <div
      className={cn("h-3 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={allowance === null ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {allowance === null ? (
        <div className="h-full w-full rounded-full bg-primary/40" />
      ) : (
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
