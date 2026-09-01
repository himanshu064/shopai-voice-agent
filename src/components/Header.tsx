import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Headphones,
  Store,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";
import { getCurrentCustomerId } from "@/lib/auth/session";
import { getCartItemCount } from "@/lib/services/cart";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/products", label: "Products", icon: Store },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/consultations", label: "Consultations", icon: CalendarClock },
  { href: "/support", label: "Support", icon: Headphones },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export default async function Header() {
  let cartCount = 0;
  try {
    cartCount = await getCartItemCount(await getCurrentCustomerId());
  } catch {
    // No customer seeded yet.
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-4" />
          </span>
          <span>
            Shop<span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <Link href={item.href}>
                <item.icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </Button>
          ))}
          <Button asChild size="sm" className="relative ml-1">
            <Link href="/cart">
              <ShoppingCart className="size-4" />
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                  {cartCount}
                </span>
              )}
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
