import { BookOpen, Sparkles } from "lucide-react";
import { listKnowledgeDocuments } from "@/lib/services/admin";
import { formatDate } from "@/lib/format";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SectionCard from "@/components/admin/SectionCard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  DRAFT: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export default async function AdminKnowledgePage() {
  const docs = await listKnowledgeDocuments();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={BookOpen}
        title="Knowledge base"
        description="Policy documents uploaded to ElevenLabs and attached to the agent for retrieval-augmented answers."
      />

      {docs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No knowledge documents"
          description="Run `npm run kb:setup` to upload the policy documents in docs/knowledge/ and attach them to the agent."
        />
      ) : (
        <>
          <SectionCard title="Documents" count={docs.length} flush>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Document</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ElevenLabs doc ID</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="pl-5 font-medium">{d.title}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {d.source ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("capitalize", STATUS_CLS[d.status])}>
                        {d.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {d.externalDocId ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(d.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Documents use <span className="font-medium">usage_mode: auto</span> —
            ElevenLabs retrieves the relevant passage at conversation time.
          </p>
        </>
      )}
    </div>
  );
}
