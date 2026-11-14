import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names and resolve Tailwind conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatDate(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(
    "en-US",
    options ?? { month: "short", day: "numeric", year: "numeric" }
  ).format(date);
}

export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "minute"],
    [24, "hour"],
    [30, "day"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let duration = diffMinutes;
  let unit: Intl.RelativeTimeFormatUnit = "minute";
  for (const [amount, nextUnit] of divisions) {
    if (Math.abs(duration) < amount) {
      unit = nextUnit;
      break;
    }
    duration = Math.round(duration / amount);
    unit = nextUnit;
  }
  return rtf.format(duration, unit);
}

export function percent(value: number, fractionDigits = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`;
}
