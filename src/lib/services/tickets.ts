import { prisma } from "@/lib/db";
import {
  ConversationStatus,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";

export interface TicketResult {
  ok: boolean;
  message: string;
  reference?: string;
  ticketId?: string;
}

/** Create a support ticket (spec §15-D). Validates order ownership if given. */
export async function createSupportTicket(
  customerId: string,
  input: {
    category: string;
    summary: string;
    priority?: TicketPriority;
    orderId?: string | null;
  },
): Promise<TicketResult> {
  let orderId = input.orderId ?? null;
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.customerId !== customerId) orderId = null; // don't attach someone else's order
  }

  // Idempotency guard: agents occasionally fire the same tool call twice. If an
  // identical open ticket was just created for this customer, return it instead
  // of creating a duplicate.
  const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
  const existing = await prisma.supportTicket.findFirst({
    where: {
      customerId,
      orderId,
      category: input.category,
      description: input.summary,
      status: TicketStatus.OPEN,
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return {
      ok: true,
      ticketId: existing.id,
      reference: existing.id.slice(-8).toUpperCase(),
      message: `You're already on file with support ticket ${existing.id
        .slice(-8)
        .toUpperCase()}. A team member will follow up.`,
    };
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      customerId,
      orderId,
      category: input.category,
      priority: input.priority ?? TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      description: input.summary,
      aiSummary: input.summary,
    },
  });

  return {
    ok: true,
    ticketId: ticket.id,
    reference: ticket.id.slice(-8).toUpperCase(),
    message: `I've created support ticket ${ticket.id.slice(-8).toUpperCase()}. A team member will follow up.`,
  };
}

/**
 * Human escalation (spec §15-D). Creates a high-priority ticket and, when the
 * conversation is known, marks it ESCALATED so the admin views reflect it.
 */
export async function transferToHuman(
  customerId: string,
  input: { reason: string; summary?: string; priority?: TicketPriority },
  externalConversationId?: string | null,
): Promise<TicketResult> {
  // Idempotency guard (same as createSupportTicket): don't create a second
  // escalation ticket if the agent fires this twice for the same customer.
  const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
  const dup = await prisma.supportTicket.findFirst({
    where: {
      customerId,
      category: "escalation",
      description: input.reason,
      status: TicketStatus.OPEN,
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  const ticket =
    dup ??
    (await prisma.supportTicket.create({
      data: {
        customerId,
        category: "escalation",
        priority: input.priority ?? TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        description: input.reason,
        aiSummary: input.summary ?? input.reason,
      },
    }));

  if (externalConversationId) {
    await prisma.conversation.updateMany({
      where: { externalConversationId },
      data: { status: ConversationStatus.ESCALATED },
    });
  }

  return {
    ok: true,
    ticketId: ticket.id,
    reference: ticket.id.slice(-8).toUpperCase(),
    message:
      "I've escalated this to a human support agent who will pick it up with the full context of our conversation.",
  };
}
