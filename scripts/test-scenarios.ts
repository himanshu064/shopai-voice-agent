/**
 * Run the application-level agent scenario suite (spec §26) from the CLI.
 *
 *   npm run test:scenarios
 *
 * Exits non-zero if any app-level scenario fails, so it can gate CI.
 */
import { prisma } from "../src/lib/db";
import { runScenarios } from "../src/lib/testing/scenarios";

async function main() {
  const report = await runScenarios();
  console.log(`\nAgent scenario suite — ${report.passed}/${report.total} passed\n`);
  for (const r of report.results) {
    const mark = r.pass ? "✅" : "❌";
    const tools = r.runs.map((run) => run.tool).join(", ") || "—";
    console.log(`${mark} ${r.name}`);
    console.log(`   expected: ${r.expected}`);
    console.log(`   tools:    ${tools}`);
    console.log(`   notes:    ${r.notes}\n`);
  }

  const appFailures = report.results.filter((r) => r.kind === "app" && !r.pass);
  await prisma.$disconnect();
  if (appFailures.length) {
    console.error(`❌ ${appFailures.length} app-level scenario(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log("✅ All app-level scenarios passed.");
  }
}

main().catch(async (err) => {
  console.error("Scenario run crashed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exitCode = 1;
});
