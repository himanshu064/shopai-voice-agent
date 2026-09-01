import Link from "next/link";
import { Headphones, Mic, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Prominent AI-support banner — the ElevenLabs showcase. Fills the width of the
 * order's main column so it's the most eye-catching action.
 */
export default function AiSupportCard() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/40 p-6 ring-1 ring-primary/20 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Headphones className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-lg font-semibold">
              Need help with this order?
              <Sparkles className="size-4 shrink-0 text-primary" />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your package, start a return, cancel, or ask anything — chat
              or talk to Sarah, our AI agent, 24/7.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="size-3.5" />
                Text chat
              </span>
              <span className="flex items-center gap-1.5">
                <Mic className="size-3.5" />
                Voice
              </span>
            </div>
          </div>
        </div>

        <Button asChild size="lg" className="h-12 w-full shrink-0 px-8 sm:w-auto">
          <Link href="/support">
            <Headphones className="size-4" />
            Ask Sarah
          </Link>
        </Button>
      </div>
    </div>
  );
}
