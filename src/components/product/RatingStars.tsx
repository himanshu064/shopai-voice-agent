import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

/** Row of 5 stars reflecting a 0–5 rating (supports halves). */
export function RatingStars({
  rating,
  className,
  starClassName = "size-4",
}: {
  rating: number;
  className?: string;
  starClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5 text-amber-400", className)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const value = i + 1;
        if (rating >= value) {
          return <Star key={i} className={cn(starClassName, "fill-current")} />;
        }
        if (rating >= value - 0.5) {
          return <StarHalf key={i} className={cn(starClassName, "fill-current")} />;
        }
        return <Star key={i} className={cn(starClassName, "text-muted-foreground/30")} />;
      })}
    </div>
  );
}
