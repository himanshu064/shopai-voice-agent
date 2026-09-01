import { cn } from "@/lib/utils";

export interface SpecGroup {
  group: string;
  rows: string[][];
}

/** Grouped specification tables. */
export function ProductSpecs({ specs }: { specs: SpecGroup[] }) {
  if (!specs?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No specifications available for this product.
      </p>
    );
  }
  return (
    <div className="space-y-8">
      {specs.map((group) => (
        <div key={group.group}>
          <h3 className="mb-3 text-base font-semibold">{group.group}</h3>
          <dl className="overflow-hidden rounded-lg border">
            {group.rows.map(([label, value], i) => (
              <div
                key={label}
                className={cn(
                  "grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-[220px_1fr]",
                  i % 2 === 1 && "bg-muted/40",
                )}
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
