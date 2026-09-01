/**
 * Push the current AGENT_PROMPT (src/lib/ai/agent-prompt.ts) to the database as
 * a new active agent_configs version — WITHOUT reseeding (so orders, carts,
 * conversations, etc. are preserved).
 *
 *   npm run agent:prompt
 *
 * Then run `npm run agent:setup` to rebuild the ElevenLabs agent from it.
 * Versioning: the newest row is marked active and all older rows deactivated,
 * matching how getActivePrompt() picks the active, highest-version config.
 */
import { prisma } from "../src/lib/db";
import { AGENT_PROMPT } from "../src/lib/ai/agent-prompt";

async function main() {
  const latest = await prisma.agentConfig.findFirst({ orderBy: { version: "desc" } });

  if (latest && latest.prompt === AGENT_PROMPT) {
    console.log(`ℹ️  Prompt already matches active config v${latest.version} — nothing to do.`);
    return;
  }

  const nextVersion = (latest?.version ?? 0) + 1;

  await prisma.$transaction([
    prisma.agentConfig.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.agentConfig.create({
      data: { version: nextVersion, isActive: true, voiceId: null, prompt: AGENT_PROMPT },
    }),
  ]);

  console.log(`✅ Wrote agent prompt as active config v${nextVersion}.`);
  console.log("   Next: run `npm run agent:setup` to rebuild the ElevenLabs agent from it.");
}

main()
  .catch((err) => {
    console.error("❌ Prompt update failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
