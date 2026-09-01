const CATEGORY_EMOJI: Record<string, string> = {
  Audio: "🎧",
  Wearables: "⌚",
  "Smart Home": "💡",
  Computing: "⌨️",
  Gaming: "🎮",
  Cameras: "📷",
  Accessories: "🔌",
};

export function emojiForCategory(categoryName?: string): string {
  return (categoryName && CATEGORY_EMOJI[categoryName]) || "📦";
}

export default function ProductImage({
  categoryName,
  size = "text-6xl",
  className = "",
}: {
  categoryName?: string;
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-muted ${size} ${className}`}
    >
      <span role="img" aria-label={categoryName ?? "product"}>
        {emojiForCategory(categoryName)}
      </span>
    </div>
  );
}
