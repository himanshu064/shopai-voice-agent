import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** Stock indicator: in stock / low stock / sold out. */
export function StockBadge({
  inventory,
  className,
}: {
  inventory: number;
  className?: string;
}) {
  if (inventory <= 0) {
    return (
      <Badge variant="destructive" className={className}>
        Sold out
      </Badge>
    );
  }
  if (inventory <= 5) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
          className,
        )}
      >
        Low stock
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
        className,
      )}
    >
      In stock
    </Badge>
  );
}
