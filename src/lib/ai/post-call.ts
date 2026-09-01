import crypto from "node:crypto";
import {
  ConversationChannel,
  ConversationStatus,
  MessageRole,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifySessionToken } from "@/lib/ai/session-token";
import { getCurrentCustomerId } from "@/lib/auth/session";

/**
 * ElevenLabs post-call webhook (spec §22, mechanism 2): the authoritative record.
 * When a conversation ends, ElevenLabs POSTs the full transcript, metadata and
 * an AI-generated summary. We verify the HMAC signature, then upsert the
 * `conversations` row and (re)insert `messages` from the transcript. Tool calls
 * captured live at tool-time (mechanism 1) are left as-is — they carry accurate
 * per-tool latency the transcript doesn't have.
 */

// ── Signature verification ──────────────────────────────────────────────────
// Header format: `t=<unix-seconds>,v0=<hex-hmac-sha256>` signed over
// `${t}.${rawBody}` with the workspace webhook secret (wsec_…).

function postCallSecret(): string | undefined {
  return process.env.ELEVENLABS_POST_CALL_SECRET ?? process.env.ELEVENLABS_WEBHOOK_SECRET;
}

export function verifyPostCallSignature(
  rawBody: string,
  signatureHeader: string | null,
): { ok: boolean; reason?: string } {
  const secret = postCallSecret();
  if (!secret) {
    // Dev mode: no secret configured yet — accept so the endpoint is testable.
    return { ok: true, reason: "no-secret-configured" };
  }
  if (!signatureHeader) return { ok: false, reason: "missing-signature" };

  const segments = signatureHeader.split(",");
  const t = segments.find((s) => s.startsWith("t="))?.slice(2);
  const v0 = segments.find((s) => s.startsWith("v0=")); // full "v0=<hex>"
  if (!t || !v0) return { ok: false, reason: "malformed-signature" };

  const expected =
    "v0=" +
    crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");

  const a = Buffer.from(v0);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature-mismatch" };
  }

  // Replay guard: warn on very stale timestamps but don't reject — post-call
  // webhooks and their retries can arrive minutes late.
  const skewSec = Math.abs(Date.now() / 1000 - Number(t));
  if (Number.isFinite(skewSec) && skewSec > 1800) {
    console.warn(`[post-call] stale webhook timestamp (${Math.round(skewSec)}s skew)`);
  }
  return { ok: true };
}

// ── Payload shape (only the fields we consume) ──────────────────────────────

interface TranscriptTurn {
  role?: string;
  message?: string | null;
  time_in_call_secs?: number;
  tool_calls?: { tool_name?: string; name?: string }[] | null;
}

export interface PostCallData {
  conversation_id?: string;
  agent_id?: string;
  status?: string;
  transcript?: TranscriptTurn[];
  metadata?: {
    start_time_unix_secs?: number;
    call_duration_secs?: number;
  };
  analysis?: {
    transcript_summary?: string;
    call_successful?: string; // "success" | "failure" | "unknown"
  };
  conversation_initiation_client_data?: {
    dynamic_variables?: Record<string, string | number | boolean>;
  };
}

const CHANNELS: Record<string, ConversationChannel> = {
  text: ConversationChannel.TEXT,
  voice: ConversationChannel.VOICE,
  phone: ConversationChannel.PHONE,
};

function roleFor(role?: string): MessageRole {
  switch ((role ?? "").toLowerCase()) {
    case "user":
      return MessageRole.USER;
    case "agent":
    case "assistant":
      return MessageRole.AGENT;
    case "tool":
      return MessageRole.TOOL;
    default:
      return MessageRole.SYSTEM;
  }
}

/** Persist a post-call transcription payload. Idempotent — safe on retries. */
export async function syncPostCall(data: PostCallData): Promise<{
  ok: boolean;
  conversationId?: string;
  messages?: number;
  reason?: string;
}> {
  const externalConversationId = data.conversation_id;
  if (!externalConversationId) return { ok: false, reason: "missing-conversation-id" };

  const vars = data.conversation_initiation_client_data?.dynamic_variables ?? {};

  // Identity: prefer the session token forwarded at session start; else keep
  // whatever the live tool calls already attached; else the demo fallback.
  const token = typeof vars.session_token === "string" ? vars.session_token : null;
  let customerId = token ? (verifySessionToken(token)?.customerId ?? null) : null;

  const existing = await prisma.conversation.findUnique({
    where: { externalConversationId },
  });
  if (!customerId) customerId = existing?.customerId ?? null;
  if (!customerId && process.env.DEMO_IDENTITY_FALLBACK !== "false") {
    try {
      customerId = await getCurrentCustomerId();
    } catch {
      /* no seeded customer */
    }
  }

  // Channel: dynamic var → existing record → default VOICE (post-call webhooks
  // fire for voice/phone; browser text sessions rarely trigger them).
  const channelVar = typeof vars.conversation_channel === "string" ? vars.conversation_channel : null;
  const channel =
    (channelVar ? CHANNELS[channelVar] : undefined) ??
    existing?.channel ??
    ConversationChannel.VOICE;

  const startedAt = data.metadata?.start_time_unix_secs
    ? new Date(data.metadata.start_time_unix_secs * 1000)
    : (existing?.startedAt ?? new Date());
  const endedAt = data.metadata?.call_duration_secs
    ? new Date(startedAt.getTime() + data.metadata.call_duration_secs * 1000)
    : new Date();

  const summary = data.analysis?.transcript_summary ?? null;

  // Escalation if the agent called a handoff tool anywhere in the transcript.
  const escalated = (data.transcript ?? []).some((turn) =>
    (turn.tool_calls ?? []).some((tc) => {
      const name = (tc.tool_name ?? tc.name ?? "").toLowerCase();
      return name === "transfertohuman";
    }),
  );
  const successful = data.analysis?.call_successful === "success";
  const status: ConversationStatus = escalated
    ? ConversationStatus.ESCALATED
    : successful
      ? ConversationStatus.RESOLVED
      : ConversationStatus.ENDED;
  const resolution = escalated
    ? "Escalated to a human agent."
    : successful
      ? "Resolved by the AI agent."
      : "Conversation ended.";

  const conversation = await prisma.conversation.upsert({
    where: { externalConversationId },
    create: {
      externalConversationId,
      channel,
      customerId: customerId ?? undefined,
      status,
      startedAt,
      endedAt,
      summary,
      resolution,
    },
    update: {
      channel,
      ...(customerId ? { customerId } : {}),
      status,
      startedAt,
      endedAt,
      summary,
      resolution,
    },
  });

  // Replace messages so retries don't duplicate the transcript.
  const turns = (data.transcript ?? []).filter(
    (t) => typeof t.message === "string" && t.message.trim().length > 0,
  );
  await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
  if (turns.length) {
    await prisma.message.createMany({
      data: turns.map((t) => ({
        conversationId: conversation.id,
        role: roleFor(t.role),
        content: t.message as string,
        createdAt: new Date(startedAt.getTime() + (t.time_in_call_secs ?? 0) * 1000),
      })),
    });
  }

  return { ok: true, conversationId: conversation.id, messages: turns.length };
}
