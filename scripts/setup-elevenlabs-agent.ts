/**
 * Create/update the ShopAI ElevenLabs agent and its server (webhook) tools.
 *
 *   npx tsx scripts/setup-elevenlabs-agent.ts          # live (needs ELEVENLABS_API_KEY)
 *   npx tsx scripts/setup-elevenlabs-agent.ts --dry-run # just write the config JSON
 *
 * The generated config is always written to docs/elevenlabs-agent.config.json so
 * it can be imported via the ElevenLabs dashboard/CLI if you prefer that over the
 * API calls here. Endpoint details follow the public REST API (v1/convai).
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db";
import { allToolSpecs } from "../src/lib/ai/tools";

const API_BASE = "https://api.elevenlabs.io/v1/convai";
// Strip any trailing slash so tool URLs don't end up with `//api/...` (which
// Next.js answers with a 308 redirect that webhook clients won't follow).
const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const API_KEY = process.env.ELEVENLABS_API_KEY;
const WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET ?? "";
const DRY_RUN = process.argv.includes("--dry-run");
const AGENT_NAME = "ShopAI — Sarah";
// "Sarah" — mature, reassuring, confident female voice from the ElevenLabs
// default library. Matches the agent persona; overridable via .env.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2";
// Seconds of caller silence before Sarah gently checks in / re-prompts. Lower =
// more attentive but can interrupt a thinking pause; higher = more patient.
// 7s is a natural phone-agent default; tune with ELEVENLABS_TURN_TIMEOUT.
const TURN_TIMEOUT = Number(process.env.ELEVENLABS_TURN_TIMEOUT ?? "7");
// Seconds of continued silence before the call ends on its own (-1 = never).
const SILENCE_END_CALL_TIMEOUT = Number(
  process.env.ELEVENLABS_SILENCE_END_CALL_TIMEOUT ?? "30",
);
// Voice settings. Higher stability keeps Sarah's tone consistent across an
// utterance (low stability makes the model swing pitch — e.g. a chirpy tail on
// "just let me know!"). similarity_boost keeps her close to the base voice.
const VOICE_STABILITY = Number(process.env.ELEVENLABS_VOICE_STABILITY ?? "0.6");
const VOICE_SIMILARITY = Number(process.env.ELEVENLABS_VOICE_SIMILARITY ?? "0.85");
const VOICE_SPEED = Number(process.env.ELEVENLABS_VOICE_SPEED ?? "1.0");

async function getActivePrompt(): Promise<string> {
  const cfg = await prisma.agentConfig.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  return cfg?.prompt ?? "You are Sarah, the AI support agent for ShopAI.";
}

/** One entry per active knowledge-base document (spec §13). */
type KnowledgeRef = { type: "text"; name: string; id: string; usage_mode: "auto" };

/**
 * Active KB documents already uploaded to ElevenLabs (by kb:setup). Attaching
 * them here lets a freshly-created agent ground policy answers immediately.
 */
async function getKnowledgeBase(): Promise<KnowledgeRef[]> {
  const docs = await prisma.knowledgeDocument.findMany({
    where: { status: "ACTIVE", externalDocId: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  return docs.map((d) => ({
    type: "text",
    name: d.title,
    id: d.externalDocId as string,
    usage_mode: "auto",
  }));
}

// ElevenLabs' tool schema validator only accepts a small subset of JSON Schema
// keywords and rejects extras (e.g. `$schema`, `additionalProperties`). Strip
// everything except the keys it understands. Constraints we drop are still
// enforced server-side by Zod when the tool actually runs.
const ALLOWED_SCHEMA_KEYS = new Set([
  "type",
  "description",
  "properties",
  "required",
  "items",
  "enum",
]);

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function sanitizeSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitizeSchema);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (!ALLOWED_SCHEMA_KEYS.has(key)) continue;
      if (key === "properties" && value && typeof value === "object") {
        const props: Record<string, unknown> = {};
        for (const [pk, pv] of Object.entries(value)) {
          const sanitized = sanitizeSchema(pv);
          // ElevenLabs requires every property to carry a description.
          if (
            sanitized &&
            typeof sanitized === "object" &&
            !("description" in (sanitized as Record<string, unknown>))
          ) {
            (sanitized as Record<string, unknown>).description = humanize(pk);
          }
          props[pk] = sanitized;
        }
        out[key] = props;
      } else if (key === "items") {
        out[key] = sanitizeSchema(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  }
  return node;
}

/** Build the api_schema for one webhook tool. */
function buildToolConfig(spec: ReturnType<typeof allToolSpecs>[number]) {
  return {
    type: "webhook" as const,
    name: spec.name,
    description: spec.description,
    response_timeout_secs: 20,
    api_schema: {
      url: `${APP_URL}/api/ai/tools/${spec.name}`,
      method: "POST",
      request_body_schema: sanitizeSchema(spec.parameters),
      request_headers: {
        "Content-Type": "application/json",
        // Literal shared secret (config stored server-side in ElevenLabs).
        "x-shopai-webhook-secret": WEBHOOK_SECRET,
        // Dynamic variables — session_token/conversation_channel supplied at
        // startSession (browser) or by the conversation-init webhook (phone);
        // system__conversation_id and system__caller_id are provided by
        // ElevenLabs (caller_id is populated for phone calls).
        "x-shopai-session-token": "{{session_token}}",
        // Prefer the client-generated id (reliably interpolated, like the other
        // custom dynamic variables); ElevenLabs does not consistently substitute
        // {{system__conversation_id}} here. For phone, the conversation-init
        // webhook sets app_conversation_id to the real conversation id.
        "x-shopai-conversation-id": "{{app_conversation_id}}",
        "x-shopai-channel": "{{conversation_channel}}",
        "x-shopai-caller-id": "{{system__caller_id}}",
      },
    },
  };
}

function buildAgentConfig(prompt: string, toolIds: string[], knowledgeBase: KnowledgeRef[]) {
  return {
    name: AGENT_NAME,
    conversation_config: {
      // Sarah's spoken voice (female). Without this the agent falls back to the
      // ElevenLabs default voice, which is not Sarah.
      tts: {
        voice_id: VOICE_ID,
        model_id: TTS_MODEL,
        stability: VOICE_STABILITY,
        similarity_boost: VOICE_SIMILARITY,
        speed: VOICE_SPEED,
      },
      // Natural turn-taking so voice feels like a real phone call: wait out a
      // short silence, gently re-prompt, and don't hang up too eagerly.
      turn: {
        turn_timeout: TURN_TIMEOUT,
        silence_end_call_timeout: SILENCE_END_CALL_TIMEOUT,
        mode: "turn",
      },
      agent: {
        prompt: {
          prompt,
          llm: "gpt-4o-mini",
          temperature: 0,
          tool_ids: toolIds,
          knowledge_base: knowledgeBase,
        },
        first_message: "Hi! I'm Sarah from ShopAI support. How can I help you today?",
        language: "en",
        dynamic_variables: {
          session_token: "",
          conversation_channel: "text",
          // Anchors tool calls to a conversation; supplied by the browser client
          // at startSession, or by the phone conversation-init webhook.
          app_conversation_id: "",
        },
      },
    },
  };
}

async function api(pathname: string, body: unknown) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": API_KEY as string,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${pathname} → ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function apiRaw(method: string, pathname: string) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { "xi-api-key": API_KEY as string },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathname} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

/**
 * Best-effort removal of previously-created ShopAI agent(s) + tools so
 * re-running doesn't pile up duplicates. Wrapped so any API-shape mismatch
 * skips cleanup rather than blocking a fresh create.
 */
async function cleanupExisting() {
  try {
    const ourToolNames = new Set(allToolSpecs().map((t) => t.name));

    // Delete matching agents first (they reference tools). Per-item try/catch
    // so one failure doesn't abort the rest.
    const agentsRes = await apiRaw("GET", "/agents?page_size=100");
    const agents = agentsRes.agents ?? [];
    let deletedAgents = 0;
    for (const a of agents) {
      const id = a?.agent_id ?? a?.id;
      if (id && a?.name === AGENT_NAME) {
        try {
          await apiRaw("DELETE", `/agents/${id}`);
          deletedAgents++;
        } catch {
          /* skip */
        }
      }
    }

    // Then delete tools whose name matches one of ours. Tools still referenced
    // by an agent we don't own return 409 — skip those.
    const toolsRes = await apiRaw("GET", "/tools");
    const tools = toolsRes.tools ?? [];
    let deletedTools = 0;
    let skippedInUse = 0;
    for (const t of tools) {
      const id = t?.id ?? t?.tool_id;
      const name = t?.tool_config?.name ?? t?.name;
      if (id && name && ourToolNames.has(name)) {
        try {
          await apiRaw("DELETE", `/tools/${id}`);
          deletedTools++;
        } catch {
          skippedInUse++;
        }
      }
    }
    if (skippedInUse) {
      console.log(`   (skipped ${skippedInUse} tool(s) still in use by another agent)`);
    }

    if (deletedAgents || deletedTools) {
      console.log(`🧹 Cleaned up ${deletedAgents} old agent(s) and ${deletedTools} old tool(s).`);
    }
  } catch (err) {
    console.warn(
      `⚠️  Cleanup skipped (${err instanceof Error ? err.message : err}). Continuing — you may accumulate duplicates.`,
    );
  }
}

/**
 * Write (or replace) the given keys in .env in place, preserving all other
 * lines and comments. Appends a key if it isn't present. This removes the
 * error-prone manual step of copying the new agent id after every run — a stale
 * id is what breaks kb:setup (it PATCHes a non-existent agent → 404).
 */
function updateEnvFile(updates: Record<string, string>) {
  const envPath = path.join(process.cwd(), ".env");
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(content)) {
      content = content.replace(re, line);
    } else {
      content += (content.endsWith("\n") || content === "" ? "" : "\n") + line + "\n";
    }
  }
  fs.writeFileSync(envPath, content);
}

async function main() {
  const prompt = await getActivePrompt();
  const knowledgeBase = await getKnowledgeBase();
  const specs = allToolSpecs();
  const toolConfigs = specs.map(buildToolConfig);

  // Always write the importable config bundle.
  const outPath = path.join(process.cwd(), "docs", "elevenlabs-agent.config.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        note: "Generated by scripts/setup-elevenlabs-agent.ts",
        app_url: APP_URL,
        prompt,
        knowledge_base: knowledgeBase,
        tools: toolConfigs,
      },
      null,
      2,
    ),
  );
  console.log(
    `📝 Wrote agent + ${toolConfigs.length} tool configs + ${knowledgeBase.length} knowledge doc(s) → ${outPath}`,
  );
  if (knowledgeBase.length === 0) {
    console.log("   ℹ️  No active knowledge docs found — run `npm run kb:setup` first to attach policies.");
  }

  if (DRY_RUN || !API_KEY) {
    console.log(
      !API_KEY
        ? "\nℹ️  ELEVENLABS_API_KEY not set — wrote config only. Add the key and re-run to create the agent."
        : "\nℹ️  --dry-run — wrote config only.",
    );
    await prisma.$disconnect();
    return;
  }

  if (!WEBHOOK_SECRET) {
    console.warn(
      "⚠️  ELEVENLABS_WEBHOOK_SECRET is empty — tool calls will be unauthenticated. Set it before a public demo.",
    );
  }

  // 0. Remove any previous ShopAI agent/tools so we don't pile up duplicates.
  await cleanupExisting();

  // 1. Create tools → collect ids.
  const toolIds: string[] = [];
  for (const cfg of toolConfigs) {
    const created = await api("/tools", { tool_config: cfg });
    const id = created.id ?? created.tool_id;
    toolIds.push(id);
    console.log(`  • tool ${cfg.name} → ${id}`);
  }

  // 2. Create the agent referencing those tools + knowledge docs.
  const agent = await api("/agents/create", buildAgentConfig(prompt, toolIds, knowledgeBase));
  const agentId = agent.agent_id ?? agent.agentId ?? agent.id;

  // Persist the new id to .env for BOTH the client (NEXT_PUBLIC_…) and the
  // server/kb:setup (ELEVENLABS_AGENT_ID) so nothing points at a stale/deleted
  // agent after a recreate.
  updateEnvFile({
    NEXT_PUBLIC_ELEVENLABS_AGENT_ID: agentId,
    ELEVENLABS_AGENT_ID: agentId,
  });

  console.log("\n✅ Agent created and .env updated.");
  console.log(`   NEXT_PUBLIC_ELEVENLABS_AGENT_ID=${agentId}`);
  console.log(`   ELEVENLABS_AGENT_ID=${agentId}`);
  console.log(
    knowledgeBase.length > 0
      ? `   Attached ${knowledgeBase.length} knowledge doc(s). Restart the dev server to pick up the new id.`
      : "   No KB docs were attached — run `npm run kb:setup` next, then restart the dev server.",
  );

  await prisma.$disconnect();
}

main()
  .catch(async (err) => {
    console.error("\n❌ Setup failed:", err instanceof Error ? err.message : err);
    console.error(
      "The config JSON was still written — you can import it from the ElevenLabs dashboard. See docs/ELEVENLABS_SETUP.md.",
    );
    await prisma.$disconnect();
    // Set the exit code rather than calling process.exit() — a hard exit while
    // the fetch keep-alive socket is still closing triggers a libuv assertion
    // on Windows. Letting Node drain handles avoids that noise.
    process.exitCode = 1;
  });
