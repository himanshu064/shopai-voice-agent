import type {
  ConversationChannel,
  ConversationStatus,
  TicketStatus,
  TicketPriority,
  ToolCallStatus,
  AppointmentStatus,
} from "@prisma/client";
import { MessageSquare, Mic, Phone, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EMERALD = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
const AMBER = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
const ROSE = "bg-rose-500/10 text-rose-700 dark:text-rose-400";
const SLATE = "bg-muted text-muted-foreground";
const INDIGO = "bg-primary/10 text-primary";

function Pill({ className, label }: { className: string; label: string }) {
  return <Badge className={cn("capitalize", className)}>{label.toLowerCase().replace("_", " ")}</Badge>;
}

export function ConversationStatusBadge({ status }: { status: ConversationStatus }) {
  const map: Record<ConversationStatus, string> = {
    ACTIVE: INDIGO,
    RESOLVED: EMERALD,
    ESCALATED: ROSE,
    ENDED: SLATE,
  };
  return <Pill className={map[status]} label={status} />;
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, string> = {
    OPEN: AMBER,
    IN_PROGRESS: INDIGO,
    RESOLVED: EMERALD,
    CLOSED: SLATE,
  };
  return <Pill className={map[status]} label={status} />;
}

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const map: Record<TicketPriority, string> = {
    LOW: SLATE,
    MEDIUM: INDIGO,
    HIGH: AMBER,
    URGENT: ROSE,
  };
  return <Pill className={map[priority]} label={priority} />;
}

export function ToolStatusBadge({ status }: { status: ToolCallStatus }) {
  return (
    <Pill className={status === "SUCCESS" ? EMERALD : ROSE} label={status} />
  );
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const map: Record<AppointmentStatus, string> = {
    BOOKED: INDIGO,
    CONFIRMED: EMERALD,
    CANCELLED: ROSE,
    COMPLETED: SLATE,
  };
  return <Pill className={map[status]} label={status} />;
}

const CHANNEL_ICON: Record<ConversationChannel, LucideIcon> = {
  TEXT: MessageSquare,
  VOICE: Mic,
  PHONE: Phone,
};

export function ChannelBadge({ channel }: { channel: ConversationChannel }) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm capitalize">
      <Icon className="size-3.5 text-muted-foreground" />
      {channel.toLowerCase()}
    </span>
  );
}
