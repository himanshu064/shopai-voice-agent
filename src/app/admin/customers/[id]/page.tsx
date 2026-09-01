import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Package,
  MessagesSquare,
  Ticket as TicketIcon,
  CalendarClock,
} from "lucide-react";
import { getCustomerDetail } from "@/lib/services/admin";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import SectionCard from "@/components/admin/SectionCard";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import {
  ChannelBadge,
  ConversationStatusBadge,
  TicketStatusBadge,
  TicketPriorityBadge,
  AppointmentStatusBadge,
} from "@/components/admin/badges";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin/customers" className="hover:text-foreground">
          Customers
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">{customer.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Profile */}
        <div className="h-fit space-y-4 rounded-xl border bg-card p-5 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary">
              {initials(customer.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{customer.name}</p>
              <p className="text-xs text-muted-foreground">
                Since {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>
          <div className="space-y-2.5 border-t pt-4 text-sm">
            <p className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{customer.email}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              {customer.phone ?? "—"}
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              {customer.address ?? "No address on file"}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t pt-4 text-center">
            <div>
              <p className="text-lg font-bold tabular-nums">{customer.orders.length}</p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">
                {customer.conversations.length}
              </p>
              <p className="text-xs text-muted-foreground">Chats</p>
            </div>
            <div>
              <p className="text-lg font-bold tabular-nums">
                {customer.supportTickets.length}
              </p>
              <p className="text-xs text-muted-foreground">Tickets</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Orders */}
          <SectionCard icon={Package} title="Orders" count={customer.orders.length} flush>
            {customer.orders.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No orders.</p>
            ) : (
              <ul className="divide-y">
                {customer.orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/orders/${o.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-mono text-sm font-medium">
                          #{o.id.slice(-8).toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(o.createdAt)} · {o._count.items} item
                          {o._count.items === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <OrderStatusBadge status={o.status} />
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(o.total)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Conversations */}
          <SectionCard
            icon={MessagesSquare}
            title="Conversations"
            count={customer.conversations.length}
            flush
          >
            {customer.conversations.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No conversations.</p>
            ) : (
              <ul className="divide-y">
                {customer.conversations.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/conversations/${c.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(c.startedAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <ChannelBadge channel={c.channel} />
                        <ConversationStatusBadge status={c.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Tickets */}
          <SectionCard
            icon={TicketIcon}
            title="Support tickets"
            count={customer.supportTickets.length}
            flush
          >
            {customer.supportTickets.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No tickets.</p>
            ) : (
              <ul className="divide-y">
                {customer.supportTickets.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t.category}</p>
                      <p className="max-w-md truncate text-xs text-muted-foreground">
                        {t.aiSummary ?? t.description}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <TicketPriorityBadge priority={t.priority} />
                      <TicketStatusBadge status={t.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Appointments */}
          {customer.appointments.length > 0 && (
            <SectionCard
              icon={CalendarClock}
              title="Consultations"
              count={customer.appointments.length}
              flush
            >
              <ul className="divide-y">
                {customer.appointments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.slot.service}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(a.slot.startsAt)}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={a.status} />
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
