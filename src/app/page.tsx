import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Headphones,
  MessageSquare,
  Mic,
  Phone,
  Search,
  PackageSearch,
  RotateCcw,
  BookOpen,
  CalendarClock,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const CAPABILITIES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Search, title: "Finds products", body: "Searches the live catalog by need, category, and budget." },
  { icon: PackageSearch, title: "Tracks orders", body: "Reads your orders and shipping status — identity verified server-side." },
  { icon: RotateCcw, title: "Handles returns", body: "Checks eligibility and files returns, cancellations, and refunds." },
  { icon: BookOpen, title: "Knows the policies", body: "Answers shipping, returns, and warranty questions from company knowledge." },
  { icon: CalendarClock, title: "Books consultations", body: "Finds open times and books an expert session — then confirms it." },
  { icon: LifeBuoy, title: "Escalates to a human", body: "Opens a support ticket with full context when it's needed." },
];

const CHANNELS: { icon: LucideIcon; label: string; note: string }[] = [
  { icon: MessageSquare, label: "Text chat", note: "Streaming replies in the support widget" },
  { icon: Mic, label: "Browser voice", note: "Real-time spoken conversation" },
  { icon: Phone, label: "Phone", note: "Same agent over a Twilio number" },
];

export default async function HomePage() {
  // One product from each of the first few categories so the row shows variety
  // rather than four items from the same category.
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      products: {
        include: { category: true, variants: true },
        orderBy: { price: "desc" },
        take: 1,
      },
    },
  });
  const products = categories
    .map((c) => c.products[0])
    .filter((p): p is (typeof categories)[number]["products"][number] => Boolean(p))
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero */}
      <section className="py-16 sm:py-24">
        <Badge variant="secondary" className="mb-4 gap-1">
          <Sparkles className="size-3" />
          AI-powered support over text, voice &amp; phone
        </Badge>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Shop smarter with an AI agent that actually gets things done.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Browse products, track orders, and get help from Sarah — our AI
          support agent who can search the catalog, check your orders, and
          handle returns.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-11">
            <Link href="/products">
              Browse products
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11">
            <Link href="/support">
              <Headphones className="size-4" />
              Talk to Sarah
            </Link>
          </Button>
        </div>

        {/* Channels */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {CHANNELS.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-3 rounded-xl border bg-card/60 p-4"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <c.icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-t py-14">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            One agent. Real actions.
          </h2>
          <p className="mt-2 text-muted-foreground">
            Sarah doesn&apos;t just chat — she calls backend tools to get things done,
            with business rules and identity enforced on the server.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <cap.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{cap.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{cap.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="border-t py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Featured products</h2>
          <Button asChild variant="link" className="text-primary">
            <Link href="/products">
              View all
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
