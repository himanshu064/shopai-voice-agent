import { Ticket as TicketIcon } from "lucide-react";
import { listTickets } from "@/lib/services/admin";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SectionCard from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/common/empty-state";
import TicketsTable, { type TicketRow } from "@/components/admin/TicketsTable";

export const dynamic = "force-dynamic";

/**
 * Collapse exact-duplicate tickets so a double-fired agent tool call doesn't
 * clutter the list. Two tickets are "the same" when the customer, order,
 * category and summary all match — the earliest one is kept.
 */
function dedupe(tickets: Awaited<ReturnType<typeof listTickets>>): TicketRow[] {
  const seen = new Set<string>();
  const rows: TicketRow[] = [];
  // Oldest first so the kept ticket is the original.
  const ordered = [...tickets].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const t of ordered) {
    const summary = t.aiSummary ?? t.description ?? "";
    const key = [t.customerId, t.orderId ?? "", t.category, summary].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      id: t.id,
      reference: t.id.slice(-8).toUpperCase(),
      category: t.category,
      description: t.description,
      aiSummary: t.aiSummary,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      customer: { id: t.customer.id, name: t.customer.name },
      orderRef: t.order ? `#${t.order.id.slice(-8).toUpperCase()}` : null,
    });
  }
  // Restore newest-first for display.
  return rows.reverse();
}

export default async function AdminTicketsPage() {
  const tickets = dedupe(await listTickets());

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={TicketIcon}
        title="Support tickets"
        description="Tickets opened by the agent for escalation, warranty, and follow-up."
      />

      {tickets.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="No tickets yet"
          description="When the agent escalates an issue or a customer asks for a human, a ticket is created here."
        />
      ) : (
        <SectionCard title="All tickets" count={tickets.length} flush>
          <TicketsTable tickets={tickets} />
        </SectionCard>
      )}
    </div>
  );
}
