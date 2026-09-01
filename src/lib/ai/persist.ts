import { prisma } from "@/lib/db";
import { ConversationChannel, ToolCallStatus } from "@prisma/client";

const CHANNELS: Record<string, ConversationChannel> = {
  text: ConversationChannel.TEXT,
  voice: ConversationChannel.VOICE,
  phone: ConversationChannel.PHONE,
};

/**
 * Tool-time capture (spec §22, mechanism 1): record each tool call as it runs.
 * Best-effort — a logging failure must never break the tool response.
 * Requires an external conversation id to anchor the record.
 */
export async function persistToolCall(args: {
  externalConversationId: string | null;
  channel?: string | null;
  customerId: string | null;
  toolName: string;
  input: unknown;
  output: unknown;
  status: ToolCallStatus;
  latencyMs: number;
}): Promise<void> {
  if (!args.externalConversationId) return;
  try {
    const channel = CHANNELS[args.channel ?? "text"] ?? ConversationChannel.TEXT;
    const conversation = await prisma.conversation.upsert({
      where: { externalConversationId: args.externalConversationId },
      create: {
        externalConversationId: args.externalConversationId,
        channel,
        customerId: args.customerId ?? undefined,
      },
      update: {
        // Attach the customer once we know it.
        ...(args.customerId ? { customerId: args.customerId } : {}),
      },
    });

    await prisma.toolCall.create({
      data: {
        conversationId: conversation.id,
        toolName: args.toolName,
        input: args.input as object,
        output: args.output as object,
        status: args.status,
        latencyMs: args.latencyMs,
      },
    });
  } catch (err) {
    console.error("[persistToolCall] failed (non-fatal)", err);
  }
}
