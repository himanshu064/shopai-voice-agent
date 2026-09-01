import { NextRequest, NextResponse } from "next/server";
import { ToolCallStatus } from "@prisma/client";
import { getTool, type ToolContext } from "@/lib/ai/tools";
import { verifySessionToken } from "@/lib/ai/session-token";
import { verifyWebhookSecret, WEBHOOK_SECRET_HEADER } from "@/lib/ai/webhook-auth";
import { persistToolCall } from "@/lib/ai/persist";
import { resolveCustomerByPhone } from "@/lib/ai/caller-identity";
import { getCurrentCustomerId } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const SESSION_TOKEN_HEADER = "x-shopai-session-token";
const CONVERSATION_ID_HEADER = "x-shopai-conversation-id";
const CHANNEL_HEADER = "x-shopai-channel";
const CALLER_ID_HEADER = "x-shopai-caller-id";

/**
 * ElevenLabs does not always interpolate a dynamic/system variable — when it
 * doesn't, the header arrives as the literal template (e.g. "{{system__caller_id}}").
 * Treat any such un-substituted placeholder (or empty string) as "not provided",
 * so it can't be mistaken for a real caller id / conversation id / channel.
 */
function cleanHeader(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || /^\{\{.*\}\}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Single dispatcher for all ElevenLabs server (webhook) tools (spec §12).
 * Order: verify shared secret → derive identity from session token → validate
 * input → run handler → persist tool_call → return JSON.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tool: string }> },
) {
  const started = Date.now();
  const { tool: toolName } = await params;
  const tool = getTool(toolName);

  if (!tool) {
    return NextResponse.json({ error: `Unknown tool: ${toolName}` }, { status: 404 });
  }

  // 1. Shared-secret gate.
  const secretCheck = verifyWebhookSecret(req.headers.get(WEBHOOK_SECRET_HEADER));
  if (!secretCheck.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: secretCheck.reason },
      { status: 401 },
    );
  }

  // 2. Identity from the session token (never from the model).
  const rawToken = cleanHeader(req.headers.get(SESSION_TOKEN_HEADER));
  const session = rawToken ? verifySessionToken(rawToken) : null;
  const externalConversationId = cleanHeader(req.headers.get(CONVERSATION_ID_HEADER));
  const callerId = cleanHeader(req.headers.get(CALLER_ID_HEADER));
  // A real caller-id present means this is a phone call, whatever the channel var
  // says. (Un-interpolated placeholders are stripped to null by cleanHeader.)
  const channel = callerId ? "phone" : cleanHeader(req.headers.get(CHANNEL_HEADER));

  // Identity, in order of trust:
  //   1. Verified session token (browser flow, or minted by the phone
  //      conversation-init webhook and forwarded here).
  //   2. Caller-ID lookup (phone calls where no token was minted upstream).
  //   3. Demo fallback to the seeded customer so the demo works end-to-end.
  //      Set DEMO_IDENTITY_FALLBACK=false to enforce a strict identity gate.
  let customerId = session?.customerId ?? null;
  if (!customerId && callerId) {
    const caller = await resolveCustomerByPhone(callerId);
    customerId = caller?.id ?? null;
  }
  if (!customerId && process.env.DEMO_IDENTITY_FALLBACK !== "false") {
    try {
      customerId = await getCurrentCustomerId();
    } catch {
      /* no seeded customer */
    }
  }

  const ctx: ToolContext = { customerId, externalConversationId };

  if (tool.requiresAuth && !ctx.customerId) {
    return NextResponse.json(
      { error: "This action requires an authenticated customer session." },
      { status: 401 },
    );
  }

  // 3. Parse + validate input.
  let body: unknown = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = tool.schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid tool input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // 4. Run the handler.
  try {
    const result = await tool.handler(parsed.data, ctx);
    const latencyMs = Date.now() - started;

    await persistToolCall({
      externalConversationId,
      channel,
      customerId: ctx.customerId,
      toolName,
      input: parsed.data,
      output: result,
      status: ToolCallStatus.SUCCESS,
      latencyMs,
    });

    return NextResponse.json({ result });
  } catch (err) {
    const latencyMs = Date.now() - started;
    console.error(`[tool:${toolName}] failed`, err);

    await persistToolCall({
      externalConversationId,
      channel,
      customerId: ctx.customerId,
      toolName,
      input: parsed.data,
      output: { error: String(err) },
      status: ToolCallStatus.ERROR,
      latencyMs,
    });

    return NextResponse.json(
      { error: "Tool execution failed" },
      { status: 500 },
    );
  }
}
