import { normalize, normalizeId } from "./matching";
import type { Card } from "./types";
export function familyCards(cards: Card[], card: Card): Card[] {
  return cards.filter(
    (c) =>
      c.kind === card.kind &&
      (c.standard_id && card.standard_id
        ? c.standard_id === card.standard_id
        : c.name_cn === card.name_cn),
  );
}
export function versionLabel(card: Card) {
  return `${card.expansion || card.category_en || "Unclassified"} · ${card.faction || "Playing card"}`;
}
export type VersionEvidence = {
  card: Card;
  score: number;
  evidence: string[];
  phraseHits: number;
  nameHit: boolean;
};
export function rankVersions(cards: Card[], text: string): VersionEvidence[] {
  const query = normalize(text),
    ids = text.split(/[\s，。；,;()（）]+/).map(normalizeId);
  const descriptions = cards.map((c) =>
    normalize(
      c.skills
        .filter((s) => !s.translation_missing)
        .map((s) => s.description_cn)
        .join(" ") + (c.effect_cn || []).join(" "),
    ),
  );
  const names = cards.map((c) => normalize(c.name_cn));
  const foundNames = names.filter((n) => n && query.includes(n));
  return cards
    .map((card, index) => {
      const evidence: string[] = [];
      const name = names[index];
      const nameHit =
        foundNames.includes(name) &&
        names.filter((n) => n === name).length === 1 &&
        !foundNames.some((n) => n !== name && n.includes(name));
      if (nameHit) evidence.push(`Distinct name: ${card.name_cn}`);
      const body = descriptions[index];
      let phraseHits = 0,
        lastQueryEnd = -1;
      // Unique, non-overlapping eight-character phrases distinguish revisions that
      // have the same name AND skill titles. Repeated OCR passes do not add votes.
      for (let offset = 0; offset <= body.length - 8; offset++) {
        const phrase = body.slice(offset, offset + 8),
          at = query.indexOf(phrase);
        if (
          at < 0 ||
          at < lastQueryEnd ||
          descriptions.some((d, i) => i !== index && d.includes(phrase))
        )
          continue;
        phraseHits++;
        lastQueryEnd = at + 8;
        offset += 7;
        if (evidence.length < 4) evidence.push(`Skill wording: ${phrase}`);
      }
      const idHit = ids.includes(normalizeId(card.printed_id));
      // Catalog prefixes are not proven physical-print identifiers. An ID can rank
      // a suggestion, but cannot by itself confirm a rules version.
      if (idHit) evidence.push(`Catalog ID: ${card.printed_id}`);
      const score =
        (nameHit ? 35 : 0) + Math.min(60, phraseHits * 20) + (idHit ? 5 : 0);
      return { card, score, evidence, phraseHits, nameHit };
    })
    .sort((a, b) => b.score - a.score);
}
export function suggestedVersion(ranked: VersionEvidence[]) {
  const first = ranked[0];
  return first &&
    first.phraseHits >= 2 &&
    first.score - (ranked[1]?.score || 0) >= 25
    ? first
    : undefined;
}
export function sourceFamily(card: Card) {
  return (card.standard_id || "").replace(/^char_/, "").replaceAll("_", "");
}
