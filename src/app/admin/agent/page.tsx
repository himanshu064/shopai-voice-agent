import { Bot, Wrench, BookOpen, History, Lock, Globe } from "lucide-react";
import { getAgentConfigs } from "@/lib/services/admin";
import { allToolSpecs } from "@/lib/ai/tools";
import { formatDate } from "@/lib/format";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SectionCard from "@/components/admin/SectionCard";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";

export const dynamic = "force-dynamic";

interface KnowledgeRef {
  name?: string;
}

export default async function AdminAgentPage() {
  const configs = await getAgentConfigs();
  const tools = allToolSpecs();
  const active = configs.find((c) => c.isActive) ?? configs[0];

  if (!active) {
    return (
      <EmptyState
        icon={Bot}
        title="No agent configuration"
        description="Seed the database (npm run db:seed) to create the initial agent config."
      />
    );
  }

  const knowledgeCfg = active.knowledgeConfig as { knowledge_base?: KnowledgeRef[] } | null;
  const attachedDocs = knowledgeCfg?.knowledge_base ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Bot}
        title="Agent configuration"
        description="Sarah's prompt, tools, and knowledge — versioned in agent_configs."
        actions={
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            Active · v{active.version}
          </Badge>
        }
      />

      {/* Prompt */}
      <SectionCard icon={Bot} title="System prompt">
        <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {active.prompt}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Version</dt>
            <dd className="font-medium">v{active.version}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Voice ID</dt>
            <dd className="font-mono text-xs">{active.voiceId ?? "ElevenLabs default"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Created</dt>
            <dd className="font-medium">{formatDate(active.createdAt)}</dd>
          </div>
        </dl>
      </SectionCard>

      {/* Tools */}
      <SectionCard icon={Wrench} title="Tools" count={tools.length}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {tools.map((t) => (
            <li
              key={t.name}
              className="flex items-start justify-between gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              {t.requiresAuth ? (
                <Badge className="shrink-0 bg-primary/10 text-primary">
                  <Lock className="size-3" />
                  auth
                </Badge>
              ) : (
                <Badge className="shrink-0 bg-muted text-muted-foreground">
                  <Globe className="size-3" />
                  public
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      {/* Knowledge */}
      <SectionCard icon={BookOpen} title="Knowledge attached" count={attachedDocs.length}>
        {attachedDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents attached in this config. Run{" "}
            <span className="font-mono">npm run kb:setup</span> to attach the policy
            documents.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {attachedDocs.map((d, i) => (
              <Badge key={i} variant="outline" className="gap-1">
                <BookOpen className="size-3" />
                {d.name ?? "Document"}
              </Badge>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Version history */}
      {configs.length > 1 && (
        <SectionCard icon={History} title="Version history">
          <ul className="divide-y">
            {configs.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <span className="font-medium">v{c.version}</span>
                <span className="text-muted-foreground">{formatDate(c.createdAt)}</span>
                {c.isActive && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    active
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
