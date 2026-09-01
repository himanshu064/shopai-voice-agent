import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getProduct, getRelatedProducts } from "@/lib/services/products";
import { PageContainer } from "@/components/common/page";
import ProductCard from "@/components/ProductCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductImage from "@/components/ProductImage";
import AddToCartForm, { type VariantOption } from "@/components/AddToCartForm";
import { RatingStars } from "@/components/product/RatingStars";
import { ProductHighlights } from "@/components/product/ProductHighlights";
import { ProductSpecs, type SpecGroup } from "@/components/product/ProductSpecs";
import { ProductReviews } from "@/components/product/ProductReviews";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categoryId);

  const variants: VariantOption[] = product.variants.map((v) => ({
    id: v.id,
    name: v.name,
    inventory: v.inventory,
    priceDelta: Number(v.priceDelta),
  }));
  const specs = (product.specs as unknown as SpecGroup[]) ?? [];
  const ratingCount =
    product.reviewCount >= 1000
      ? `${(product.reviewCount / 1000).toFixed(1)}K`
      : String(product.reviewCount);

  return (
    <PageContainer className="max-w-5xl">
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <Card className="overflow-hidden p-0">
          <ProductImage
            categoryName={product.category.name}
            size="text-[8rem]"
            className="aspect-square"
          />
        </Card>

        <div>
          <Badge variant="secondary">{product.category.name}</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{product.name}</h1>

          <div className="mt-3 flex items-center gap-2">
            <RatingStars rating={product.avgRating} />
            <span className="text-sm font-medium">
              {product.avgRating.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">
              ({ratingCount} ratings)
            </span>
          </div>

          <p className="mt-4 text-muted-foreground">{product.description}</p>

          <div className="mt-8">
            <AddToCartForm
              productId={product.id}
              basePrice={Number(product.price)}
              variants={variants}
            />
          </div>
        </div>
      </div>

      {/* Details: highlights + specifications */}
      <Separator className="my-12" />
      <Tabs defaultValue="highlights">
        <TabsList>
          <TabsTrigger value="highlights">Highlights</TabsTrigger>
          <TabsTrigger value="specs">Specifications</TabsTrigger>
        </TabsList>
        <TabsContent value="highlights" className="mt-6">
          <ProductHighlights highlights={product.highlights} />
        </TabsContent>
        <TabsContent value="specs" className="mt-6">
          <ProductSpecs specs={specs} />
        </TabsContent>
      </Tabs>

      {/* Ratings & reviews */}
      <Separator className="my-12" />
      <ProductReviews
        avgRating={product.avgRating}
        reviewCount={product.reviewCount}
        reviews={product.reviews}
      />

      {/* Related products */}
      {related.length > 0 && (
        <>
          <Separator className="my-12" />
          <section>
            <h2 className="text-2xl font-semibold">Related products</h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        </>
      )}
    </PageContainer>
  );
}
