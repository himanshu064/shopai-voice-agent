import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  User,
  Bot,
  Cog,
  Wrench,
  Clock,
  MessageSquareText,
  FileText,
} from "lucide-react";
import type { MessageRole } from "@prisma/client";
import { getConversationDetail } from "@/lib/services/admin";
import { formatDateTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import SectionCard from "@/components/admin/SectionCard";
import {
  ChannelBadge,
  ConversationStatusBadge,
  ToolStatusBadge,
} from "@/components/admin/badges";

export const dynamic = "force-dynamic";

const ROLE_META: Record<MessageRole, { label: string; icon: typeof User; cls: string }> = {
  USER: { label: "Customer", icon: User, cls: "bg-primary text-primary-foreground" },
  AGENT: { label: "Sarah", icon: Bot, cls: "bg-card border text-foreground" },
  SYSTEM: { label: "System", icon: Cog, cls: "bg-muted text-muted-foreground" },
  TOOL: { label: "Tool", icon: Wrench, cls: "bg-muted text-muted-foreground" },
};

function Json({ value }: { value: unknown }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/60 p-2.5 font-mono text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{children}</p>
    </div>
  );
}

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversation = await getConversationDetail(id);
  if (!conversation) notFound();

  const { customer, messages, toolCalls } = conversation;
  const durationSec = conversation.endedAt
    ? (conversation.endedAt.getTime() - conversation.startedAt.getTime()) / 1000
    : 0;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/admin/conversations" className="hover:text-foreground">
          Conversations
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">{customer?.name ?? "Conversation"}</span>
      </nav>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <User className="size-5" />
          </span>
          <div className="mr-auto">
            <h2 className="text-lg font-semibold tracking-tight">
              {customer?.name ?? "Unknown customer"}
            </h2>
            <p className="text-xs text-muted-foreground">{customer?.email ?? "—"}</p>
          </div>
          <ChannelBadge channel={conversation.channel} />
          <ConversationStatusBadge status={conversation.status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
          <Meta label="Started">{formatDateTime(conversation.startedAt)}</Meta>
          <Meta label="Ended">{formatDateTime(conversation.endedAt)}</Meta>
          <Meta label="Duration">{durationSec ? formatDuration(durationSec) : "—"}</Meta>
          <div>
            <p className="text-xs text-muted-foreground">ElevenLabs ID</p>
            <p className="mt-0.5 truncate font-mono text-xs">
              {conversation.externalConversationId ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {(conversation.summary || conversation.resolution) && (
        <SectionCard icon={FileText} title="Summary">
          <div className="space-y-2 text-sm">
            {conversation.summary && <p>{conversation.summary}</p>}
            {conversation.resolution && (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Resolution: </span>
                {conversation.resolution}
              </p>
            )}
          </div>
        </SectionCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Transcript */}
        <SectionCard icon={MessageSquareText} title="Transcript" count={messages.length}>
          {messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No messages captured for this conversation.
            </p>
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => {
                const meta = ROLE_META[m.role];
                const mine = m.role === "USER";
                return (
                  <li
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                        mine ? "rounded-br-md" : "rounded-bl-md",
                        meta.cls,
                      )}
                    >
                      <p className="mb-0.5 flex items-center gap-1 text-[11px] font-medium opacity-70">
                        <meta.icon className="size-3" />
                        {meta.label}
                      </p>
                      {m.content}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        {/* Tool calls */}
        <SectionCard icon={Wrench} title="Tool calls" count={toolCalls.length}>
          {toolCalls.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No tools were called in this conversation.
            </p>
          ) : (
            <ul className="space-y-4">
              {toolCalls.map((tc) => (
                <li key={tc.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-medium">{tc.toolName}</span>
                    <div className="flex items-center gap-2">
                      {tc.latencyMs != null && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          {tc.latencyMs}ms
                        </span>
                      )}
                      <ToolStatusBadge status={tc.status} />
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Input
                      </p>
                      <Json value={tc.input} />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Output
                      </p>
                      <Json value={tc.output} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
