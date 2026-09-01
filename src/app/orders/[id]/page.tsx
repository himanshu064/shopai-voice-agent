import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, PartyPopper, MapPin, RotateCcw } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { getCurrentCustomerId } from "@/lib/auth/session";
import { getOrder } from "@/lib/services/orders";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageContainer } from "@/components/common/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import OrderTimeline from "@/components/order/OrderTimeline";
import OrderActions from "@/components/order/OrderActions";
import AiSupportCard from "@/components/order/AiSupportCard";
import { emojiForCategory } from "@/components/ProductImage";

export const dynamic = "force-dynamic";

const CANCELLABLE: OrderStatus[] = ["PENDING", "PAID", "PROCESSING"];

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { id } = await params;
  const { placed } = await searchParams;
  const customerId = await getCurrentCustomerId();
  const order = await getOrder(id, customerId);
  if (!order) notFound();

  const ref = order.id.slice(-8).toUpperCase();
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = order.items.reduce(
    (sum, i) => sum + Number(i.unitPrice) * i.quantity,
    0,
  );

  return (
    <PageContainer className="max-w-5xl">
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/orders" className="hover:text-foreground">
          Orders
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">#{ref}</span>
      </nav>

      {placed && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          <PartyPopper className="size-5" />
          <p className="font-medium">Your order was placed successfully!</p>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Order #{ref}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Placed {formatDate(order.createdAt)} · {itemCount} item
          {itemCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* Tracking — full width */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <OrderTimeline
            status={order.status}
            createdAt={order.createdAt}
            estimatedDelivery={order.estimatedDelivery}
          />
          {order.trackingNumber && order.status !== "CANCELLED" && (
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Tracking number: </span>
              <span className="font-mono font-medium">{order.trackingNumber}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left: items + AI support */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Items ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0">
                    <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-muted text-3xl">
                      {emojiForCategory(item.product.category.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.productId}`}
                        className="font-medium hover:text-primary"
                      >
                        {item.product.name}
                      </Link>
                      {item.variant && (
                        <p className="text-sm text-muted-foreground">
                          {item.variant.name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.unitPrice)} × {item.quantity}
                      </p>
                      <Button
                        asChild
                        variant="link"
                        size="sm"
                        className="mt-1 h-auto p-0 text-primary"
                      >
                        <Link href={`/products/${item.productId}`}>
                          <RotateCcw className="size-3.5" />
                          Buy again
                        </Link>
                      </Button>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(Number(item.unitPrice) * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* AI support — prominent ElevenLabs showcase, fills the main column */}
          <AiSupportCard />
        </div>

        {/* Right: summary + address + actions */}
        <div className="space-y-6">
          <Card className="gap-0 p-6">
            <h2 className="text-base font-semibold">Order summary</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"})
                </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-emerald-600">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium tabular-nums">{formatCurrency(0)}</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(order.total)}</span>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" />
                Delivery address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>{order.shippingAddress}</p>
              {order.estimatedDelivery && order.status !== "CANCELLED" && (
                <p className="mt-2 text-muted-foreground">
                  {order.status === "DELIVERED" ? "Delivered" : "Arriving by"}{" "}
                  <span className="font-medium text-foreground">
                    {formatDate(order.estimatedDelivery)}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          <OrderActions
            orderId={order.id}
            cancellable={CANCELLABLE.includes(order.status)}
          />
        </div>
      </div>
    </PageContainer>
  );
}
