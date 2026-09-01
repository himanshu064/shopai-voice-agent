/**
 * Patch ONLY the TTS voice on the existing ShopAI agent — no recreation, so the
 * agent id (and all its tools) stay exactly as they are.
 *
 *   npm run agent:voice                 # sets the default "Sarah" voice
 *   ELEVENLABS_VOICE_ID=xxx npm run agent:voice   # any voice id you prefer
 *
 * Use this to fix a wrong/default voice without re-running the full agent:setup
 * (which recreates the agent and changes its id). Independent of APP_URL/tunnel.
 */
import fs from "node:fs";
import path from "node:path";

// This script talks only to the ElevenLabs API (no Prisma import), so nothing
// loads .env for us the way the other scripts get it for free. Load it here:
// parse KEY=VALUE lines and fill process.env for anything not already set.
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes and any trailing CR.
    value = value.replace(/\r$/, "").replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const API_BASE = "https://api.elevenlabs.io/v1/convai";
const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID ?? process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
// "Sarah" — mature, reassuring, confident female voice (ElevenLabs default lib).
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "EXAVITQu4vr4xnSDxMaL";
const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL ?? "eleven_flash_v2";
// Higher stability keeps her tone consistent (avoids pitch swings on the tail
// of an utterance). See setup-elevenlabs-agent.ts for the same defaults.
const VOICE_STABILITY = Number(process.env.ELEVENLABS_VOICE_STABILITY ?? "0.6");
const VOICE_SIMILARITY = Number(process.env.ELEVENLABS_VOICE_SIMILARITY ?? "0.85");
const VOICE_SPEED = Number(process.env.ELEVENLABS_VOICE_SPEED ?? "1.0");

async function main() {
  if (!API_KEY) throw new Error("ELEVENLABS_API_KEY is not set in .env");
  if (!AGENT_ID) throw new Error("ELEVENLABS_AGENT_ID / NEXT_PUBLIC_ELEVENLABS_AGENT_ID is not set in .env");

  // Read the current name just so the log is human-friendly.
  const getRes = await fetch(`${API_BASE}/agents/${AGENT_ID}`, {
    headers: { "xi-api-key": API_KEY },
  });
  if (!getRes.ok) {
    throw new Error(`GET agent ${AGENT_ID} → ${getRes.status}: ${await getRes.text()}`);
  }
  const agent = await getRes.json();
  const before = agent?.conversation_config?.tts?.voice_id ?? "(none)";

  // PATCH merges — sending only tts.voice_id/model_id leaves everything else
  // (prompt, tools, knowledge base) untouched.
  const patchRes = await fetch(`${API_BASE}/agents/${AGENT_ID}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": API_KEY,
    },
    body: JSON.stringify({
      conversation_config: {
        tts: {
          voice_id: VOICE_ID,
          model_id: TTS_MODEL,
          stability: VOICE_STABILITY,
          similarity_boost: VOICE_SIMILARITY,
          speed: VOICE_SPEED,
        },
      },
    }),
  });
  if (!patchRes.ok) {
    throw new Error(`PATCH agent ${AGENT_ID} → ${patchRes.status}: ${await patchRes.text()}`);
  }

  console.log(`✅ Updated "${agent?.name ?? AGENT_ID}" voice.`);
  console.log(`   voice_id: ${before}  →  ${VOICE_ID}`);
  console.log(`   tts model: ${TTS_MODEL}`);
  console.log(`   stability: ${VOICE_STABILITY}, similarity: ${VOICE_SIMILARITY}, speed: ${VOICE_SPEED}`);
  console.log("   Reconnect the chat (or restart the dev server) to hear it.");
}

main().catch((err) => {
  console.error("\n❌ Voice update failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
