import Link from "next/link";
import {
  LayoutDashboard,
  MessagesSquare,
  CheckCircle2,
  AlertTriangle,
  Ticket,
  Timer,
  Wrench,
  Users,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { getOverviewStats, getToolUsage, listConversations, listTickets } from "@/lib/services/admin";
import { formatDuration, formatDateTime } from "@/lib/format";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SectionCard from "@/components/admin/SectionCard";
import StatCard from "@/components/admin/StatCard";
import {
  ChannelBadge,
  ConversationStatusBadge,
  TicketStatusBadge,
  TicketPriorityBadge,
} from "@/components/admin/badges";

export const dynamic = "force-dynamic";

const ViewAll = ({ href }: { href: string }) => (
  <Link
    href={href}
    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
  >
    View all <ArrowRight className="size-3.5" />
  </Link>
);

export default async function AdminOverviewPage() {
  const [stats, toolUsage, conversations, tickets] = await Promise.all([
    getOverviewStats(),
    getToolUsage(),
    listConversations(),
    listTickets(),
  ]);

  const recentConversations = conversations.slice(0, 5);
  const openTickets = tickets
    .filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS")
    .slice(0, 5);
  const maxToolCount = Math.max(1, ...toolUsage.map((t) => t.count));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Overview"
        description="Support activity and agent performance at a glance."
      />

      {/* Primary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Conversations"
          value={stats.conversations}
          sub={`${stats.avgDurationSec ? formatDuration(stats.avgDurationSec) : "—"} avg duration`}
          icon={MessagesSquare}
          accent="primary"
        />
        <StatCard
          label="AI resolved"
          value={`${stats.resolutionRate}%`}
          sub={`${stats.resolved} of ${stats.conversations} conversations`}
          icon={CheckCircle2}
          accent="emerald"
          progress={stats.resolutionRate}
        />
        <StatCard
          label="Escalated"
          value={`${stats.escalationRate}%`}
          sub={`${stats.escalated} handed to a human`}
          icon={AlertTriangle}
          accent="amber"
          progress={stats.escalationRate}
        />
        <StatCard
          label="Open tickets"
          value={stats.openTickets}
          sub={`${stats.totalTickets} total`}
          icon={Ticket}
          accent="rose"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Tool success"
          value={`${stats.toolSuccessRate}%`}
          sub={`${stats.toolCalls} calls · ${stats.toolFailures} failed`}
          icon={Wrench}
          accent="primary"
          progress={stats.toolSuccessRate}
        />
        <StatCard label="Customers" value={stats.customers} icon={Users} accent="primary" />
        <StatCard
          label="Knowledge docs"
          value={stats.knowledgeDocs}
          sub="active & attached"
          icon={BookOpen}
          accent="emerald"
        />
        <StatCard
          label="Avg. duration"
          value={stats.avgDurationSec ? formatDuration(stats.avgDurationSec) : "—"}
          sub="per conversation"
          icon={Timer}
          accent="primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent conversations */}
        <SectionCard
          icon={MessagesSquare}
          title="Recent conversations"
          action={<ViewAll href="/admin/conversations" />}
          flush
        >
          {recentConversations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No conversations recorded yet.
            </p>
          ) : (
            <ul className="divide-y">
              {recentConversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/conversations/${c.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {c.customer?.name ?? "Unknown customer"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(c.startedAt)} · {c._count.messages} msgs ·{" "}
                        {c._count.toolCalls} tools
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ChannelBadge channel={c.channel} />
                      <ConversationStatusBadge status={c.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Open tickets */}
        <SectionCard
          icon={Ticket}
          title="Open tickets"
          action={<ViewAll href="/admin/tickets" />}
          flush
        >
          {openTickets.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No open tickets. 🎉
            </p>
          ) : (
            <ul className="divide-y">
              {openTickets.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.customer.name} · {formatDateTime(t.createdAt)}
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
      </div>

      {/* Tool usage analytics */}
      <SectionCard icon={Wrench} title="Tool usage">
        {toolUsage.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No tool calls recorded yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {toolUsage.map((t) => (
              <li key={t.toolName} className="flex items-center gap-3">
                <span className="w-44 shrink-0 truncate font-mono text-xs">
                  {t.toolName}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(t.count / maxToolCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
                  {t.count}
                </span>
                <span className="w-16 shrink-0 text-right text-xs">
                  {t.failures > 0 ? (
                    <span className="text-rose-600">{t.failures} fail</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
