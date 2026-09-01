"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessagesSquare,
  Ticket,
  Users,
  BookOpen,
  Bot,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/admin/agent", label: "Agent", icon: Bot },
  { href: "/admin/tests", label: "Tests", icon: FlaskConical },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="rounded-xl border bg-card p-2 shadow-sm">
      <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Menu
      </p>
      <div className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5">
        {LINKS.map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute top-1/2 left-0 hidden h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary lg:block" />
              )}
              <link.icon className="size-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
