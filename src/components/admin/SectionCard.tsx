import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Framed section used across admin screens. Renders a titled header bar (icon,
 * title, optional count + action) above its content. Pass `flush` for tables so
 * the content sits edge-to-edge under the header.
 */
export default function SectionCard({
  icon: Icon,
  title,
  count,
  action,
  flush,
  className,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  count?: number;
  action?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          {title}
          {count != null && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
              {count}
            </span>
          )}
        </h3>
        {action}
      </header>
      <div className={cn(flush ? "" : "p-5")}>{children}</div>
    </section>
  );
}
