import { Sparkles, Clock, ShieldCheck, MessageSquareText } from "lucide-react";
import { PageContainer } from "@/components/common/page";
import SupportChat from "@/components/support/SupportChat";

export const metadata = {
  title: "Support — ShopAI",
};

const TRUST = [
  { icon: Clock, label: "Available 24/7" },
  { icon: MessageSquareText, label: "Instant answers" },
  { icon: ShieldCheck, label: "Grounded in real policies" },
];

export default function SupportPage() {
  return (
    <PageContainer className="max-w-4xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" />
          Powered by ElevenLabs AI
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          How can we help?
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Chat with Sarah, our AI support agent — ask about products, track
          orders, handle returns, or get help with policies.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {TRUST.map((t) => (
            <span key={t.label} className="flex items-center gap-1.5">
              <t.icon className="size-4 text-primary" />
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <SupportChat />
    </PageContainer>
  );
}
