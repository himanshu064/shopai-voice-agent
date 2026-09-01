"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, SlidersHorizontal, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { useUpdateParams } from "@/hooks/use-update-params";

interface Category {
  id: string;
  name: string;
}

export default function ProductFilters({
  categories,
  priceBounds,
  initial,
}: {
  categories: Category[];
  priceBounds: { min: number; max: number };
  initial: {
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
  };
}) {
  const { update } = useUpdateParams();
  const [q, setQ] = useState(initial.q ?? "");
  const [price, setPrice] = useState<[number, number]>([
    initial.minPrice ? Number(initial.minPrice) : priceBounds.min,
    initial.maxPrice ? Number(initial.maxPrice) : priceBounds.max,
  ]);
  const firstRender = useRef(true);

  // Debounced search.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => update({ q: q.trim() || null }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeCategory = initial.category ?? null;
  const inStock = initial.inStock === "1";
  const hasFilters =
    Boolean(q) ||
    Boolean(activeCategory) ||
    inStock ||
    price[0] !== priceBounds.min ||
    price[1] !== priceBounds.max;

  function clearAll() {
    setQ("");
    setPrice([priceBounds.min, priceBounds.max]);
    update({ q: null, category: null, minPrice: null, maxPrice: null, inStock: null });
  }

  return (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <SlidersHorizontal className="size-4" />
          Filters
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="filter-q">Search</Label>
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="filter-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            className="pl-8"
          />
        </div>
      </div>

      <Separator />

      {/* Category */}
      <div className="space-y-2">
        <Label>Category</Label>
        <div className="flex flex-col gap-0.5">
          <CategoryButton active={!activeCategory} onClick={() => update({ category: null })}>
            All categories
          </CategoryButton>
          {categories.map((c) => (
            <CategoryButton
              key={c.id}
              active={activeCategory === c.id}
              onClick={() =>
                update({ category: activeCategory === c.id ? null : c.id })
              }
            >
              {c.name}
            </CategoryButton>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price range */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Price</Label>
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatCurrency(price[0])} – {formatCurrency(price[1])}
          </span>
        </div>
        <Slider
          min={priceBounds.min}
          max={priceBounds.max}
          step={5}
          value={price}
          onValueChange={(v) => setPrice([v[0], v[1]])}
          onValueCommit={(v) =>
            update({
              minPrice: v[0] <= priceBounds.min ? null : String(v[0]),
              maxPrice: v[1] >= priceBounds.max ? null : String(v[1]),
            })
          }
        />
      </div>

      <Separator />

      {/* In stock */}
      <div className="flex items-center justify-between">
        <Label htmlFor="filter-instock" className="cursor-pointer">
          In stock only
        </Label>
        <Switch
          id="filter-instock"
          checked={inStock}
          onCheckedChange={(c) => update({ inStock: c ? "1" : null })}
        />
      </div>
    </aside>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      {active && <Check className="size-4" />}
    </button>
  );
}
