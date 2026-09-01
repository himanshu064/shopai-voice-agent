import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "primary" | "emerald" | "amber" | "rose";

const ACCENT: Record<Accent, { tile: string; bar: string }> = {
  primary: { tile: "bg-primary/10 text-primary", bar: "bg-primary" },
  emerald: {
    tile: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  amber: {
    tile: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  rose: {
    tile: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
  },
};

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "primary",
  progress,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  accent?: Accent;
  /** 0–100; renders a progress bar under the value when provided. */
  progress?: number;
}) {
  const a = ACCENT[accent];
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-lg", a.tile)}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {progress != null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", a.bar)}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      {sub && <p className="mt-2 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
