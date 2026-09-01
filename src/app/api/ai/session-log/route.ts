import { NextRequest, NextResponse } from "next/server";
import { ConversationChannel, ConversationStatus, MessageRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifySessionToken } from "@/lib/ai/session-token";
import { getCurrentCustomerId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const SESSION_TOKEN_HEADER = "x-shopai-session-token";

const CHANNELS: Record<string, ConversationChannel> = {
  text: ConversationChannel.TEXT,
  voice: ConversationChannel.VOICE,
  phone: ConversationChannel.PHONE,
};

/**
 * Browser session logging (spec §22). The ElevenLabs post-call webhook is the
 * authoritative transcript for PHONE calls, but for the in-browser text/voice
 * widget we can't rely on it being configured/reachable — and ElevenLabs does
 * not reliably interpolate {{system__conversation_id}} into tool headers, which
 * would otherwise let tool-time capture group a conversation.
 *
 * So the browser client generates its own conversation id, passes it to the
 * agent as the `app_conversation_id` dynamic variable (used to anchor tool
 * calls), and POSTs the running transcript here. We upsert the conversation and
 * replace its messages — making every browser conversation appear in the admin
 * with its transcript, regardless of webhook configuration.
 *
 * Identity is derived from the session token (never the client), falling back
 * to the demo customer so the demo works end-to-end.
 */
export async function POST(req: NextRequest) {
  let body: {
    conversationId?: string;
    channel?: string;
    ended?: boolean;
    messages?: { role: string; text: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const conversationId = body.conversationId?.trim();
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  // Identity: verified session token → demo fallback.
  const session = verifySessionToken(req.headers.get(SESSION_TOKEN_HEADER) ?? "");
  let customerId = session?.customerId ?? null;
  if (!customerId && process.env.DEMO_IDENTITY_FALLBACK !== "false") {
    try {
      customerId = await getCurrentCustomerId();
    } catch {
      /* no seeded customer */
    }
  }

  const channel = CHANNELS[body.channel ?? "text"] ?? ConversationChannel.TEXT;
  const messages = (body.messages ?? []).filter((m) => m.text?.trim());

  try {
    const conversation = await prisma.conversation.upsert({
      where: { externalConversationId: conversationId },
      create: {
        externalConversationId: conversationId,
        channel,
        customerId: customerId ?? undefined,
        status: body.ended ? ConversationStatus.ENDED : ConversationStatus.ACTIVE,
        endedAt: body.ended ? new Date() : undefined,
      },
      update: {
        channel,
        ...(customerId ? { customerId } : {}),
        ...(body.ended
          ? { status: ConversationStatus.ENDED, endedAt: new Date() }
          : {}),
      },
    });

    // Replace the transcript (idempotent: the client sends the full running set).
    await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
    if (messages.length) {
      await prisma.message.createMany({
        data: messages.map((m) => ({
          conversationId: conversation.id,
          role: m.role === "user" ? MessageRole.USER : MessageRole.AGENT,
          content: m.text,
        })),
      });
    }

    return NextResponse.json({ ok: true, conversationId: conversation.id });
  } catch (err) {
    console.error("[session-log] failed", err);
    return NextResponse.json({ error: "Failed to log session" }, { status: 500 });
  }
}
