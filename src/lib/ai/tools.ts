import { z } from "zod";
import { ReturnType as ReturnTypeEnum, TicketPriority } from "@prisma/client";
import {
  searchProducts as svcSearchProducts,
  getProduct as svcGetProduct,
  listCategories as svcListCategories,
  totalInventory,
} from "@/lib/services/products";
import {
  listOrders,
  getOrder as svcGetOrder,
  cancelOrder as svcCancelOrder,
} from "@/lib/services/orders";
import {
  getCartSummary,
  addToCart as svcAddToCart,
  removeCartItem as svcRemoveCartItem,
} from "@/lib/services/cart";
import {
  checkReturnEligibility as svcCheckReturnEligibility,
  requestReturnOrRefund as svcRequestReturnOrRefund,
} from "@/lib/services/returns";
import {
  createSupportTicket as svcCreateSupportTicket,
  transferToHuman as svcTransferToHuman,
} from "@/lib/services/tickets";
import {
  checkAvailability as svcCheckAvailability,
  bookConsultation as svcBookConsultation,
  sendConfirmation as svcSendConfirmation,
} from "@/lib/services/appointments";

/**
 * AI tool registry.
 *
 * Each tool is the contract between the ElevenLabs agent and our controlled
 * application services (spec §12). Handlers NEVER trust a customer id from the
 * model — when `requiresAuth` is true the id is injected server-side from the
 * verified session token (spec §21). Read tools only in this phase; cart/return
 * actions are added in the tool-calling phase.
 */

export interface ToolContext {
  /** Derived from the verified session token; null for unauthenticated calls. */
  customerId: string | null;
  /** ElevenLabs conversation id (for escalation / linking), if provided. */
  externalConversationId?: string | null;
}

export interface ToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  requiresAuth: boolean;
  handler: (input: TInput, ctx: ToolContext) => Promise<unknown>;
}

// Input-type-erased tool for the heterogeneous registry/dispatcher.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTool = ToolDefinition<any>;

function defineTool<T>(def: ToolDefinition<T>): ToolDefinition<T> {
  return def;
}

// ── Serialization helpers (model-friendly, no Prisma Decimals) ──────────────

function serializeProductSummary(p: Awaited<ReturnType<typeof svcSearchProducts>>[number]) {
  return {
    id: p.id,
    name: p.name,
    category: p.category.name,
    price: Number(p.price),
    inStock: totalInventory(p.variants) > 0,
    // Ratings so the agent can answer "which is best rated / most reviewed".
    avgRating: Number(p.avgRating.toFixed(2)),
    reviewCount: p.reviewCount,
  };
}

function serializeProductDetail(
  p: NonNullable<Awaited<ReturnType<typeof svcGetProduct>>>,
) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category.name,
    price: Number(p.price),
    avgRating: Number(p.avgRating.toFixed(2)),
    reviewCount: p.reviewCount,
    highlights: p.highlights ?? [],
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      price: Number(p.price) + Number(v.priceDelta),
      inStock: v.inventory > 0,
      inventory: v.inventory,
    })),
    // A few top reviews so the agent can quote real customer feedback.
    reviews: (p.reviews ?? []).slice(0, 4).map((r) => ({
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: r.author,
    })),
  };
}

function serializeOrder(
  o: Awaited<ReturnType<typeof listOrders>>[number],
) {
  return {
    id: o.id,
    reference: o.id.slice(-8).toUpperCase(),
    status: o.status,
    total: Number(o.total),
    trackingNumber: o.trackingNumber,
    estimatedDelivery: o.estimatedDelivery?.toISOString().slice(0, 10) ?? null,
    placedAt: o.createdAt.toISOString().slice(0, 10),
    items: o.items.map((i) => ({
      itemId: i.id, // needed for return eligibility / requests
      product: i.product.name,
      variant: i.variant?.name ?? null,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
  };
}

// ── Tools ───────────────────────────────────────────────────────────────────

const searchProducts = defineTool({
  name: "searchProducts",
  description:
    "Search the ShopAI catalog for product discovery when a customer describes what they want. " +
    "Supports a free-text query (matches product name AND description, e.g. 'security camera'), " +
    "a category name, a maximum price, and a sort order. Category is matched loosely — a term " +
    "that isn't an exact category is also searched as text — so 'security cameras' still finds a " +
    "security camera filed under Smart Home. Prefer a descriptive `query` over guessing a category. " +
    "Results include avgRating and reviewCount so you can answer 'best rated' / 'most reviewed'.",
  requiresAuth: false,
  schema: z.object({
    query: z
      .string()
      .optional()
      .describe("Free-text search over product name and description, e.g. 'wireless earbuds' or 'security camera'"),
    category: z
      .string()
      .optional()
      .describe("Category name (Audio, Wearables, Smart Home, Computing, Gaming, Cameras, Accessories). Matched loosely."),
    maxPrice: z.number().positive().optional().describe("Maximum price in USD"),
    sort: z
      .enum(["relevance", "top_rated", "price_asc", "price_desc"])
      .optional()
      .describe("Sort order. Use 'top_rated' for 'best reviews/ratings' questions."),
  }),
  async handler(input) {
    // Resolve the requested category loosely against the real taxonomy. If it
    // matches a real category, filter by it; if it does NOT (e.g. "security
    // cameras"), fold the term into the text query so we still find matches.
    let categoryId: string | undefined;
    let effectiveQuery = input.query;
    if (input.category) {
      const categories = await svcListCategories();
      const needle = input.category.toLowerCase().trim();
      const match =
        categories.find((c) => c.name.toLowerCase() === needle) ??
        categories.find(
          (c) =>
            c.name.toLowerCase().includes(needle) || needle.includes(c.name.toLowerCase()),
        );
      if (match) {
        categoryId = match.id;
      } else {
        // Not a real category — treat it as extra search text.
        effectiveQuery = [effectiveQuery, input.category].filter(Boolean).join(" ");
      }
    }

    const sortMap = {
      top_rated: "featured", // re-sorted below by rating
      price_asc: "price_asc",
      price_desc: "price_desc",
      relevance: "featured",
    } as const;

    let products = await svcSearchProducts({
      query: effectiveQuery,
      categoryId,
      maxPrice: input.maxPrice,
      sort: input.sort ? sortMap[input.sort] : "featured",
    });

    // If a category + query combo returned nothing, retry with just the query
    // so an over-specific search still surfaces relevant products.
    if (products.length === 0 && categoryId && effectiveQuery) {
      products = await svcSearchProducts({ query: effectiveQuery, maxPrice: input.maxPrice });
    }

    if (input.sort === "top_rated") {
      products = [...products].sort(
        (a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount,
      );
    }

    return {
      count: products.length,
      products: products.map(serializeProductSummary),
    };
  },
});

const listCategories = defineTool({
  name: "listCategories",
  description:
    "List the product categories in the catalog. Use this when unsure which category a customer's " +
    "request maps to, before filtering searchProducts by category.",
  requiresAuth: false,
  schema: z.object({}),
  async handler() {
    const categories = await svcListCategories();
    return {
      categories: categories.map((c) => ({ name: c.name, description: c.description })),
    };
  },
});

const getProduct = defineTool({
  name: "getProduct",
  description:
    "Get full details for a single product by id, including variants, price and stock. Use to answer specific product questions.",
  requiresAuth: false,
  schema: z.object({
    productId: z.string().describe("The product id"),
  }),
  async handler(input) {
    const product = await svcGetProduct(input.productId);
    if (!product) return { found: false };
    return { found: true, product: serializeProductDetail(product) };
  },
});

const getOrders = defineTool({
  name: "getOrders",
  description:
    "List the authenticated customer's recent orders. The customer is identified from the session — never ask for or accept a customer id.",
  requiresAuth: true,
  schema: z.object({}),
  async handler(_input, ctx) {
    const orders = await listOrders(ctx.customerId!);
    return { count: orders.length, orders: orders.map(serializeOrder) };
  },
});

const getOrder = defineTool({
  name: "getOrder",
  description:
    "Get one of the authenticated customer's orders by id. Returns null if the order does not belong to them.",
  requiresAuth: true,
  schema: z.object({
    orderId: z.string().describe("The order id"),
  }),
  async handler(input, ctx) {
    const order = await getOrder_impl(input.orderId, ctx.customerId!);
    if (!order) return { found: false };
    return { found: true, order: serializeOrder(order) };
  },
});

const getOrderStatus = defineTool({
  name: "getOrderStatus",
  description:
    "Get just the shipping status and tracking details for one of the authenticated customer's orders.",
  requiresAuth: true,
  schema: z.object({
    orderId: z.string().describe("The order id"),
  }),
  async handler(input, ctx) {
    const order = await getOrder_impl(input.orderId, ctx.customerId!);
    if (!order) return { found: false };
    return {
      found: true,
      status: order.status,
      trackingNumber: order.trackingNumber,
      estimatedDelivery:
        order.estimatedDelivery?.toISOString().slice(0, 10) ?? null,
    };
  },
});

async function getOrder_impl(orderId: string, customerId: string) {
  return svcGetOrder(orderId, customerId);
}

// ── Cart tools ────────────────────────────────────────────────────────────

const getCart = defineTool({
  name: "getCart",
  description:
    "Get the authenticated customer's current cart contents, including each line's cartItemId (needed to remove items) and the subtotal.",
  requiresAuth: true,
  schema: z.object({}),
  async handler(_input, ctx) {
    const summary = await getCartSummary(ctx.customerId!);
    return {
      itemCount: summary.itemCount,
      subtotal: summary.subtotal,
      items: summary.items.map(({ item, unitPrice, lineTotal }) => ({
        cartItemId: item.id,
        product: item.product.name,
        variant: item.variant?.name ?? null,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      })),
    };
  },
});

const addToCart = defineTool({
  name: "addToCart",
  description:
    "Add a product to the authenticated customer's cart. Provide variantId when the product has multiple variants (call getProduct first to get variant ids). Validates stock.",
  requiresAuth: true,
  schema: z.object({
    productId: z.string().describe("The product id"),
    variantId: z.string().optional().describe("The chosen variant id, if any"),
    quantity: z.number().int().positive().default(1),
  }),
  async handler(input, ctx) {
    return svcAddToCart(
      ctx.customerId!,
      input.productId,
      input.variantId ?? null,
      input.quantity,
    );
  },
});

const removeFromCart = defineTool({
  name: "removeFromCart",
  description:
    "Remove a line item from the cart by its cartItemId (get it from getCart).",
  requiresAuth: true,
  schema: z.object({
    cartItemId: z.string().describe("The cart item id from getCart"),
  }),
  async handler(input, ctx) {
    return svcRemoveCartItem(ctx.customerId!, input.cartItemId);
  },
});

// ── Order actions ─────────────────────────────────────────────────────────

const cancelOrder = defineTool({
  name: "cancelOrder",
  description:
    "Cancel one of the authenticated customer's orders. Only works before shipping; shipped/delivered orders are refused by policy. Confirm with the customer before calling.",
  requiresAuth: true,
  schema: z.object({
    orderId: z.string().describe("The order id"),
  }),
  async handler(input, ctx) {
    return svcCancelOrder(input.orderId, ctx.customerId!);
  },
});

// ── Returns / refunds ─────────────────────────────────────────────────────

const checkReturnEligibility = defineTool({
  name: "checkReturnEligibility",
  description:
    "Check whether a specific item on one of the customer's orders can be returned, per policy. Call this before creating a return.",
  requiresAuth: true,
  schema: z.object({
    orderId: z.string().describe("The order id"),
    itemId: z.string().describe("The order item id (from getOrder)"),
  }),
  async handler(input, ctx) {
    return svcCheckReturnEligibility(input.orderId, input.itemId, ctx.customerId!);
  },
});

const requestReturnOrRefund = defineTool({
  name: "requestReturnOrRefund",
  description:
    "Create a return or refund request for an eligible order item. Confirm the reason with the customer first. Returns a reference number.",
  requiresAuth: true,
  schema: z.object({
    orderId: z.string().describe("The order id"),
    itemId: z.string().describe("The order item id"),
    reason: z.string().describe("Why the customer is returning the item"),
    type: z
      .enum(["RETURN", "REFUND"])
      .default("RETURN")
      .describe("RETURN to send the item back, REFUND for money back"),
  }),
  async handler(input, ctx) {
    return svcRequestReturnOrRefund(
      input.orderId,
      input.itemId,
      input.reason,
      input.type as ReturnTypeEnum,
      ctx.customerId!,
    );
  },
});

// ── Support tickets / escalation ──────────────────────────────────────────

const createSupportTicket = defineTool({
  name: "createSupportTicket",
  description:
    "Create a support ticket for a follow-up or an issue you cannot resolve directly.",
  requiresAuth: true,
  schema: z.object({
    category: z.string().describe("e.g. billing, shipping, product, other"),
    summary: z.string().describe("Concise summary of the issue"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    orderId: z.string().optional().describe("Related order id, if any"),
  }),
  async handler(input, ctx) {
    return svcCreateSupportTicket(ctx.customerId!, {
      category: input.category,
      summary: input.summary,
      priority: input.priority as TicketPriority,
      orderId: input.orderId ?? null,
    });
  },
});

const transferToHuman = defineTool({
  name: "transferToHuman",
  description:
    "Escalate to a human agent when the customer asks for a person or the issue needs human judgment. Provide a short summary of the conversation so far.",
  requiresAuth: true,
  schema: z.object({
    reason: z.string().describe("Why escalation is needed"),
    summary: z.string().optional().describe("Summary of the conversation/context"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("HIGH"),
  }),
  async handler(input, ctx) {
    return svcTransferToHuman(
      ctx.customerId!,
      {
        reason: input.reason,
        summary: input.summary,
        priority: input.priority as TicketPriority,
      },
      ctx.externalConversationId,
    );
  },
});

// ── Consultation booking ──────────────────────────────────────────────────

const checkAvailability = defineTool({
  name: "checkAvailability",
  description:
    "Find open expert-consultation slots. Optionally filter by service name or an ISO date range.",
  requiresAuth: false,
  schema: z.object({
    service: z.string().optional(),
    from: z.string().optional().describe("ISO date/time lower bound"),
    to: z.string().optional().describe("ISO date/time upper bound"),
  }),
  async handler(input) {
    return svcCheckAvailability(input);
  },
});

const bookConsultation = defineTool({
  name: "bookConsultation",
  description:
    "Book an open consultation slot for the authenticated customer. Use a slotId from checkAvailability.",
  requiresAuth: true,
  schema: z.object({
    slotId: z.string().describe("The slot id from checkAvailability"),
  }),
  async handler(input, ctx) {
    return svcBookConsultation(ctx.customerId!, input.slotId);
  },
});

const sendConfirmation = defineTool({
  name: "sendConfirmation",
  description:
    "Send/record a confirmation for a booked appointment (by appointmentId).",
  requiresAuth: true,
  schema: z.object({
    eventId: z.string().describe("The appointmentId returned by bookConsultation"),
  }),
  async handler(input, ctx) {
    return svcSendConfirmation(ctx.customerId!, input.eventId);
  },
});

export const TOOLS: Record<string, AnyTool> = {
  [searchProducts.name]: searchProducts,
  [listCategories.name]: listCategories,
  [getProduct.name]: getProduct,
  [getOrders.name]: getOrders,
  [getOrder.name]: getOrder,
  [getOrderStatus.name]: getOrderStatus,
  [getCart.name]: getCart,
  [addToCart.name]: addToCart,
  [removeFromCart.name]: removeFromCart,
  [cancelOrder.name]: cancelOrder,
  [checkReturnEligibility.name]: checkReturnEligibility,
  [requestReturnOrRefund.name]: requestReturnOrRefund,
  [createSupportTicket.name]: createSupportTicket,
  [transferToHuman.name]: transferToHuman,
  [checkAvailability.name]: checkAvailability,
  [bookConsultation.name]: bookConsultation,
  [sendConfirmation.name]: sendConfirmation,
};

export function getTool(name: string): AnyTool | undefined {
  return TOOLS[name];
}

/** JSON Schema for a tool's parameters — used to register the tool in ElevenLabs. */
export function toolJsonSchema(name: string) {
  const tool = TOOLS[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return z.toJSONSchema(tool.schema);
}

/** All tool specs for the ElevenLabs agent setup script. */
export function allToolSpecs() {
  return Object.values(TOOLS).map((t) => ({
    name: t.name,
    description: t.description,
    requiresAuth: t.requiresAuth,
    parameters: z.toJSONSchema(t.schema),
  }));
}
