"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomerId } from "@/lib/auth/session";
import { cancelOrder } from "@/lib/services/orders";

export async function cancelOrderAction(orderId: string) {
  const customerId = await getCurrentCustomerId();
  const result = await cancelOrder(orderId, customerId);
  if (result.ok) {
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
  }
  return result;
}
