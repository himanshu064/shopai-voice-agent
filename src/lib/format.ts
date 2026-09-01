// Prisma.Decimal has a .toString() that yields a numeric string, so we accept
// anything stringifiable here rather than importing @prisma/client — that keeps
// this helper safe to use inside client components.
type Money = number | string | { toString(): string };

/** Format a price value (number, string, or Prisma.Decimal) as USD. */
export function formatCurrency(value: Money): string {
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(num) ? num : 0);
}

/** Format a date as e.g. "Aug 20, 2026". */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Format a date + time as e.g. "Aug 20, 2026, 3:45 PM". */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** Format a duration in seconds as e.g. "1m 05s" or "45s". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}
