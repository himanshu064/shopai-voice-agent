import Link from "next/link";
import { Star } from "lucide-react";
import type { Category, Product, ProductVariant } from "@prisma/client";
import { formatCurrency } from "@/lib/format";
import { totalInventory } from "@/lib/services/products";
import { Card } from "@/components/ui/card";
import { StockBadge } from "@/components/common/stock-badge";
import ProductImage from "@/components/ProductImage";
import AddToCartButton from "@/components/AddToCartButton";

type ProductWithRelations = Product & {
  category: Category;
  variants: ProductVariant[];
};

export default function ProductCard({ product }: { product: ProductWithRelations }) {
  const inStock = totalInventory(product.variants);
  const firstInStock = product.variants.find((v) => v.inventory > 0);

  return (
    <Card className="h-full gap-0 overflow-hidden p-0 transition-all hover:shadow-md hover:ring-primary/40">
      <Link href={`/products/${product.id}`} className="group block">
        <ProductImage categoryName={product.category.name} className="aspect-square" />
        <div className="px-4 pt-4">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {product.category.name}
          </span>
          <h3 className="mt-1 line-clamp-2 font-medium group-hover:text-primary">
            {product.name}
          </h3>
          {product.reviewCount > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-xs font-medium text-white">
                {product.avgRating.toFixed(1)}
                <Star className="size-2.5 fill-current" />
              </span>
              <span className="text-xs text-muted-foreground">
                ({product.reviewCount.toLocaleString()})
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="mt-auto flex flex-col gap-3 px-4 pt-3 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">
            {formatCurrency(product.price)}
          </span>
          <StockBadge inventory={inStock} />
        </div>
        <AddToCartButton
          productId={product.id}
          defaultVariantId={firstInStock?.id ?? null}
          disabled={!firstInStock}
          maxQuantity={firstInStock?.inventory ?? 1}
        />
      </div>
    </Card>
  );
}
