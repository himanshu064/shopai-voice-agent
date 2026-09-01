import { CheckCircle2 } from "lucide-react";

/** Product highlights as an icon bullet list. */
export function ProductHighlights({ highlights }: { highlights: string[] }) {
  if (!highlights.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No highlights available for this product.
      </p>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {highlights.map((h, i) => (
        <li key={i} className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
          <span className="text-sm">{h}</span>
        </li>
      ))}
    </ul>
  );
}
