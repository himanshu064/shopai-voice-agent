/**
 * Upload ShopAI's policy documents to the ElevenLabs knowledge base, record each
 * one in `knowledge_documents`, and attach them to the agent so it can answer
 * policy questions with grounded, retrieval-augmented answers (spec §13).
 *
 *   npx tsx scripts/setup-knowledge-base.ts            # live (needs ELEVENLABS_API_KEY)
 *   npx tsx scripts/setup-knowledge-base.ts --dry-run  # list docs only, no API calls
 *
 * Order of operations:
 *   1. Read each markdown doc under docs/knowledge/.
 *   2. Create it in ElevenLabs via POST /v1/convai/knowledge-base/text → { id }.
 *   3. Upsert a knowledge_documents row (externalDocId, status ACTIVE).
 *   4. PATCH the existing agent's conversation_config so the docs are attached
 *      (usage_mode "auto" → ElevenLabs retrieves the relevant passage / RAG).
 *
 * Importing ../src/lib/db loads .env (Prisma does this to resolve DATABASE_URL),
 * which also populates process.env for the ElevenLabs keys below.
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db";
import { KnowledgeStatus } from "@prisma/client";

const API_BASE = "https://api.elevenlabs.io/v1/convai";
const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID =
  process.env.ELEVENLABS_AGENT_ID ?? process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";
const DRY_RUN = process.argv.includes("--dry-run");

const KNOWLEDGE_DIR = path.join(process.cwd(), "docs", "knowledge");

/** The policy set from spec §13. `file` is relative to docs/knowledge/. */
const DOCUMENTS: { title: string; file: string }[] = [
  { title: "Shipping Policy", file: "shipping-policy.md" },
  { title: "Returns & Refunds Policy", file: "returns-refunds-policy.md" },
  { title: "Warranty Policy", file: "warranty-policy.md" },
  { title: "Product FAQ", file: "product-faq.md" },
  { title: "Customer Support Guidelines", file: "support-guidelines.md" },
  { title: "Privacy & Account Policy", file: "privacy-account-policy.md" },
];

async function api(
  method: string,
  pathname: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      "xi-api-key": API_KEY as string,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathname} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

/**
 * Best-effort delete of a previously-created KB document so re-running doesn't
 * pile up duplicates. Swallows errors (e.g. the doc is gone, or still in use).
 */
async function deleteKbDoc(id: string): Promise<void> {
  try {
    await api("DELETE", `/knowledge-base/${id}`);
  } catch {
    /* already gone or in use — ignore */
  }
}

async function main() {
  // Sanity-check every doc exists and read its text up front.
  const docs = DOCUMENTS.map((d) => {
    const full = path.join(KNOWLEDGE_DIR, d.file);
    if (!fs.existsSync(full)) {
      throw new Error(`Missing knowledge doc: ${full}`);
    }
    return { ...d, text: fs.readFileSync(full, "utf8") };
  });

  console.log(`📚 ${docs.length} policy document(s) found in docs/knowledge/.`);
  for (const d of docs) {
    console.log(`   • ${d.title}  (${d.text.length} chars)`);
  }

  if (DRY_RUN || !API_KEY) {
    console.log(
      !API_KEY
        ? "\nℹ️  ELEVENLABS_API_KEY not set — listed docs only. Add the key and re-run to upload."
        : "\nℹ️  --dry-run — listed docs only, no API calls.",
    );
    await prisma.$disconnect();
    return;
  }

  // 1 + 2 + 3: upload each doc, replacing any prior upload, and record it.
  const attached: { type: "text"; name: string; id: string; usage_mode: "auto" }[] = [];
  for (const d of docs) {
    // If we uploaded this title before, delete the old platform doc first.
    const prior = await prisma.knowledgeDocument.findFirst({
      where: { title: d.title },
    });
    if (prior?.externalDocId) await deleteKbDoc(prior.externalDocId);

    const created = await api("POST", "/knowledge-base/text", {
      name: d.title,
      text: d.text,
    });
    const externalDocId = (created.id ?? created.documentation_id) as string;
    console.log(`  • uploaded ${d.title} → ${externalDocId}`);

    if (prior) {
      await prisma.knowledgeDocument.update({
        where: { id: prior.id },
        data: { source: d.file, externalDocId, status: KnowledgeStatus.ACTIVE },
      });
    } else {
      await prisma.knowledgeDocument.create({
        data: {
          title: d.title,
          source: d.file,
          externalDocId,
          status: KnowledgeStatus.ACTIVE,
        },
      });
    }

    attached.push({ type: "text", name: d.title, id: externalDocId, usage_mode: "auto" });
  }

  // Persist the attachment set on the active agent config for the admin screen.
  const activeConfig = await prisma.agentConfig.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  if (activeConfig) {
    await prisma.agentConfig.update({
      where: { id: activeConfig.id },
      data: { knowledgeConfig: { knowledge_base: attached } },
    });
  }

  // 4: attach to the existing agent. PATCH deep-merges conversation_config, so
  // sending just the knowledge_base leaves prompt/tools intact.
  if (!AGENT_ID) {
    console.warn(
      "\n⚠️  No ELEVENLABS_AGENT_ID in env — docs uploaded but not attached to an agent.\n" +
        "   Set the id (or run agent:setup, which now attaches active KB docs) and re-run.",
    );
    await prisma.$disconnect();
    return;
  }

  // The uploads + DB records above are the real work and have already succeeded.
  // Attaching to the agent is best-effort: if the id is stale/missing (e.g. the
  // agent was just recreated), don't fail the whole run — the docs are recorded
  // in the DB, and `agent:setup` re-attaches active KB docs when it builds the
  // agent. So a 404 here is recoverable, not fatal.
  try {
    await api("PATCH", `/agents/${AGENT_ID}`, {
      conversation_config: {
        agent: { prompt: { knowledge_base: attached } },
      },
    });
    console.log(`\n✅ Uploaded and attached ${attached.length} document(s) to agent ${AGENT_ID}.`);
    console.log("   The agent will now ground policy answers in these documents.");
  } catch (err) {
    console.warn(
      `\n⚠️  Uploaded and recorded ${attached.length} document(s), but could not attach them to ` +
        `agent ${AGENT_ID}:\n   ${err instanceof Error ? err.message : err}`,
    );
    console.warn(
      "   This usually means the agent id in .env is stale (the agent was recreated).\n" +
        "   Fix: run `npm run agent:setup` — it will create the agent WITH these docs attached\n" +
        "   (they're already saved in the database) and update the id in .env for you.",
    );
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("\n❌ Knowledge-base setup failed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  // Set exit code rather than hard-exiting — avoids the libuv teardown assertion
  // on Windows while the fetch keep-alive socket is still closing.
  process.exitCode = 1;
});
