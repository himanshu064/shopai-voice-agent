import { NextRequest, NextResponse } from "next/server";
import {
  verifyPostCallSignature,
  syncPostCall,
  type PostCallData,
} from "@/lib/ai/post-call";

export const dynamic = "force-dynamic";

const SIGNATURE_HEADER = "elevenlabs-signature";

/**
 * ElevenLabs post-call webhook (spec §22, mechanism 2).
 *
 * Configure ElevenLabs to POST here when a conversation ends. We verify the
 * HMAC signature against ELEVENLABS_POST_CALL_SECRET (or ELEVENLABS_WEBHOOK_SECRET),
 * then sync the transcript + summary into `conversations`/`messages`.
 *
 * Always answer 200 for a validly-signed request even if the payload type is
 * one we don't handle — a non-2xx makes ElevenLabs retry indefinitely.
 */
export async function POST(req: NextRequest) {
  // Raw body is required to verify the signature — read it before parsing.
  const raw = await req.text();

  const check = verifyPostCallSignature(raw, req.headers.get(SIGNATURE_HEADER));
  if (!check.ok) {
    return NextResponse.json(
      { error: "Invalid signature", reason: check.reason },
      { status: 401 },
    );
  }

  let event: { type?: string; data?: PostCallData };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type !== "post_call_transcription" || !event.data) {
    // Acknowledge other event types so ElevenLabs doesn't retry them.
    return NextResponse.json({ ok: true, ignored: event.type ?? "unknown" });
  }

  try {
    const result = await syncPostCall(event.data);
    if (!result.ok) {
      // Bad payload we can't act on — 200 so it isn't retried forever.
      return NextResponse.json({ ok: false, reason: result.reason });
    }
    return NextResponse.json({
      ok: true,
      conversationId: result.conversationId,
      messages: result.messages,
    });
  } catch (err) {
    console.error("[post-call webhook] sync failed", err);
    // 500 → ElevenLabs will retry, which is what we want for a transient error.
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
