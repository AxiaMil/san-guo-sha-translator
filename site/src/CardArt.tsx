import type { Card } from "./types";
export default function CardArt({ card }: { card: Card }) {
  return card.image ? (
    <img src={card.image} alt={`${card.name_en} card artwork`} loading="lazy" />
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
