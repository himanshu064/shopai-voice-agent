import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MapPin, CreditCard, ShoppingBag } from "lucide-react";
import { getCurrentCustomer } from "@/lib/auth/session";
import { getCartSummary } from "@/lib/services/cart";
import { formatCurrency } from "@/lib/format";
import { PageContainer } from "@/components/common/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PlaceOrderButton from "@/components/PlaceOrderButton";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const customer = await getCurrentCustomer();
  const summary = await getCartSummary(customer.id);

  if (summary.items.length === 0) {
    redirect("/cart");
  }

  return (
    <PageContainer className="max-w-4xl">
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/cart" className="hover:text-foreground">
          Cart
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">Checkout</span>
      </nav>
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-muted-foreground" />
                Shipping to
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{customer.name}</p>
              <p className="text-muted-foreground">
                {customer.address ?? "No address on file"}
              </p>
              {customer.phone && (
                <p className="text-muted-foreground">{customer.phone}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4 text-muted-foreground" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This is a demo checkout — no real payment method is required and
                no charge is made.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="size-4 text-muted-foreground" />
                Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {summary.items.map(({ item, lineTotal }) => (
                  <li key={item.id} className="flex justify-between py-3 text-sm">
                    <span>
                      {item.product.name}
                      {item.variant && (
                        <span className="text-muted-foreground">
                          {" "}
                          — {item.variant.name}
                        </span>
                      )}
                      <span className="text-muted-foreground"> × {item.quantity}</span>
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit gap-0 p-6">
          <h2 className="text-lg font-semibold">Total</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(summary.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">Free</span>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(summary.subtotal)}</span>
          </div>
          <div className="mt-6">
            <PlaceOrderButton />
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
