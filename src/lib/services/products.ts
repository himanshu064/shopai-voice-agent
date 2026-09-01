import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type ProductSort = "featured" | "price_asc" | "price_desc" | "name_asc";

export interface ProductSearchParams {
  query?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: ProductSort;
}

const ORDER_BY: Record<ProductSort, Prisma.ProductOrderByWithRelationInput> = {
  featured: { createdAt: "asc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  name_asc: { name: "asc" },
};

/** Search/filter the catalog. Used by the storefront and the AI searchProducts tool. */
export async function searchProducts(params: ProductSearchParams = {}) {
  const where: Prisma.ProductWhereInput = {};

  if (params.query) {
    where.OR = [
      { name: { contains: params.query, mode: "insensitive" } },
      { description: { contains: params.query, mode: "insensitive" } },
    ];
  }
  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }

  const price: Prisma.DecimalFilter = {};
  if (typeof params.minPrice === "number" && !Number.isNaN(params.minPrice)) {
    price.gte = params.minPrice;
  }
  if (typeof params.maxPrice === "number" && !Number.isNaN(params.maxPrice)) {
    price.lte = params.maxPrice;
  }
  if (price.gte !== undefined || price.lte !== undefined) {
    where.price = price;
  }

  if (params.inStockOnly) {
    where.variants = { some: { inventory: { gt: 0 } } };
  }

  return prisma.product.findMany({
    where,
    include: { category: true, variants: true },
    orderBy: ORDER_BY[params.sort ?? "featured"],
  });
}

/** Min/max product price in the catalog — used to bound the price slider. */
export async function getPriceBounds(): Promise<{ min: number; max: number }> {
  const agg = await prisma.product.aggregate({
    _min: { price: true },
    _max: { price: true },
  });
  return {
    min: Math.floor(Number(agg._min.price ?? 0)),
    max: Math.ceil(Number(agg._max.price ?? 1000)),
  };
}

export async function getProduct(productId: string) {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      variants: true,
      reviews: { orderBy: [{ helpful: "desc" }, { createdAt: "desc" }], take: 6 },
    },
  });
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

/** Products related to the given one — same category first, then top-rated others. */
export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  take = 4,
) {
  const include = { category: true, variants: true };
  const sameCategory = await prisma.product.findMany({
    where: { categoryId, NOT: { id: productId } },
    include,
    orderBy: { avgRating: "desc" },
    take,
  });
  if (sameCategory.length >= take) return sameCategory;

  const fillers = await prisma.product.findMany({
    where: { id: { notIn: [productId, ...sameCategory.map((p) => p.id)] } },
    include,
    orderBy: { avgRating: "desc" },
    take: take - sameCategory.length,
  });
  return [...sameCategory, ...fillers];
}

/** Total inventory across a product's variants. */
export function totalInventory(variants: { inventory: number }[]): number {
  return variants.reduce((n, v) => n + v.inventory, 0);
}
