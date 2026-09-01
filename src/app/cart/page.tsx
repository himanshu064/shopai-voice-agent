import { ShoppingCart } from "lucide-react";
import { getCurrentCustomerId } from "@/lib/auth/session";
import { getCartSummary } from "@/lib/services/cart";
import { emojiForCategory } from "@/components/ProductImage";
import { PageContainer, PageHeader } from "@/components/common/page";
import { EmptyState } from "@/components/common/empty-state";
import CartItems, { type CartLine } from "@/components/CartItems";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const customerId = await getCurrentCustomerId();
  const summary = await getCartSummary(customerId);

  const lines: CartLine[] = summary.items.map(({ item, unitPrice, lineTotal }) => ({
    cartItemId: item.id,
    name: item.product.name,
    variantName: item.variant?.name ?? null,
    categoryEmoji: emojiForCategory(item.product.category.name),
    unitPrice,
    quantity: item.quantity,
    lineTotal,
    inventory: item.variant?.inventory ?? 0,
  }));

  return (
    <PageContainer>
      <PageHeader title="Your cart" />

      {lines.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Browse the catalog and add something you like."
          actionLabel="Browse products"
          actionHref="/products"
        />
      ) : (
        <CartItems lines={lines} subtotal={summary.subtotal} />
      )}
    </PageContainer>
  );
}
