import { ArrowRight, Check, Layers } from "lucide-react";
import type { Card } from "./types";
import { familyCards, versionLabel } from "./versions";
import VersionSources from "./VersionSources";
import CardArt from "./CardArt";
export default function VersionCompare({
  card,
  cards,
  onOpen,
}: {
  card: Card;
  cards: Card[];
  onOpen: (card: Card) => void;
}) {
  const versions = familyCards(cards, card);
  return (
    <details className="version-compare">
      <summary>
        <Layers size={17} />
        <span>
          Compare {versions.length} available{" "}
          {versions.length === 1 ? "version" : "versions"}
        </span>
      </summary>
      <div className="version-explanation">
        Compare the printed name and skill wording. The same illustration or
        card number can appear in more than one release. These groups identify
        rules variants, not every print year.
      </div>
      <div className="version-list">
        {versions.map((v) => (
          <button
            className={v.id === card.id ? "current-version" : ""}
            key={v.id}
            onClick={() => onOpen(v)}
          >
            <CardArt card={v} />
            <span>
              <strong>
                {v.name_cn} <small>{versionLabel(v)}</small>
              </strong>
              <span className="version-skill-names">
                {v.skills.map((s) => s.name_en).join(" · ") ||
                  "Playing card effect"}
              </span>
              <span className="version-preview" lang="zh">
                {v.skills[0]?.description_cn ||
                  v.effect_cn?.[0] ||
                  "Source text unavailable"}
              </span>
            </span>
            {v.id === card.id ? <Check size={17} /> : <ArrowRight size={17} />}
          </button>
        ))}
      </div>
      <VersionSources card={card} />
    </details>
  );
}
