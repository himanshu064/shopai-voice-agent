import { Headphones } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function AgentNotConfigured() {
  return (
    <Card className="mx-auto max-w-2xl items-center p-8 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
        <Headphones className="size-7" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">Agent not configured yet</h2>
      <p className="mt-2 text-muted-foreground">
        Sarah is ready to go once the ElevenLabs agent is connected. The tools,
        session-token identity, and chat UI are all built — they just need an
        agent id and API key.
      </p>
      <div className="mx-auto mt-6 max-w-md rounded-xl border bg-muted/40 p-5 text-left text-sm">
        <p className="font-medium">To enable the agent:</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-muted-foreground">
          <li>
            Add <code className="text-foreground">ELEVENLABS_API_KEY</code> to{" "}
            <code className="text-foreground">.env</code>
          </li>
          <li>
            Run <code className="text-foreground">npm run agent:setup</code> to
            create the agent + register tools
          </li>
          <li>
            Add the printed{" "}
            <code className="text-foreground">NEXT_PUBLIC_ELEVENLABS_AGENT_ID</code>{" "}
            to <code className="text-foreground">.env</code> and restart
          </li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          See <code className="text-foreground">docs/ELEVENLABS_SETUP.md</code>.
        </p>
      </div>
    </Card>
  );
}
