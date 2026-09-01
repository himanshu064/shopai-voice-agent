import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/** Get the customer's cart, creating one if needed. */
export async function getOrCreateCart(customerId: string) {
  const existing = await prisma.cart.findFirst({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return prisma.cart.create({ data: { customerId } });
}

const cartItemInclude = {
  product: { include: { category: true } },
  variant: true,
} satisfies Prisma.CartItemInclude;

type CartItemWithDetails = Prisma.CartItemGetPayload<{
  include: typeof cartItemInclude;
}>;

export interface CartSummary {
  cartId: string;
  items: Array<{
    item: CartItemWithDetails;
    unitPrice: number;
    lineTotal: number;
  }>;
  itemCount: number;
  subtotal: number;
}

function unitPriceOf(item: CartItemWithDetails): number {
  const base = Number(item.product.price);
  const delta = item.variant ? Number(item.variant.priceDelta) : 0;
  return base + delta;
}

/** Full cart contents with computed totals for display. */
export async function getCartSummary(customerId: string): Promise<CartSummary> {
  const cart = await getOrCreateCart(customerId);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: cartItemInclude,
    orderBy: { id: "asc" },
  });

  const lines = items.map((item) => {
    const unitPrice = unitPriceOf(item);
    return { item, unitPrice, lineTotal: unitPrice * item.quantity };
  });

  return {
    cartId: cart.id,
    items: lines,
    itemCount: lines.reduce((n, l) => n + l.item.quantity, 0),
    subtotal: lines.reduce((sum, l) => sum + l.lineTotal, 0),
  };
}

/** Lightweight count for the header badge. */
export async function getCartItemCount(customerId: string): Promise<number> {
  const cart = await prisma.cart.findFirst({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  if (!cart) return 0;
  const agg = await prisma.cartItem.aggregate({
    where: { cartId: cart.id },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export interface AddToCartResult {
  ok: boolean;
  message: string;
}

/**
 * Add a product (optionally a variant) to the cart, validating stock.
 * Shared by the storefront UI and (later) the AI addToCart tool.
 */
export async function addToCart(
  customerId: string,
  productId: string,
  variantId: string | null,
  quantity = 1,
): Promise<AddToCartResult> {
  if (quantity < 1) return { ok: false, message: "Quantity must be at least 1." };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product) return { ok: false, message: "Product not found." };

  // Resolve the variant: explicit, or the sole variant if there is only one.
  const variant = variantId
    ? product.variants.find((v) => v.id === variantId)
    : product.variants.length === 1
      ? product.variants[0]
      : undefined;

  if (!variant) {
    return {
      ok: false,
      message:
        product.variants.length > 1
          ? "Please choose a variant."
          : "Variant not found.",
    };
  }

  const cart = await getOrCreateCart(customerId);
  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variant.id },
  });

  const desiredQty = (existing?.quantity ?? 0) + quantity;
  if (desiredQty > variant.inventory) {
    return {
      ok: false,
      message:
        variant.inventory === 0
          ? `${product.name} (${variant.name}) is out of stock.`
          : `Only ${variant.inventory} in stock for ${product.name} (${variant.name}).`,
    };
  }

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: desiredQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, variantId: variant.id, quantity },
    });
  }

  return { ok: true, message: `Added ${product.name} to your cart.` };
}

export async function updateCartItemQuantity(
  customerId: string,
  cartItemId: string,
  quantity: number,
): Promise<AddToCartResult> {
  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: true, variant: true, product: true },
  });
  if (!item || item.cart.customerId !== customerId) {
    return { ok: false, message: "Cart item not found." };
  }
  if (quantity < 1) {
    await prisma.cartItem.delete({ where: { id: cartItemId } });
    return { ok: true, message: "Item removed." };
  }
  const stock = item.variant?.inventory ?? 0;
  if (quantity > stock) {
    return { ok: false, message: `Only ${stock} in stock.` };
  }
  await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
  return { ok: true, message: "Cart updated." };
}

export async function removeCartItem(
  customerId: string,
  cartItemId: string,
): Promise<AddToCartResult> {
  const item = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { cart: true },
  });
  if (!item || item.cart.customerId !== customerId) {
    return { ok: false, message: "Cart item not found." };
  }
  await prisma.cartItem.delete({ where: { id: cartItemId } });
  return { ok: true, message: "Item removed." };
}

export async function clearCart(customerId: string): Promise<void> {
  const cart = await prisma.cart.findFirst({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }
}
