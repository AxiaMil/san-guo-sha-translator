import manifest from "../../assets/data/decks/dark-gold-e-2026.json";
import shenmoManifest from "../../assets/data/decks/shenmo-e-2026.json";
import { normalize } from "./matching";
import type { Card } from "./types";
export interface DeckEntry {
  id: string;
  name_cn: string;
  search_name_cn: string;
  reference_id?: string;
  candidate_ids?: string[];
}
export interface DeckGroup {
  id: string;
  name_cn: string;
  name_en: string;
  count: number;
  entries: DeckEntry[];
}
export interface Deck {
  id: string;
  name_cn: string;
  name_en: string;
  short_name?: string;
  year: number;
  series: string;
  counts: {
    generals: number;
    game_cards: number;
    accessories: number;
    foil?: number;
  };
  source: {
    title: string;
    url: string;
    roster_url: string;
    roster_urls?: string[];
    mode_url?: string;
    published: string;
    checked: string;
  };
  groups: DeckGroup[];
}
export const darkGoldDeck: Deck = manifest;
export const shenmoDeck: Deck = shenmoManifest;
export const decks = [darkGoldDeck, shenmoDeck];
export const findDeck = (id: string | null) =>
  decks.find((deck) => deck.id === id);
export const deckChoicesKey = (deck: Deck) =>
  deck.id === darkGoldDeck.id
    ? "sha-dark-gold-choices"
    : `sha-deck-choices-${deck.id}`;
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
  // Explicit editions never fall back to a same-name card from another set.
  if (entry.candidate_ids)
    return entry.candidate_ids.flatMap((id) => {
      const card = cards.find((c) => c.id === id);
      return card ? [card] : [];
    });
  const name = baseName(entry.search_name_cn);
  return cards
    .filter((card) => {
      if (card.id.startsWith("SM_")) return false;
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

export function deckCardIds(cards: Card[], deck?: Deck): Set<string> {
  return new Set(
    deck?.groups.flatMap((group) =>
      group.entries.flatMap((entry) =>
        deckCandidates(cards, group, entry).map((c) => c.id),
      ),
    ) || [],
  );
}
export function validDeckChoices(
  cards: Card[],
  input: unknown,
  deck: Deck = darkGoldDeck,
): DeckChoices {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const choices: DeckChoices = {};
  for (const group of deck.groups)
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
