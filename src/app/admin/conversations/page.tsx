import Link from "next/link";
import { MessagesSquare, ChevronRight } from "lucide-react";
import { listConversations } from "@/lib/services/admin";
import { formatDateTime } from "@/lib/format";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SectionCard from "@/components/admin/SectionCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { ChannelBadge, ConversationStatusBadge } from "@/components/admin/badges";

export const dynamic = "force-dynamic";

export default async function AdminConversationsPage() {
  const conversations = await listConversations();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={MessagesSquare}
        title="Conversations"
        description="Every agent conversation, with its transcript and tool calls."
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No conversations yet"
          description="Conversations are recorded when a customer talks to Sarah and a tool runs, or via the post-call sync webhook."
        />
      ) : (
        <SectionCard title="All conversations" count={conversations.length} flush>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Customer</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead className="text-right">Tools</TableHead>
                <TableHead>Started</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((c) => (
                <TableRow key={c.id} className="group cursor-pointer">
                  <TableCell className="pl-5">
                    <Link
                      href={`/admin/conversations/${c.id}`}
                      className="font-medium group-hover:text-primary"
                    >
                      {c.customer?.name ?? "Unknown"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {c.customer?.email ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <ChannelBadge channel={c.channel} />
                  </TableCell>
                  <TableCell>
                    <ConversationStatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c._count.messages}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c._count.toolCalls}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(c.startedAt)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/conversations/${c.id}`}
                      className="text-muted-foreground group-hover:text-primary"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      )}
    </div>
  );
}
