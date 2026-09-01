/**
 * Populate the admin dashboard with realistic sample activity: conversations
 * (text / voice / phone) with transcripts and tool calls, support tickets, and
 * a booked consultation. This is demo data — in production these rows are
 * written by the agent's tool webhook and the post-call sync (spec §22, §24).
 *
 *   npm run seed:admin
 *
 * Idempotent: it clears the conversation/message/tool-call, ticket and
 * appointment tables first, then reseeds. It does NOT touch customers, orders,
 * products or the knowledge base.
 */
import {
  ConversationChannel,
  ConversationStatus,
  MessageRole,
  ToolCallStatus,
  TicketPriority,
  TicketStatus,
  AppointmentStatus,
  SlotStatus,
  OrderStatus,
} from "@prisma/client";
import { prisma } from "../src/lib/db";

/** Minutes ago → Date. */
const ago = (mins: number) => new Date(Date.now() - mins * 60_000);

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { email: "alex@demo.shopai.test" },
    include: { orders: { orderBy: { createdAt: "asc" } } },
  });
  if (!customer) {
    throw new Error("Demo customer not found — run `npm run db:seed` first.");
  }
  const delivered = customer.orders.find((o) => o.status === OrderStatus.DELIVERED);
  const shipped = customer.orders.find((o) => o.status === OrderStatus.SHIPPED);
  const ref = (id?: string) => (id ? `#${id.slice(-8).toUpperCase()}` : "#—");

  // ── Reset demo activity ──────────────────────────────────────────
  await prisma.toolCall.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.supportTicket.deleteMany();
  console.log("🧹 Cleared previous conversations, tickets and appointments.");

  // ── Conversation 1: TEXT · order tracking · resolved ─────────────
  await prisma.conversation.create({
    data: {
      customerId: customer.id,
      channel: ConversationChannel.TEXT,
      status: ConversationStatus.RESOLVED,
      externalConversationId: "demo-seed-1",
      startedAt: ago(180),
      endedAt: new Date(ago(180).getTime() + 95_000),
      summary: "Customer asked where their order was; agent shared live status and ETA.",
      resolution: "Provided tracking and estimated delivery date.",
      messages: {
        create: [
          { role: MessageRole.USER, content: "Hi, where is my order?", createdAt: ago(180) },
          {
            role: MessageRole.AGENT,
            content: "Let me check that for you.",
            createdAt: new Date(ago(180).getTime() + 4_000),
          },
          {
            role: MessageRole.AGENT,
            content: `Your order ${ref(shipped?.id)} has shipped and is arriving soon. You'll get it by the estimated delivery date on your order page. Anything else?`,
            createdAt: new Date(ago(180).getTime() + 12_000),
          },
          {
            role: MessageRole.USER,
            content: "Perfect, thank you!",
            createdAt: new Date(ago(180).getTime() + 30_000),
          },
        ],
      },
      toolCalls: {
        create: [
          {
            toolName: "getOrders",
            input: {},
            output: { orders: [{ id: shipped?.id, status: "SHIPPED" }] },
            status: ToolCallStatus.SUCCESS,
            latencyMs: 142,
            createdAt: new Date(ago(180).getTime() + 6_000),
          },
          {
            toolName: "getOrderStatus",
            input: { orderId: shipped?.id },
            output: { status: "SHIPPED", trackingNumber: "1Z999AA10123456784" },
            status: ToolCallStatus.SUCCESS,
            latencyMs: 118,
            createdAt: new Date(ago(180).getTime() + 9_000),
          },
        ],
      },
    },
  });

  // ── Conversation 2: VOICE · return · resolved ────────────────────
  await prisma.conversation.create({
    data: {
      customerId: customer.id,
      channel: ConversationChannel.VOICE,
      status: ConversationStatus.RESOLVED,
      externalConversationId: "demo-seed-2",
      startedAt: ago(120),
      endedAt: new Date(ago(120).getTime() + 168_000),
      summary: "Customer requested a return for delivered headphones that arrived damaged.",
      resolution: "Confirmed eligibility and created a return request.",
      messages: {
        create: [
          {
            role: MessageRole.USER,
            content: "My headphones arrived with a cracked earcup, I'd like to return them.",
            createdAt: ago(120),
          },
          {
            role: MessageRole.AGENT,
            content: "I'm sorry to hear that. Let me check whether this order is eligible for a return.",
            createdAt: new Date(ago(120).getTime() + 5_000),
          },
          {
            role: MessageRole.AGENT,
            content: `Good news — order ${ref(delivered?.id)} is within the 30-day window. I've created a return for you; you'll get a reference by email.`,
            createdAt: new Date(ago(120).getTime() + 22_000),
          },
        ],
      },
      toolCalls: {
        create: [
          {
            toolName: "getOrders",
            input: {},
            output: { orders: [{ id: delivered?.id, status: "DELIVERED" }] },
            status: ToolCallStatus.SUCCESS,
            latencyMs: 133,
            createdAt: new Date(ago(120).getTime() + 7_000),
          },
          {
            toolName: "checkReturnEligibility",
            input: { orderId: delivered?.id },
            output: { eligible: true, reason: "Within 30-day window." },
            status: ToolCallStatus.SUCCESS,
            latencyMs: 156,
            createdAt: new Date(ago(120).getTime() + 12_000),
          },
          {
            toolName: "requestReturnOrRefund",
            input: { orderId: delivered?.id, type: "RETURN" },
            output: { ok: true, reference: "RET-8F3K2" },
            status: ToolCallStatus.SUCCESS,
            latencyMs: 204,
            createdAt: new Date(ago(120).getTime() + 18_000),
          },
        ],
      },
    },
  });

  // ── Conversation 3: PHONE · cancel refused · escalated ───────────
  await prisma.conversation.create({
    data: {
      customerId: customer.id,
      channel: ConversationChannel.PHONE,
      status: ConversationStatus.ESCALATED,
      externalConversationId: "demo-seed-3",
      startedAt: ago(60),
      endedAt: new Date(ago(60).getTime() + 241_000),
      summary: "Customer wanted to cancel an order that has already shipped; policy prevented cancellation.",
      resolution: "Escalated to a human agent; support ticket created.",
      messages: {
        create: [
          {
            role: MessageRole.USER,
            content: "I need to cancel my smartwatch order.",
            createdAt: ago(60),
          },
          {
            role: MessageRole.AGENT,
            content: `That order (${ref(shipped?.id)}) has already shipped, so I'm not able to cancel it. I can help you set up a return once it arrives, or connect you with a specialist.`,
            createdAt: new Date(ago(60).getTime() + 14_000),
          },
          {
            role: MessageRole.USER,
            content: "Please connect me to a person.",
            createdAt: new Date(ago(60).getTime() + 40_000),
          },
          {
            role: MessageRole.AGENT,
            content: "Of course — I've created a ticket and a specialist will follow up shortly.",
            createdAt: new Date(ago(60).getTime() + 52_000),
          },
        ],
      },
      toolCalls: {
        create: [
          {
            toolName: "getOrder",
            input: { orderId: shipped?.id },
            output: { id: shipped?.id, status: "SHIPPED" },
            status: ToolCallStatus.SUCCESS,
            latencyMs: 121,
            createdAt: new Date(ago(60).getTime() + 6_000),
          },
          {
            toolName: "cancelOrder",
            input: { orderId: shipped?.id },
            output: { ok: false, message: "Order has already shipped and cannot be cancelled." },
            status: ToolCallStatus.ERROR,
            latencyMs: 98,
            createdAt: new Date(ago(60).getTime() + 10_000),
          },
          {
            toolName: "transferToHuman",
            input: { reason: "Customer requested a human after cancellation was refused." },
            output: { ok: true, ticketReference: "TCK-4471" },
            status: ToolCallStatus.SUCCESS,
            latencyMs: 187,
            createdAt: new Date(ago(60).getTime() + 48_000),
          },
        ],
      },
    },
  });

  // ── Conversation 4: TEXT · policy question (KB) · ended ──────────
  await prisma.conversation.create({
    data: {
      customerId: customer.id,
      channel: ConversationChannel.TEXT,
      status: ConversationStatus.ENDED,
      externalConversationId: "demo-seed-4",
      startedAt: ago(25),
      endedAt: new Date(ago(25).getTime() + 58_000),
      summary: "Policy question about the return window, answered from the knowledge base.",
      resolution: "Answered with grounded policy information.",
      messages: {
        create: [
          {
            role: MessageRole.USER,
            content: "How long do I have to return an item?",
            createdAt: ago(25),
          },
          {
            role: MessageRole.AGENT,
            content: "You can return an eligible item within 30 days of delivery. The window starts on the delivery date, not the order date.",
            createdAt: new Date(ago(25).getTime() + 6_000),
          },
        ],
      },
    },
  });

  console.log("💬 Created 4 conversations with transcripts and tool calls.");

  // ── Support tickets ──────────────────────────────────────────────
  await prisma.supportTicket.create({
    data: {
      customerId: customer.id,
      orderId: shipped?.id,
      category: "Order cancellation",
      priority: TicketPriority.HIGH,
      status: TicketStatus.OPEN,
      description: "Customer wanted to cancel an already-shipped order; requested a human.",
      aiSummary: "Cancellation not possible post-shipment. Offer return on arrival.",
      createdAt: ago(59),
    },
  });
  await prisma.supportTicket.create({
    data: {
      customerId: customer.id,
      orderId: delivered?.id,
      category: "Warranty claim",
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      description: "Headphone left driver intermittently cuts out under normal use.",
      aiSummary: "Possible covered defect within warranty; routed to warranty team.",
      createdAt: ago(300),
    },
  });
  console.log("🎫 Created 2 support tickets.");

  // ── Booked consultation ──────────────────────────────────────────
  const slot = await prisma.consultationSlot.findFirst({
    where: { status: SlotStatus.OPEN },
    orderBy: { startsAt: "asc" },
  });
  if (slot) {
    await prisma.appointment.create({
      data: {
        customerId: customer.id,
        slotId: slot.id,
        status: AppointmentStatus.CONFIRMED,
        type: "Product consultation",
        confirmationSentAt: ago(20),
        createdAt: ago(22),
      },
    });
    await prisma.consultationSlot.update({
      where: { id: slot.id },
      data: { status: SlotStatus.BOOKED },
    });
    console.log("📅 Booked 1 consultation.");
  }

  console.log("✅ Admin demo data seeded.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ Admin demo seed failed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exitCode = 1;
});
