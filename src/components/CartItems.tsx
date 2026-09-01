"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { updateCartItemAction, removeCartItemAction } from "@/lib/actions/cart";

export interface CartLine {
  cartItemId: string;
  name: string;
  variantName: string | null;
  categoryEmoji: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  inventory: number;
}

export default function CartItems({
  lines,
  subtotal,
}: {
  lines: CartLine[];
  subtotal: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function mutate(fn: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) toast.error(result.message);
      router.refresh();
    });
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="divide-y p-0">
          {lines.map((line) => (
            <div key={line.cartItemId} className="flex items-center gap-4 p-4">
              <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-muted text-3xl">
                {line.categoryEmoji}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{line.name}</p>
                {line.variantName && (
                  <p className="text-sm text-muted-foreground">{line.variantName}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(line.unitPrice)} each
                </p>
              </div>

              <div className="flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  onClick={() =>
                    mutate(() =>
                      updateCartItemAction(line.cartItemId, line.quantity - 1),
                    )
                  }
                  aria-label="Decrease quantity"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center text-sm tabular-nums">
                  {line.quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending || line.quantity >= line.inventory}
                  onClick={() =>
                    mutate(() =>
                      updateCartItemAction(line.cartItemId, line.quantity + 1),
                    )
                  }
                  aria-label="Increase quantity"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <div className="w-24 text-right font-semibold tabular-nums">
                {formatCurrency(line.lineTotal)}
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => mutate(() => removeCartItemAction(line.cartItemId))}
                aria-label="Remove item"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </Card>
      </div>

      {/* Summary */}
      <Card className="h-fit gap-0 p-6">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">Free</span>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="flex justify-between text-base font-semibold">
          <span>Total</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <Button asChild size="lg" className="mt-6 h-11 w-full">
          <Link href="/checkout">Proceed to checkout</Link>
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Demo checkout — no real payment is taken.
        </p>
      </Card>
    </div>
  );
}
