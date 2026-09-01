"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { addToCartAction } from "@/lib/actions/cart";

export interface VariantOption {
  id: string;
  name: string;
  inventory: number;
  priceDelta: number;
}

export default function AddToCartForm({
  productId,
  basePrice,
  variants,
}: {
  productId: string;
  basePrice: number;
  variants: VariantOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string>(
    variants.find((v) => v.inventory > 0)?.id ?? variants[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);

  const selected = variants.find((v) => v.id === selectedId);
  const price = basePrice + (selected?.priceDelta ?? 0);
  const outOfStock = !selected || selected.inventory < 1;

  function handleAdd() {
    startTransition(async () => {
      const result = await addToCartAction(productId, selectedId, quantity);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-3xl font-bold">{formatCurrency(price)}</div>

      {variants.length > 1 && (
        <div className="space-y-2">
          <Label>Variant</Label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <Button
                key={v.id}
                type="button"
                size="sm"
                variant={v.id === selectedId ? "default" : "outline"}
                disabled={v.inventory < 1}
                onClick={() => setSelectedId(v.id)}
                className={v.inventory < 1 ? "line-through" : ""}
              >
                {v.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Label className="text-sm">Qty</Label>
        <div className="flex items-center rounded-lg border">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-10 text-center text-sm tabular-nums">{quantity}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!!selected && quantity >= selected.inventory}
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Increase quantity"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        {selected && (
          <span className="text-sm text-muted-foreground">
            {selected.inventory} in stock
          </span>
        )}
      </div>

      <Button
        size="lg"
        className="h-11 w-full sm:w-auto"
        onClick={handleAdd}
        disabled={isPending || outOfStock}
      >
        <ShoppingCart className="size-4" />
        {outOfStock ? "Out of stock" : isPending ? "Adding…" : "Add to cart"}
      </Button>
    </div>
  );
}
