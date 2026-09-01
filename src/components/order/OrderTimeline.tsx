import {
  ShoppingBag,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

const STEPS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "placed", label: "Order placed", icon: ShoppingBag },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const STATUS_STEP: Record<OrderStatus, number> = {
  PENDING: 0,
  PAID: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: -1,
};

export default function OrderTimeline({
  status,
  createdAt,
  estimatedDelivery,
}: {
  status: OrderStatus;
  createdAt: Date | string;
  estimatedDelivery?: Date | string | null;
}) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
        <XCircle className="size-5" />
        <div>
          <p className="font-medium">Order cancelled</p>
          <p className="text-sm opacity-80">
            This order was cancelled and any held stock was released.
          </p>
        </div>
      </div>
    );
  }

  const current = STATUS_STEP[status];

  function dateForStep(i: number): string | null {
    if (i === 0) return formatDate(createdAt);
    if (i === current && estimatedDelivery)
      return status === "DELIVERED"
        ? formatDate(estimatedDelivery)
        : `Est. ${formatDate(estimatedDelivery)}`;
    return null;
  }

  return (
    <div className="flex">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const isFinalDelivered = i === 3 && current === 3;
        return (
          <div key={step.key} className="relative flex flex-1 flex-col items-center">
            {/* line joining the previous circle's centre to this one's
                (right edge at this circle's centre, extends one full cell left) */}
            {i > 0 && (
              <span
                className={cn(
                  "absolute top-6 right-1/2 z-0 h-1 w-full -translate-y-1/2 rounded-full",
                  i <= current ? "bg-primary" : "bg-muted",
                )}
              />
            )}
            <div
              className={cn(
                "relative z-10 grid size-12 place-items-center rounded-full shadow-sm",
                isFinalDelivered
                  ? "bg-emerald-500 text-white"
                  : done
                    ? "bg-primary text-white"
                    : "border-2 border-dashed border-muted-foreground/30 bg-background text-muted-foreground",
              )}
            >
              <step.icon className="size-5" />
            </div>
            <span
              className={cn(
                "mt-2 text-center text-xs font-medium sm:text-sm",
                done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            <span className="mt-0.5 h-4 text-center text-[11px] text-muted-foreground">
              {dateForStep(i)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
