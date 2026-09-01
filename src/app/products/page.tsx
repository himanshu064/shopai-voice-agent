import { Suspense } from "react";
import { PackageSearch } from "lucide-react";
import {
  searchProducts,
  listCategories,
  getPriceBounds,
  type ProductSort as SortKey,
} from "@/lib/services/products";
import { PageContainer, PageHeader } from "@/components/common/page";
import { EmptyState } from "@/components/common/empty-state";
import ProductCard from "@/components/ProductCard";
import ProductFilters from "@/components/ProductFilters";
import ProductSortControl from "@/components/ProductSort";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  sort?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [categories, priceBounds] = await Promise.all([
    listCategories(),
    getPriceBounds(),
  ]);

  const products = await searchProducts({
    query: params.q,
    categoryId: params.category,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    inStockOnly: params.inStock === "1",
    sort: (params.sort as SortKey) ?? "featured",
  });

  return (
    <PageContainer>
      <PageHeader title="Products" description="Browse the ShopAI catalog." />

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar filters */}
        <div className="lg:w-60 lg:shrink-0">
          <Suspense>
            <ProductFilters
              categories={categories}
              priceBounds={priceBounds}
              initial={params}
            />
          </Suspense>
        </div>

        {/* Results */}
        <div className="flex-1">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {products.length} product{products.length === 1 ? "" : "s"}
            </p>
            <Suspense>
              <ProductSortControl value={params.sort ?? "featured"} />
            </Suspense>
          </div>

          {products.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No products match your filters"
              description="Try widening your search, price range, or clearing the filters."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
