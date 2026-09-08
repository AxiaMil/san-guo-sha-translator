import type { Card } from "./types";
export default function CardArt({
  card,
  large = false,
}: {
  card: Card;
  large?: boolean;
}) {
  return card.image ? (
    <img
      src={(large ? card.preview : card.thumbnail) || card.image}
      alt={`${card.name_en} card artwork`}
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span
      className="card-art-placeholder"
      role="img"
      aria-label={`Text reference for ${card.name_en}; artwork not available`}
    >
      <span lang="zh">{card.name_cn}</span>
      <small>TEXT REFERENCE</small>
    </span>
  );
}
