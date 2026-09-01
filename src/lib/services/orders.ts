import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import { getCartSummary } from "@/lib/services/cart";

const CANCELLABLE: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
];

const orderInclude = {
  items: {
    include: {
      product: { include: { category: true } },
      variant: true,
    },
  },
};

/** All orders for a customer, newest first. */
export async function listOrders(customerId: string) {
  return prisma.order.findMany({
    where: { customerId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
}

/** A single order, scoped to the owning customer (authorization). */
export async function getOrder(orderId: string, customerId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order || order.customerId !== customerId) return null;
  return order;
}

export interface CancelResult {
  ok: boolean;
  message: string;
}

/**
 * Cancel an order per policy (spec §26 test: shipped orders are refused).
 * Only PENDING/PAID/PROCESSING orders can be cancelled; inventory is restocked.
 */
export async function cancelOrder(
  orderId: string,
  customerId: string,
): Promise<CancelResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.customerId !== customerId) {
    return { ok: false, message: "I couldn't find that order on your account." };
  }
  if (order.status === OrderStatus.CANCELLED) {
    return { ok: false, message: "That order is already cancelled." };
  }
  if (!CANCELLABLE.includes(order.status)) {
    return {
      ok: false,
      message: `Sorry, this order can't be cancelled because it's already ${order.status.toLowerCase()}. I can help you start a return once it's delivered.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });
    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { inventory: { increment: item.quantity } },
        });
      }
    }
  });

  return {
    ok: true,
    message: `Order ${order.id.slice(-8).toUpperCase()} has been cancelled.`,
  };
}

export interface CheckoutResult {
  ok: boolean;
  message: string;
  orderId?: string;
}

/**
 * Demo checkout: turn the current cart into an order, decrement inventory,
 * and clear the cart — all in one transaction. No real payment.
 */
export async function createOrderFromCart(
  customerId: string,
): Promise<CheckoutResult> {
  const summary = await getCartSummary(customerId);
  if (summary.items.length === 0) {
    return { ok: false, message: "Your cart is empty." };
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) return { ok: false, message: "Customer not found." };

  // Re-validate stock at checkout time.
  for (const line of summary.items) {
    const stock = line.item.variant?.inventory ?? 0;
    if (line.item.quantity > stock) {
      return {
        ok: false,
        message: `${line.item.product.name} (${line.item.variant?.name}) — only ${stock} left.`,
      };
    }
  }

  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        customerId,
        status: OrderStatus.PROCESSING,
        total: summary.subtotal,
        shippingAddress: customer.address ?? "N/A",
        trackingNumber: `SA${Date.now().toString().slice(-10)}`,
        estimatedDelivery,
        items: {
          create: summary.items.map((line) => ({
            productId: line.item.productId,
            variantId: line.item.variantId,
            quantity: line.item.quantity,
            unitPrice: line.unitPrice,
          })),
        },
      },
    });

    // Decrement inventory per variant.
    for (const line of summary.items) {
      if (line.item.variantId) {
        await tx.productVariant.update({
          where: { id: line.item.variantId },
          data: { inventory: { decrement: line.item.quantity } },
        });
      }
    }

    // Clear the cart.
    await tx.cartItem.deleteMany({ where: { cartId: summary.cartId } });

    return created;
  });

  return { ok: true, message: "Order placed!", orderId: order.id };
}
