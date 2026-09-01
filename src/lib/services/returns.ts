import { prisma } from "@/lib/db";
import { OrderStatus, ReturnType, ReturnStatus } from "@prisma/client";

const RETURN_WINDOW_DAYS = 30;

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  deadline?: string;
}

/**
 * Return/refund policy check (spec §15-C). Eligible when: the order belongs to
 * the customer, is DELIVERED, the item is on the order, no return already
 * exists for it, and we're within the return window.
 */
export async function checkReturnEligibility(
  orderId: string,
  itemId: string,
  customerId: string,
): Promise<EligibilityResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, returnsRefunds: true },
  });
  if (!order || order.customerId !== customerId) {
    return { eligible: false, reason: "I couldn't find that order on your account." };
  }
  const item = order.items.find((i) => i.id === itemId);
  if (!item) {
    return { eligible: false, reason: "That item isn't part of this order." };
  }
  if (order.status !== OrderStatus.DELIVERED) {
    return {
      eligible: false,
      reason: `Returns open once an order is delivered. This order is currently ${order.status.toLowerCase()}.`,
    };
  }
  const existing = order.returnsRefunds.find((r) => r.itemId === itemId);
  if (existing) {
    return {
      eligible: false,
      reason: `There's already a return on file for this item (${existing.reference}).`,
    };
  }
  const from = order.estimatedDelivery ?? order.createdAt;
  const deadline = new Date(from);
  deadline.setDate(deadline.getDate() + RETURN_WINDOW_DAYS);
  if (new Date() > deadline) {
    return {
      eligible: false,
      reason: `The ${RETURN_WINDOW_DAYS}-day return window closed on ${deadline.toISOString().slice(0, 10)}.`,
      deadline: deadline.toISOString().slice(0, 10),
    };
  }
  return {
    eligible: true,
    reason: `Eligible for return until ${deadline.toISOString().slice(0, 10)}.`,
    deadline: deadline.toISOString().slice(0, 10),
  };
}

export interface ReturnResult {
  ok: boolean;
  message: string;
  reference?: string;
}

/** Create a return/refund request after re-checking eligibility. */
export async function requestReturnOrRefund(
  orderId: string,
  itemId: string,
  reason: string,
  type: ReturnType,
  customerId: string,
): Promise<ReturnResult> {
  const eligibility = await checkReturnEligibility(orderId, itemId, customerId);
  if (!eligibility.eligible) {
    return { ok: false, message: eligibility.reason };
  }

  const reference = `RMA-${Date.now().toString().slice(-8)}`;
  await prisma.returnRefund.create({
    data: {
      orderId,
      itemId,
      type,
      reason,
      status: ReturnStatus.REQUESTED,
      reference,
    },
  });

  return {
    ok: true,
    reference,
    message: `Your ${type === ReturnType.REFUND ? "refund" : "return"} request has been created. Reference: ${reference}.`,
  };
}
