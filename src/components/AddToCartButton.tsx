"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addToCartAction } from "@/lib/actions/cart";

/**
 * Quick add-to-cart used on product cards — adds the given default variant
 * (the first in-stock one) with a chosen quantity, without visiting the detail
 * page.
 */
export default function AddToCartButton({
  productId,
  defaultVariantId,
  disabled,
  maxQuantity = 99,
}: {
  productId: string;
  defaultVariantId: string | null;
  disabled?: boolean;
  maxQuantity?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);

  function add() {
    startTransition(async () => {
      const result = await addToCartAction(productId, defaultVariantId, quantity);
      if (result.ok) {
        toast.success(result.message);
        setQuantity(1);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  if (disabled) {
    return (
      <Button size="sm" variant="outline" className="w-full" disabled>
        <ShoppingCart className="size-4" />
        Sold out
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-7 text-center text-sm tabular-nums">{quantity}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={quantity >= maxQuantity}
          onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
          aria-label="Increase quantity"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="flex-1"
        onClick={add}
        disabled={isPending}
      >
        <ShoppingCart className="size-4" />
        {isPending ? "Adding…" : "Add"}
      </Button>
    </div>
  );
}
