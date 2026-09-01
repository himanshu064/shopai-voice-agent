import { FlaskConical, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";
import { runScenarios } from "@/lib/testing/scenarios";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SectionCard from "@/components/admin/SectionCard";
import StatCard from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

function Json({ value }: { value: unknown }) {
  if (value == null || (typeof value === "object" && Object.keys(value).length === 0)) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/60 p-2 font-mono text-[11px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default async function AdminTestsPage() {
  const report = await runScenarios();
  const allPass = report.passed === report.total;
  const appTotal = report.results.filter((r) => r.kind === "app").length;
  const appPassed = report.results.filter((r) => r.kind === "app" && r.pass).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={FlaskConical}
        title="Agent tests"
        description="Application-level scenarios that drive the real tools and assert outputs, rules, and authorization."
        actions={
          <Badge
            className={cn(
              allPass
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
            )}
          >
            {report.passed}/{report.total} passing
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Scenarios passing"
          value={`${report.passed}/${report.total}`}
          icon={CheckCircle2}
          accent={allPass ? "emerald" : "rose"}
          progress={report.total ? (report.passed / report.total) * 100 : 0}
        />
        <StatCard
          label="App-level automated"
          value={`${appPassed}/${appTotal}`}
          sub="deterministic, run just now"
          icon={FlaskConical}
          accent="primary"
        />
        <StatCard
          label="Agent-level"
          value="1"
          sub="KB grounding (Phase 6)"
          icon={Sparkles}
          accent="primary"
        />
        <StatCard
          label="Last run"
          value={formatDateTime(report.runAt).split(", ").slice(-1)[0]}
          sub="live on page load"
          icon={Clock}
          accent="primary"
        />
      </div>

      <div className="space-y-4">
        {report.results.map((r) => (
          <SectionCard
            key={r.id}
            title={r.name}
            action={
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    r.kind === "agent" && "border-primary/40 text-primary",
                  )}
                >
                  {r.kind === "agent" ? "agent-level" : "app-level"}
                </Badge>
                <Badge
                  className={cn(
                    "gap-1",
                    r.pass
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
                  )}
                >
                  {r.pass ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
                  {r.pass ? "Pass" : "Fail"}
                </Badge>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="grid gap-1 text-sm sm:grid-cols-[120px_1fr]">
                <span className="text-muted-foreground">Expected</span>
                <span>{r.expected}</span>
                <span className="text-muted-foreground">Notes</span>
                <span className={cn(!r.pass && "text-rose-600")}>{r.notes}</span>
              </div>

              {r.runs.length > 0 && (
                <div className="overflow-hidden rounded-lg border">
                  {r.runs.map((run, i) => (
                    <div
                      key={i}
                      className={cn("p-3", i > 0 && "border-t")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-medium">{run.tool}</span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {run.latencyMs}ms
                          </span>
                          <Badge
                            className={cn(
                              run.status === "SUCCESS"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-400",
                            )}
                          >
                            {run.status.toLowerCase()}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Input</p>
                          <Json value={run.input} />
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">Output</p>
                          <Json value={run.output} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FlaskConical className="size-3.5 text-primary" />
        These scenarios run live against isolated, self-cleaning fixtures. Run{" "}
        <span className="font-mono">npm run test:scenarios</span> to gate CI.
      </p>
    </div>
  );
}
