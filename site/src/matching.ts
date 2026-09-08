import traditional from "./traditional.json";
import type { Card, Candidate } from "./types";
const trad = traditional as Record<string, string>;
export function normalize(value: string) {
  return [...value.normalize("NFKC").toLowerCase()]
    .map((c) => trad[c] || c)
    .join("")
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function normalizeId(value: string) {
  return value
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(
      /(WEI|SHU|WU|QUN|LE|GOD)([0-9OILZSB]{2,3})(?=SKIN|BETA|$)/g,
      (_, f: string, n: string) =>
        f +
        n.replace(
          /[OILZSB]/g,
          (c) => ({ O: "0", I: "1", L: "1", Z: "2", S: "5", B: "8" })[c]!,
        ),
    );
}
export function editDistance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(
        next[j - 1] + 1,
        row[j] + 1,
        row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    row = next;
  }
  return row[b.length];
}
export function searchCards(cards: Card[], query: string) {
  const q = normalize(query);
  if (!q) return cards;
  return cards
    .map((card) => {
      const names = [
        card.name_cn,
        card.name_en,
        card.printed_id,
        ...(card.aliases || []),
      ].map(normalize);
      const all = [
        ...names,
        ...card.skills.flatMap((s) => [
          normalize(s.name_en),
          normalize(s.name_cn),
        ]),
      ];
      let score = names.some((n) => n === q)
        ? 10
        : all.some((n) => n.includes(q))
          ? 7
          : 0;
      if (
        !score &&
        q.length >= 4 &&
        names.some(
          (n) => editDistance(n, q) <= Math.max(1, Math.floor(q.length / 6)),
        )
      )
        score = 3;
      return { card, score };
    })
    .filter((x) => x.score)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.card);
}
export function matchText(cards: Card[], text: string): Candidate[] {
  // Join vertically segmented glyphs before matching, while keeping full lines for IDs.
  const joined = normalize(text);
  const ids = text.split(/\n/).map(normalizeId);
  ids.push(normalizeId(text));
  return cards
    .map((card) => {
      const name = normalize(card.name_cn),
        en = normalize(card.name_en);
      const id = normalizeId(card.printed_id);
      const idMatch =
        id.length >= 5 &&
        ids.some(
          (t) =>
            t === id || new RegExp(`(?:^|[^A-Z])${id}(?![A-Z0-9])`).test(t),
        );
      // A one-character playing-card name in a skill description is not identification.
      const nameMatch =
        name.length >= 2 ? joined.includes(name) : joined === name;
      const enMatch = en.length >= 4 && joined.includes(en);
      const skillCount = card.skills.filter(
        (s) =>
          normalize(s.name_cn).length >= 2 &&
          joined.includes(normalize(s.name_cn)),
      ).length;
      const score = idMatch
        ? 0.98
        : nameMatch || enMatch
          ? Math.min(0.92, 0.72 + skillCount * 0.08)
          : skillCount >= 2
            ? 0.64
            : skillCount === 1
              ? 0.4
              : 0;
      return { id: card.id, score, method: "text" as const };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
