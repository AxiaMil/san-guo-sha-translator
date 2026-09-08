import manifest from "../../assets/data/decks/dark-gold-e-2026.json";
import { normalize } from "./matching";
import type { Card } from "./types";
export const darkGoldDeck = manifest;
export type DeckGroup = (typeof manifest.groups)[number];
export type DeckEntry = DeckGroup["entries"][number];
export type DeckChoices = Record<string, string>;
function baseName(name: string) {
  return normalize(name)
    .replace(/^(?:(?:OL|SP)|[界星神])+/i, "")
    .replaceAll("&", "");
}
export function deckCandidates(
  cards: Card[],
  group: DeckGroup,
  entry: DeckEntry,
) {
  const name = baseName(entry.search_name_cn);
  return cards
    .filter((card) => {
      if (card.kind !== "general" || baseName(card.name_cn) !== name)
        return false;
      if (group.id === "gods") return card.faction === "God";
      if (card.faction === "God") return false;
      if (group.id === "stars") return card.expansion === "Star collection";
      if (card.expansion === "Star collection") return false;
      if (["limit-break", "myth-break", "ol-fame"].includes(group.id)) {
        // A same-name Standard/Mobile card is not a substitute for a missing revision.
        return (
          card.expansion === "Limit Break" || card.name_cn.startsWith("界")
        );
      }
      return true;
    })
    .sort(
      (a, b) =>
        Number(b.id === ("reference_id" in entry ? entry.reference_id : "")) -
          Number(
            a.id === ("reference_id" in entry ? entry.reference_id : ""),
          ) || a.id.localeCompare(b.id),
    );
}
export function validDeckChoices(cards: Card[], input: unknown): DeckChoices {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const choices: DeckChoices = {};
  for (const group of darkGoldDeck.groups)
    for (const entry of group.entries) {
      const selected = (input as DeckChoices)[entry.id];
      if (deckCandidates(cards, group, entry).some((c) => c.id === selected))
        choices[entry.id] = selected;
    }
  return choices;
}
export function deckSearch(
  cards: Card[],
  group: DeckGroup,
  entry: DeckEntry,
  query: string,
  candidates = deckCandidates(cards, group, entry),
) {
  const text = [
    entry.name_cn,
    entry.search_name_cn,
    group.name_cn,
    group.name_en,
    ...candidates.flatMap((c) => [
      c.name_en,
      c.printed_id,
      ...c.skills.flatMap((s) => [s.name_cn, s.name_en]),
    ]),
  ].join(" ");
  return normalize(text).includes(normalize(query));
}
