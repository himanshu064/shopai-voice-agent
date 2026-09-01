/**
 * Add a small set of products to the EXISTING database without a full reseed
 * (so orders, conversations, knowledge docs, etc. are preserved).
 *
 *   npm run add:products
 *
 * Idempotent: a product whose first variant SKU already exists is skipped, so
 * re-running is safe. These same products also live in prisma/seed.ts, so a
 * future `db:seed` recreates them too.
 */
import { prisma } from "../src/lib/db";

interface NewProduct {
  categoryName: string;
  name: string;
  description: string;
  price: number;
  avgRating: number;
  reviewCount: number;
  highlights: string[];
  specs: { group: string; rows: string[][] }[];
  variants: { name: string; sku: string; inventory: number; priceDelta?: number }[];
}

const REVIEW_POOL = [
  { rating: 5, title: "Excellent", body: "Superb quality and exactly as described. Setup took minutes.", author: "Rahul S.", location: "Austin" },
  { rating: 5, title: "Highly recommend", body: "Been using it daily for weeks with zero issues. Great value.", author: "Priya M.", location: "Seattle" },
  { rating: 4, title: "Really good", body: "Solid overall — a couple of tiny niggles but nothing major.", author: "James T.", location: "London" },
  { rating: 4, title: "Happy with it", body: "Feels premium and performs as advertised. Would buy again.", author: "Aisha K.", location: "Toronto" },
];

const PRODUCTS: NewProduct[] = [
  {
    categoryName: "Audio",
    name: "SoundWave Soundbar 2.1 Home Theatre",
    description:
      "2.1-channel soundbar with a wireless subwoofer, Dolby Audio and Bluetooth for immersive movie nights.",
    price: 179,
    avgRating: 4.6,
    reviewCount: 842,
    highlights: [
      "Wireless subwoofer for deep bass",
      "Dolby Audio surround",
      "Bluetooth 5.3 & HDMI ARC",
      "Slim design fits under any TV",
    ],
    specs: [
      {
        group: "General",
        rows: [
          ["Brand", "SoundWave"],
          ["Model", "SoundWave Soundbar 2.1 Home Theatre"],
          ["Category", "Audio"],
          ["In the box", "Soundbar, wireless subwoofer, remote, HDMI cable, power cables"],
        ],
      },
      {
        group: "Sound & Connectivity",
        rows: [
          ["Channels", "2.1 (bar + subwoofer)"],
          ["Connectivity", "HDMI ARC, Optical, Bluetooth 5.3"],
          ["Audio", "Dolby Audio"],
          ["Subwoofer", "Wireless"],
        ],
      },
      {
        group: "Warranty",
        rows: [
          ["Warranty", "1 year manufacturer warranty"],
          ["Warranty type", "Carry-in"],
          ["Covered", "Manufacturing defects"],
        ],
      },
    ],
    variants: [{ name: "Black", sku: "SW-BAR-21-BLK", inventory: 20 }],
  },
  {
    categoryName: "Computing",
    name: 'ClearView 34" Ultrawide Monitor',
    description:
      "34-inch WQHD ultrawide curved monitor with a 144Hz refresh rate, USB-C dock and 99% sRGB colour.",
    price: 449,
    avgRating: 4.7,
    reviewCount: 613,
    highlights: [
      "34\" curved WQHD ultrawide",
      "144Hz smooth refresh rate",
      "USB-C dock with power delivery",
      "99% sRGB colour accuracy",
    ],
    specs: [
      {
        group: "General",
        rows: [
          ["Brand", "ClearView"],
          ["Model", 'ClearView 34" Ultrawide Monitor'],
          ["Category", "Computing"],
          ["In the box", "Monitor, stand, USB-C cable, HDMI cable, power cable"],
        ],
      },
      {
        group: "Display",
        rows: [
          ["Panel size", "34-inch curved"],
          ["Resolution", "WQHD 3440 x 1440"],
          ["Refresh rate", "144Hz"],
          ["Colour", "99% sRGB"],
          ["Connectivity", "USB-C (PD), HDMI, DisplayPort"],
        ],
      },
      {
        group: "Warranty",
        rows: [
          ["Warranty", "2 year manufacturer warranty"],
          ["Warranty type", "Carry-in"],
          ["Covered", "Manufacturing defects"],
        ],
      },
    ],
    variants: [{ name: "Black", sku: "CLEARVIEW-34-UW", inventory: 8 }],
  },
];

async function main() {
  let added = 0;
  for (const p of PRODUCTS) {
    const firstSku = p.variants[0].sku;
    const existing = await prisma.productVariant.findUnique({ where: { sku: firstSku } });
    if (existing) {
      console.log(`  • skip "${p.name}" — SKU ${firstSku} already exists`);
      continue;
    }

    const category = await prisma.category.findFirst({ where: { name: p.categoryName } });
    if (!category) {
      console.warn(`  ⚠️  category "${p.categoryName}" not found — skipping "${p.name}"`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        name: p.name,
        description: p.description,
        price: p.price,
        categoryId: category.id,
        highlights: p.highlights,
        specs: p.specs,
        avgRating: p.avgRating,
        reviewCount: p.reviewCount,
        variants: {
          create: p.variants.map((v) => ({
            name: v.name,
            sku: v.sku,
            inventory: v.inventory,
            priceDelta: v.priceDelta ?? 0,
          })),
        },
        reviews: {
          create: REVIEW_POOL.map((r, i) => ({
            author: r.author,
            location: r.location,
            rating: r.rating,
            title: r.title,
            body: r.body,
            verified: true,
            helpful: 20 + i * 11,
          })),
        },
      },
    });
    console.log(`  ✓ added "${product.name}" (${p.categoryName})`);
    added++;
  }
  console.log(`\n✅ Done — ${added} product(s) added.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ add:products failed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exitCode = 1;
});
