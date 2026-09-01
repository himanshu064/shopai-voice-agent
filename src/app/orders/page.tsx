import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { getCurrentCustomerId } from "@/lib/auth/session";
import { listOrders } from "@/lib/services/orders";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageContainer, PageHeader } from "@/components/common/page";
import { EmptyState } from "@/components/common/empty-state";
import { Card } from "@/components/ui/card";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const customerId = await getCurrentCustomerId();
  const orders = await listOrders(customerId);

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Your orders" />

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="When you place an order it'll show up here."
          actionLabel="Start shopping"
          actionHref="/products"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
            return (
              <Link key={order.id} href={`/orders/${order.id}`} className="group block">
                <Card className="flex-row items-center justify-between p-5 transition-shadow group-hover:shadow-md">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(order.createdAt)} · {itemCount} item
                      {itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
