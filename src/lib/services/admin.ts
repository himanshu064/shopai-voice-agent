import { prisma } from "@/lib/db";

/**
 * Read-side queries for the admin dashboard (spec §25). All functions are
 * read-only aggregates over the operational tables written by the storefront
 * and the agent's tool webhook / post-call sync.
 */

export async function getOverviewStats() {
  const [
    conversations,
    resolved,
    escalated,
    openTickets,
    totalTickets,
    toolCalls,
    toolFailures,
    customers,
    orders,
    knowledgeDocs,
    appointments,
    endedConversations,
  ] = await Promise.all([
    prisma.conversation.count(),
    prisma.conversation.count({ where: { status: "RESOLVED" } }),
    prisma.conversation.count({ where: { status: "ESCALATED" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.supportTicket.count(),
    prisma.toolCall.count(),
    prisma.toolCall.count({ where: { status: "ERROR" } }),
    prisma.customer.count(),
    prisma.order.count(),
    prisma.knowledgeDocument.count({ where: { status: "ACTIVE" } }),
    prisma.appointment.count(),
    prisma.conversation.findMany({
      where: { endedAt: { not: null } },
      select: { startedAt: true, endedAt: true },
    }),
  ]);

  const durations = endedConversations
    .map((c) => (c.endedAt!.getTime() - c.startedAt.getTime()) / 1000)
    .filter((s) => s >= 0);
  const avgDurationSec = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  const resolutionRate = conversations
    ? Math.round((resolved / conversations) * 100)
    : 0;
  const escalationRate = conversations
    ? Math.round((escalated / conversations) * 100)
    : 0;
  const toolSuccessRate = toolCalls
    ? Math.round(((toolCalls - toolFailures) / toolCalls) * 100)
    : 0;

  return {
    conversations,
    resolved,
    escalated,
    openTickets,
    totalTickets,
    toolCalls,
    toolFailures,
    customers,
    orders,
    knowledgeDocs,
    appointments,
    avgDurationSec,
    resolutionRate,
    escalationRate,
    toolSuccessRate,
  };
}

/** Tool-usage breakdown — a proxy for "common intents" analytics. */
export async function getToolUsage() {
  const rows = await prisma.toolCall.groupBy({
    by: ["toolName"],
    _count: { toolName: true },
    orderBy: { _count: { toolName: "desc" } },
  });
  const failures = await prisma.toolCall.groupBy({
    by: ["toolName"],
    where: { status: "ERROR" },
    _count: { toolName: true },
  });
  const failMap = new Map(failures.map((f) => [f.toolName, f._count.toolName]));
  return rows.map((r) => ({
    toolName: r.toolName,
    count: r._count.toolName,
    failures: failMap.get(r.toolName) ?? 0,
  }));
}

export async function listConversations() {
  return prisma.conversation.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true, toolCalls: true } },
    },
  });
}

export async function getConversationDetail(id: string) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "asc" } },
      toolCalls: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listTickets() {
  return prisma.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      order: { select: { id: true } },
    },
  });
}

export async function listCustomers() {
  return prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { orders: true, conversations: true, supportTickets: true },
      },
    },
  });
}

export async function getCustomerDetail(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { items: true } } },
      },
      supportTickets: {
        orderBy: { createdAt: "desc" },
        include: { order: { select: { id: true } } },
      },
      conversations: { orderBy: { startedAt: "desc" } },
      appointments: {
        orderBy: { createdAt: "desc" },
        include: { slot: true },
      },
    },
  });
}

export async function listKnowledgeDocuments() {
  return prisma.knowledgeDocument.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getAgentConfigs() {
  return prisma.agentConfig.findMany({ orderBy: { version: "desc" } });
}
