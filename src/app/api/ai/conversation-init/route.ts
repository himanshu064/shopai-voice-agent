import { NextRequest, NextResponse } from "next/server";
import { verifyElevenLabsSignature } from "@/lib/ai/webhook-auth";
import { resolveCustomerByPhone } from "@/lib/ai/caller-identity";
import { signSessionToken } from "@/lib/ai/session-token";

export const dynamic = "force-dynamic";

const SIGNATURE_HEADER = "elevenlabs-signature";

/**
 * ElevenLabs conversation-initiation webhook (spec §21, phone channel).
 *
 * When a phone call comes in, ElevenLabs calls this endpoint with the caller's
 * number. We resolve the customer by caller-ID, mint a session token for them,
 * and return it as a dynamic variable so every subsequent tool call derives the
 * same verified identity — exactly like the browser session-token flow.
 *
 * Request:  { caller_id, agent_id, called_number, call_sid, conversation_id }
 * Response: { type: "conversation_initiation_client_data", dynamic_variables, … }
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();

  const check = verifyElevenLabsSignature(raw, req.headers.get(SIGNATURE_HEADER));
  if (!check.ok) {
    return NextResponse.json(
      { error: "Invalid signature", reason: check.reason },
      { status: 401 },
    );
  }

  let body: { caller_id?: string; called_number?: string; conversation_id?: string };
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const customer = await resolveCustomerByPhone(body.caller_id);

  // Base dynamic variables handed to the agent for this call.
  const dynamic_variables: Record<string, string> = {
    conversation_channel: "phone",
    session_token: customer
      ? signSessionToken({ customerId: customer.id, verified: true })
      : "",
    customer_name: customer?.name ?? "there",
    // Anchor this call's tool calls to the real conversation id (the tool header
    // uses {{app_conversation_id}}).
    app_conversation_id: body.conversation_id ?? "",
  };

  // Greet a known caller by name; keep it generic otherwise.
  const first_message = customer
    ? `Hi ${customer.name.split(" ")[0]}, thanks for calling ShopAI — this is Sarah. How can I help?`
    : "Thanks for calling ShopAI — this is Sarah. How can I help you today?";

  return NextResponse.json({
    type: "conversation_initiation_client_data",
    dynamic_variables,
    conversation_config_override: {
      agent: { first_message },
    },
  });
}
