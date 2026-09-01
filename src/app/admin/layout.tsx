import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = {
  title: "Admin — ShopAI",
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-full bg-muted/30">
      {/* Console top bar */}
      <div className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h1 className="text-sm font-bold leading-tight">Admin Console</h1>
              <p className="text-xs text-muted-foreground">
                Support operations &amp; agent observability
              </p>
            </div>
          </div>
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            Support widget
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[210px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <AdminSidebar />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
