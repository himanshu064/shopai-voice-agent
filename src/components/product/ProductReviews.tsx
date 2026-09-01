import { ThumbsUp, BadgeCheck } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RatingStars } from "@/components/product/RatingStars";

export interface ReviewItem {
  id: string;
  author: string;
  location: string | null;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
  helpful: number;
  createdAt: Date | string;
}

/** Estimate a 5→1 star distribution from the average and total count. */
function distribution(avg: number, total: number): number[] {
  const sigma = 0.7;
  const weights = [5, 4, 3, 2, 1].map((s) =>
    Math.exp(-((s - avg) ** 2) / (2 * sigma * sigma)),
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round((w / sum) * total));
}

function compact(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

export function ProductReviews({
  avgRating,
  reviewCount,
  reviews,
}: {
  avgRating: number;
  reviewCount: number;
  reviews: ReviewItem[];
}) {
  const counts = distribution(avgRating, reviewCount);

  return (
    <section>
      <h2 className="text-2xl font-semibold">Ratings &amp; reviews</h2>

      <div className="mt-6 grid gap-8 sm:grid-cols-[220px_1fr]">
        {/* Summary */}
        <div className="flex flex-col items-center justify-center rounded-xl border p-6 text-center">
          <div className="text-5xl font-bold">{avgRating.toFixed(1)}</div>
          <RatingStars rating={avgRating} className="mt-2" starClassName="size-5" />
          <p className="mt-2 text-sm text-muted-foreground">
            {compact(reviewCount)} ratings
          </p>
        </div>

        {/* Breakdown bars */}
        <div className="flex flex-col justify-center gap-2">
          {[5, 4, 3, 2, 1].map((star, i) => {
            const c = counts[i];
            const pct = reviewCount ? (c / reviewCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="flex w-8 items-center gap-1 text-muted-foreground">
                  {star}★
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      star >= 4
                        ? "h-full rounded-full bg-emerald-500"
                        : star === 3
                          ? "h-full rounded-full bg-amber-500"
                          : "h-full rounded-full bg-rose-400"
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 text-right tabular-nums text-muted-foreground">
                  {compact(c)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review list */}
      <div className="mt-8 space-y-6">
        {reviews.map((r) => (
          <div key={r.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1 border-transparent bg-emerald-600 text-white">
                {r.rating}★
              </Badge>
              <span className="font-medium">{r.title}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{r.body}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">{r.author}</span>
              {r.location && <span>{r.location}</span>}
              {r.verified && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <BadgeCheck className="size-3.5" />
                  Verified Purchase
                </span>
              )}
              <span>· {formatDate(r.createdAt)}</span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="size-3.5" />
                {compact(r.helpful)}
              </span>
            </div>
            <Separator className="mt-6" />
          </div>
        ))}
      </div>
    </section>
  );
}
