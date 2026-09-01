"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCustomerId } from "@/lib/auth/session";
import {
  addToCart,
  updateCartItemQuantity,
  removeCartItem,
} from "@/lib/services/cart";
import { createOrderFromCart } from "@/lib/services/orders";

export interface ActionResult {
  ok: boolean;
  message: string;
}

export async function addToCartAction(
  productId: string,
  variantId: string | null,
  quantity = 1,
): Promise<ActionResult> {
  const customerId = await getCurrentCustomerId();
  const result = await addToCart(customerId, productId, variantId, quantity);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function updateCartItemAction(
  cartItemId: string,
  quantity: number,
): Promise<ActionResult> {
  const customerId = await getCurrentCustomerId();
  const result = await updateCartItemQuantity(customerId, cartItemId, quantity);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function removeCartItemAction(
  cartItemId: string,
): Promise<ActionResult> {
  const customerId = await getCurrentCustomerId();
  const result = await removeCartItem(customerId, cartItemId);
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

/** Checkout, then redirect to the created order's page. */
export async function checkoutAction(): Promise<ActionResult> {
  const customerId = await getCurrentCustomerId();
  const result = await createOrderFromCart(customerId);
  if (result.ok && result.orderId) {
    revalidatePath("/", "layout");
    redirect(`/orders/${result.orderId}?placed=1`);
  }
  return result;
}
