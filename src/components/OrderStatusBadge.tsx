import type { OrderStatus } from "@prisma/client";
import {
  Clock,
  CreditCard,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const CONFIG: Record<
  OrderStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  PENDING: { label: "Pending", icon: Clock, className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  PAID: { label: "Paid", icon: CreditCard, className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  PROCESSING: { label: "Processing", icon: Package, className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  SHIPPED: { label: "Shipped", icon: Truck, className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" },
  DELIVERED: { label: "Delivered", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  CANCELLED: { label: "Cancelled", icon: XCircle, className: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, icon: Icon, className } = CONFIG[status];
  return (
    <Badge className={cn("gap-1 border-transparent", className)}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}
